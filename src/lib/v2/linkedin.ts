import "server-only";
import { normaliseLinkedInUrl } from "./definitions";

// Pulls public LinkedIn data through two no-cookie Apify actors (the same
// ones the War Room uses): profile details and recent posts. Never the
// browser, never an account login, never email lookups.

const PROFILE_ACTOR = "harvestapi~linkedin-profile-scraper";
const POSTS_ACTOR = "harvestapi~linkedin-profile-posts";

export type ProfileRole = "client" | "ideal_client" | "similar_seller";

export interface PulledPost {
  date: string | null;
  text: string;
  likes: number | null;
  comments: number | null;
}

export interface PulledProfile {
  url: string;
  role: ProfileRole;
  note: string;
  found: boolean;
  name: string | null;
  headline: string | null;
  about: string | null;
  location: string | null;
  experience: { position: string | null; company: string | null; start: string | null; end: string | null; description: string | null }[];
  posts: PulledPost[];
}

export interface LinkedInReport {
  status: "ok" | "partial" | "failed" | "skipped";
  detail: string;
  pulled_at: string;
  profiles: PulledProfile[];
}

interface Target {
  url: string;
  role: ProfileRole;
  note: string;
}

const clip = (s: unknown, n: number): string | null => {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t ? (t.length > n ? `${t.slice(0, n)}…` : t) : null;
};

