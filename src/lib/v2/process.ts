import "server-only";
import { getAdminClient } from "../supabase-admin";
import { submissionV2Schema, type SubmissionV2 } from "./definitions";
import { pullLinkedIn, type LinkedInReport } from "./linkedin";
import { writeBrief, type BriefResult } from "./brief";
import { sendAlertEmail, sendOnboardingEmail } from "./email";

const TABLE = "onboarding_submissions";
/** A run that started longer ago than this is treated as dead and may be taken over. Longer than any run can last. */
const STALE_MS = 10 * 60 * 1000;
/** After this many failed sends the backstop stops retrying and emails an alert instead. */
export const MAX_EMAIL_ATTEMPTS = 5;
/** Past this many forms in 24 hours, the paid steps (LinkedIn pull, brief) are skipped. A spam guard. */
const DAILY_PAID_CAP = 20;

export interface ProcessOutcome {
  sent: boolean;
  detail: string;
}

function targetsFor(a: SubmissionV2) {
  return [
    { url: a.linkedin_url, role: "client" as const, note: "" },
    ...a.example_profiles.map((p) => ({ url: p.url, role: "ideal_client" as const, note: p.note })),
    ...a.similar_sellers.map((p) => ({ url: p.url, role: "similar_seller" as const, note: p.note })),
  ];
}

function skippedReport(detail: string): LinkedInReport {
  return { status: "skipped", detail, pulled_at: new Date().toISOString(), profiles: [] };
}

/**
 * Pull LinkedIn, write the brief and send the one email for a stored
 * submission, all inside `budgetMs`. Safe to call twice: only one caller can
 * claim the row, a row whose email has gone is left alone, and the email
 * carries an idempotency key so a resend is dropped by Resend. Never throws.
 */
export async function processSubmission(
  id: string,
  opts: { budgetMs: number; allowLinkedIn: boolean }
): Promise<ProcessOutcome> {
  const started = Date.now();
  const left = () => opts.budgetMs - (Date.now() - started);
  const db = getAdminClient();
  if (!db) return { sent: false, detail: "SUPABASE_SERVICE_ROLE_KEY missing" };

  const { data: row, error } = await db
    .from(TABLE)
    .select("id, created_at, answers, email_sent_at, processing_started_at, email_attempts, linkedin_report, session_brief")
    .eq("id", id)
    .single();
  if (error || !row) return { sent: false, detail: `could not read submission: ${error?.message ?? "not found"}` };
  if (row.email_sent_at) return { sent: true, detail: "already sent" };
  if (row.processing_started_at && Date.now() - new Date(row.processing_started_at).getTime() < STALE_MS) {
    return { sent: false, detail: "another run is working on it" };
  }

  // Claim it: compare-and-set on the lock AND the attempt counter, so two callers can't both win
  // and an attempt is never lost.
  const attempts = row.email_attempts ?? 0;
  let claim = db
    .from(TABLE)
    .update({ processing_started_at: new Date().toISOString(), email_attempts: attempts + 1 })
    .eq("id", id)
    .is("email_sent_at", null)
    .eq("email_attempts", attempts);
  claim = row.processing_started_at ? claim.eq("processing_started_at", row.processing_started_at) : claim.is("processing_started_at", null);
  const { data: claimed, error: claimError } = await claim.select("id");
  if (claimError) return { sent: false, detail: `claim failed: ${claimError.message}` };
  if (!claimed || claimed.length === 0) return { sent: false, detail: "another run claimed it first" };

  const release = async (fields: Record<string, unknown>) => {
    const { error: e } = await db.from(TABLE).update({ ...fields, processing_started_at: null }).eq("id", id);
    if (e) console.error(`Onboarding ${id}: could not release the row (${e.message}); it frees itself after 10 minutes.`);
  };

  const parsed = submissionV2Schema.safeParse(row.answers);
  if (!parsed.success) {
    // Can't build the normal email, so send the raw answers as an alert and stop retrying.
    try {
      await sendAlertEmail(id, "Stored answers could not be read in the v2 format", row.answers);
      await release({ email_sent_at: new Date().toISOString(), alert_sent_at: new Date().toISOString(), email_error: "answers failed validation; raw answers emailed as an alert" });
      return { sent: true, detail: "alert sent (answers failed validation)" };
    } catch (err) {
      await release({ email_error: `answers failed validation and the alert failed: ${String(err).slice(0, 300)}` });
      return { sent: false, detail: "answers failed validation; alert failed" };
    }
  }
  const answers = parsed.data;
  const notes: string[] = [];

  // Spam guard: count today's forms before spending money on them.
  let overCap = false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await db.from(TABLE).select("id", { count: "exact", head: true }).eq("form_version", "v2").gte("created_at", since);
  if (countErr) notes.push(`Could not count today's forms (${countErr.message}); the spending cap was not checked.`);
  else if ((count ?? 0) > DAILY_PAID_CAP) overCap = true;

  let linkedin = row.linkedin_report as LinkedInReport | null;
  if (!linkedin) {
    const linkedinMs = Math.min(120_000, left() - 120_000);
    if (overCap) linkedin = skippedReport(`Skipped: more than ${DAILY_PAID_CAP} forms in 24 hours, so paid steps are paused (possible spam).`);
    else if (!opts.allowLinkedIn) linkedin = skippedReport("Skipped on this retry: the first attempt did not finish, so the email goes without it.");
    else if (linkedinMs < 20_000) linkedin = skippedReport("Skipped: not enough time left on this attempt.");
    else linkedin = await pullLinkedIn(targetsFor(answers), linkedinMs);
    const { error: saveErr } = await db.from(TABLE).update({ linkedin_report: linkedin, linkedin_status: linkedin.status }).eq("id", id);
    if (saveErr) notes.push(`The LinkedIn data could not be saved to the database (${saveErr.message}); it is only in this email.`);
  }

  let brief: BriefResult;
  if (row.session_brief) {
    brief = { status: "ok", detail: "Written on an earlier attempt.", text: row.session_brief as string };
  } else {
    const briefMs = Math.min(110_000, left() - 25_000);
    if (overCap) brief = { status: "skipped", detail: `Skipped: more than ${DAILY_PAID_CAP} forms in 24 hours (possible spam).`, text: "" };
    else if (briefMs < 20_000) brief = { status: "skipped", detail: "Skipped: not enough time left on this attempt.", text: "" };
    else brief = await writeBrief(answers, linkedin, briefMs);
    const { error: saveErr } = await db
      .from(TABLE)
      .update({ session_brief: brief.text || null, brief_status: `${brief.status}: ${brief.detail}`.slice(0, 500) })
      .eq("id", id);
    if (saveErr) notes.push(`The brief could not be saved to the database (${saveErr.message}); it is only in this email.`);
  }

  try {
    await sendOnboardingEmail({ id, created_at: row.created_at as string, answers, linkedin, brief, notes });
  } catch (err) {
    const msg = String(err).slice(0, 500);
    console.error(`Onboarding ${id}: email failed (attempt ${attempts + 1} of ${MAX_EMAIL_ATTEMPTS}):`, err);
    await release({ email_error: msg });
    return { sent: false, detail: msg };
  }
  const { error: doneErr } = await db
    .from(TABLE)
    .update({ email_sent_at: new Date().toISOString(), email_error: null, processing_started_at: null })
    .eq("id", id);
  if (doneErr) {
    // The idempotency key stops Resend sending a second copy if the backstop retries.
    console.error(`Onboarding ${id}: email sent but could not be marked sent (${doneErr.message}).`);
  }
  return { sent: true, detail: "sent" };
}

/** Called by the backstop for rows that used up every attempt: one alert email with the raw answers. */
export async function alertGaveUp(id: string): Promise<ProcessOutcome> {
  const db = getAdminClient();
  if (!db) return { sent: false, detail: "SUPABASE_SERVICE_ROLE_KEY missing" };
  const { data: row, error } = await db.from(TABLE).select("answers, email_error, alert_sent_at").eq("id", id).single();
  if (error || !row) return { sent: false, detail: `could not read submission: ${error?.message ?? "not found"}` };
  if (row.alert_sent_at) return { sent: true, detail: "alert already sent" };
  try {
    await sendAlertEmail(id, `The onboarding email failed ${MAX_EMAIL_ATTEMPTS} times. Last error: ${row.email_error ?? "unknown"}`, row.answers);
  } catch (err) {
    return { sent: false, detail: `alert failed: ${String(err).slice(0, 300)}` };
  }
  const { error: e } = await db.from(TABLE).update({ alert_sent_at: new Date().toISOString() }).eq("id", id);
  if (e) console.error(`Onboarding ${id}: alert sent but could not be recorded (${e.message}).`);
  return { sent: true, detail: "alert sent" };
}