const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Public identifier from a profile URL, lowercased, for matching results back to inputs. */
function idOf(url: unknown): string {
  if (typeof url !== "string") return "";
  const m = normaliseLinkedInUrl(url).match(/\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : url.toLowerCase();
}

async function runActor(actor: string, input: unknown, token: string, timeoutSecs: number, maxUsd: number, signal: AbortSignal) {
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=${timeoutSecs}&maxTotalChargeUsd=${maxUsd}&clean=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify ${actor} returned ${res.status}: ${body.slice(0, 200)}`);
  }
  const items = (await res.json()) as unknown;
  if (!Array.isArray(items)) throw new Error(`Apify ${actor} returned something that wasn't a list`);
  return items as Record<string, unknown>[];
}

/**
 * Pull every profile in one go. Never throws: every failure is reported in
 * the returned status and detail, so the email can say exactly what happened.
 */
export async function pullLinkedIn(targets: Target[], deadlineMs: number): Promise<LinkedInReport> {
  const pulled_at = new Date().toISOString();
  const token = process.env.APIFY_TOKEN;
  const empty = (status: LinkedInReport["status"], detail: string): LinkedInReport => ({
    status,
    detail,
    pulled_at,
    profiles: targets.map((t) => ({
      url: t.url, role: t.role, note: t.note, found: false,
      name: null, headline: null, about: null, location: null, experience: [], posts: [],
    })),
  });
  if (!token) return empty("skipped", "APIFY_TOKEN is not set in Vercel, so LinkedIn was not pulled.");
  if (targets.length === 0) return empty("skipped", "No LinkedIn links were given.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  const actorTimeout = Math.max(20, Math.floor(deadlineMs / 1000) - 10);
  const client = targets.filter((t) => t.role === "client").map((t) => normaliseLinkedInUrl(t.url));
  const others = targets.filter((t) => t.role !== "client").map((t) => normaliseLinkedInUrl(t.url));
  const problems: string[] = [];

  try {
    const [profilesRes, clientPostsRes, otherPostsRes] = await Promise.allSettled([
      runActor(
        PROFILE_ACTOR,
        { profileScraperMode: "Profile details no email ($4 per 1k)", queries: targets.map((t) => normaliseLinkedInUrl(t.url)) },
        token, actorTimeout, 0.1, controller.signal
      ),
      client.length
        ? runActor(
            POSTS_ACTOR,
            { targetUrls: client, maxPosts: 10, scrapeReactions: false, scrapeComments: false, includeReposts: true, includeQuotePosts: true },
            token, actorTimeout, 0.05, controller.signal
          )
        : Promise.resolve([]),
      others.length
        ? runActor(
            POSTS_ACTOR,
            { targetUrls: others, maxPosts: 5, scrapeReactions: false, scrapeComments: false, includeReposts: false, includeQuotePosts: true },
            token, actorTimeout, 0.15, controller.signal
          )
        : Promise.resolve([]),
    ]);

    if (controller.signal.aborted) problems.push(`timed out after ${Math.round(deadlineMs / 1000)} seconds`);
    const profileItems = profilesRes.status === "fulfilled" ? profilesRes.value : [];
    if (profilesRes.status === "rejected") problems.push(`profiles: ${String(profilesRes.reason).slice(0, 200)}`);
    const postItems = [
      ...(clientPostsRes.status === "fulfilled" ? clientPostsRes.value : []),
      ...(otherPostsRes.status === "fulfilled" ? otherPostsRes.value : []),
    ];
    if (clientPostsRes.status === "rejected") problems.push(`their posts: ${String(clientPostsRes.reason).slice(0, 200)}`);
    if (otherPostsRes.status === "rejected") problems.push(`other posts: ${String(otherPostsRes.reason).slice(0, 200)}`);

    const byId = new Map<string, Record<string, unknown>>();
    for (const item of profileItems) {
      const q = (item.originalQuery as { query?: unknown } | undefined)?.query;
      const pid = typeof item.publicIdentifier === "string" ? item.publicIdentifier.toLowerCase() : null;
      if (typeof q === "string" && q) byId.set(idOf(q), item);
      if (pid) byId.set(pid, item);
    }
    const postsById = new Map<string, PulledPost[]>();
    for (const p of postItems) {
      const target = (p.query as { targetUrl?: unknown } | undefined)?.targetUrl;
      if (typeof target !== "string" || typeof p.content !== "string") continue;
      const rawAuthor = (p.author as { publicIdentifier?: unknown } | undefined)?.publicIdentifier;
      const author = typeof rawAuthor === "string" ? rawAuthor.toLowerCase() : undefined;
      const key = idOf(target);
      // A post the person reshared from someone else is kept only for the client (a repost says what they rate).
      const isOwn = !author || author === key;
      const list = postsById.get(key) ?? [];
      list.push({
        date: clip((p.postedAt as { date?: unknown } | undefined)?.date, 40),
        text: (isOwn ? "" : "[Reshared] ") + (clip(p.content, 1500) ?? ""),
        likes: numOrNull((p.engagement as { likes?: unknown } | undefined)?.likes),
        comments: numOrNull((p.engagement as { comments?: unknown } | undefined)?.comments),
      });
      postsById.set(key, list);
    }

    const profiles: PulledProfile[] = targets.map((t) => {
      const item = byId.get(idOf(t.url));
      const exp = Array.isArray(item?.experience)
        ? (item!.experience as unknown[]).filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        : [];
      const loc = item?.location as { linkedinText?: unknown } | undefined;
      const posts = (postsById.get(idOf(t.url)) ?? [])
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, t.role === "client" ? 10 : 5);
      return {
        url: t.url,
        role: t.role,
        note: t.note,
        found: Boolean(item),
        name: item ? clip([item.firstName, item.lastName].filter((x) => typeof x === "string").join(" "), 120) : null,
        headline: clip(item?.headline, 300),
        about: clip(item?.about, 2600),
        location: clip(loc?.linkedinText, 120),
        experience: exp.slice(0, 6).map((e) => ({
          position: clip(e.position, 150),
          company: clip(e.companyName, 150),
          start: clip((e.startDate as { text?: unknown } | undefined)?.text, 30),
          end: clip((e.endDate as { text?: unknown } | undefined)?.text, 30),
          description: clip(e.description, 400),
        })),
        posts,
      };
    });

    const missing = profiles.filter((p) => !p.found).map((p) => p.url);
    if (missing.length) problems.push(`not found: ${missing.join(", ")}`);
    const anyFound = profiles.some((p) => p.found);
    return {
      status: !anyFound ? "failed" : problems.length ? "partial" : "ok",
      detail: problems.length ? problems.join(" | ") : `Pulled ${profiles.length} profiles.`,
      pulled_at,
      profiles,
    };
  } catch (err) {
    const aborted = controller.signal.aborted;
    return empty("failed", aborted ? `Timed out after ${Math.round(deadlineMs / 1000)} seconds.` : `Error: ${String(err).slice(0, 300)}`);
  } finally {
    clearTimeout(timer);
  }
}
