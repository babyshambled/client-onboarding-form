// Version 2 of the 1:1 client onboarding form (27 Nov 2026).
// Shared by the browser form and the server: no server-only imports here.

import { z } from "zod";
import { VAT_COUNTRY_NAMES, findVatCountry, vatError } from "./vat";

export const FORM_VERSION = "v2";

export const RATING_ITEMS = [
  { key: "ideal_client_clarity", label: "I know exactly who my ideal client is" },
  { key: "dm_confidence", label: "I'm confident starting DM conversations with strangers" },
  { key: "dm_to_call", label: "I can move a conversation toward a call without feeling salesy" },
  { key: "spot_opportunities", label: "I can tell which conversations are real opportunities" },
  { key: "calls_to_clients", label: "I turn sales calls into clients as often as I'd like" },
  { key: "dm_system", label: "I have a repeatable system for my DMs" },
  { key: "price_comfort", label: "I can talk about my price without it feeling uncomfortable" },
] as const;
export type RatingKey = (typeof RATING_ITEMS)[number]["key"];

export const BIGGEST_COST_OPTIONS = [
  "Starting DM conversations",
  "Turning conversations into calls",
  "Turning calls into clients",
  "Being clear about who I'm for",
  "Something else",
] as const;

export const LINKEDIN_TOOL_OPTIONS = [
  "Free LinkedIn",
  "LinkedIn Premium",
  "Sales Navigator",
  "An inbox tool",
  "A CRM",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "Dutch",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Portuguese",
] as const;

/** Formality choices per language. A language not listed here gets a free-text box. */
export const FORMALITY_OPTIONS: Record<string, string[]> = {
  Dutch: ["Informal (je)", "Formal (u)", "It depends (say how)"],
  German: ["Informal (du)", "Formal (Sie)", "It depends (say how)"],
  French: ["Informal (tu)", "Formal (vous)", "It depends (say how)"],
  Spanish: ["Informal (tú)", "Formal (usted)", "It depends (say how)"],
  Italian: ["Informal (tu)", "Formal (Lei)", "It depends (say how)"],
  Portuguese: ["Informal (tu / você)", "Formal (o senhor / a senhora)", "It depends (say how)"],
};

export const REPLY_FORMAT_OPTIONS = [
  "Tell me the move in English and I'll write it myself",
  "Give me a full draft in that language to fix",
  "Either",
] as const;

export const SOURCE_ITEMS = [
  { key: "referral", label: "Referral or word of mouth" },
  { key: "events", label: "Networking or events" },
  { key: "linkedin_message", label: "A LinkedIn message (yours or theirs)" },
  { key: "linkedin_posts", label: "Your LinkedIn posts" },
  { key: "website", label: "Your website or Google" },
  { key: "other", label: "Other" },
] as const;
export type SourceKey = (typeof SOURCE_ITEMS)[number]["key"];

// ─── Helpers ───────────────────────────────────────────────

/** The same email check the server uses, so the browser never lets through what the server rejects. */
export const emailSchema = z.string().trim().email("Invalid email address").max(320);

export const LINKEDIN_PROFILE_RE = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/in\/[^/?#\s]+\/?(\?.*)?$/i;

/** Tidy a LinkedIn profile link: add https://, drop query strings and trailing slashes. */
export function normaliseLinkedInUrl(raw: string): string {
  let v = raw.trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    const m = u.pathname.match(/^\/in\/([^/]+)/i);
    if (!m) return v;
    return `https://www.linkedin.com/in/${decodeURIComponent(m[1]).toLowerCase()}`;
  } catch {
    return v;
  }
}

export function isLinkedInProfileUrl(raw: string): boolean {
  return LINKEDIN_PROFILE_RE.test(raw.trim());
}

export function formalityFor(language: string): string[] | null {
  return FORMALITY_OPTIONS[language] ?? null;
}

// ─── Schema (validated again on the server) ───────────────

const shortText = z.string().trim().max(300);
const longText = z.string().trim().max(5000);
const required = (label: string) => z.string().trim().min(1, `${label} is required`).max(5000);

const profileLink = z.object({
  url: z
    .string()
    .trim()
    .refine(isLinkedInProfileUrl, "Must be a LinkedIn profile link (linkedin.com/in/...)"),
  note: shortText.optional().default(""),
});

const languageEntry = z.object({
  language: shortText.min(1),
  formality: shortText.optional().default(""),
  formality_note: shortText.optional().default(""),
});

const rating = z.number().int().min(1).max(5);
const count = z.number().int().min(0).max(1000).nullable().optional();

export const submissionV2Schema = z
  .object({
    form_version: z.literal(FORM_VERSION),

    // Details
    name: z.string().trim().min(1, "Name is required").max(200),
    email: emailSchema,
    linkedin_url: z
      .string()
      .trim()
      .refine(isLinkedInProfileUrl, "Must be your LinkedIn profile link (linkedin.com/in/...)"),
    website: shortText.optional().default(""),

    // Step 1
    their_word: z.string().trim().max(200).optional().default(""),
    business_description: required("What you do"),
    clients_now_and_ideal: required("Who your clients are"),
    problems_in_their_words: required("What people say when they first come to you"),
    false_beliefs: required("What people believe that turns out to be wrong"),
    pricing: required("What you charge"),

    // Step 2
    ratings: z.object({
      ideal_client_clarity: rating,
      dm_confidence: rating,
      dm_to_call: rating,
      spot_opportunities: rating,
      calls_to_clients: rating,
      dm_system: rating,
      price_comfort: rating,
    }),

    // Step 3
    biggest_cost: z.enum(BIGGEST_COST_OPTIONS),
    biggest_cost_other: longText.optional().default(""),
    attempted_fixes: required("What you've tried"),

    // Step 4
    example_profiles: z.array(profileLink).min(3, "Please add at least 3 profiles").max(5),
    similar_sellers: z.array(profileLink).max(3).optional().default([]),
    who_to_find: z.object({
      titles: required("Job titles"),
      size: required("Business size"),
      location: required("Country and region"),
      industries: required("Industries"),
    }),
    buying_signals: longText.optional().default(""),
    exclusions: longText.optional().default(""),
    hours_per_week: z.number().min(0).max(80),
    people_per_month: z.number().int().min(0).max(1000),
    linkedin_tools: z.array(z.enum(LINKEDIN_TOOL_OPTIONS)).max(5).optional().default([]),
    linkedin_tools_detail: shortText.optional().default(""),

    // Step 5
    languages: z.array(languageEntry).min(1, "Pick at least one language").max(10),
    language_split: longText.optional().default(""),
    reply_format: z.string().trim().max(200).optional().default(""),
    messages: z.object({
      first_message: required("Your usual first message"),
      good_reply: required("A message that got a good reply"),
      went_nowhere: required("A message that went nowhere"),
    }),
    live_conversations: longText.optional().default(""),

    // Step 6
    client_results: longText.optional().default(""),
    client_sources: z
      .object({
        referral: count,
        events: count,
        linkedin_message: count,
        linkedin_posts: count,
        website: count,
        other: count,
        other_label: shortText.optional().default(""),
      })
      .optional()
      .default({ other_label: "" }),

    // Step 7
    first_month_win: required("What would make the first month worth it"),
    ninety_day: required("What you'd like to be true in 90 days"),
    honest_about: longText.optional().default(""),
    anything_else: longText.optional().default(""),

    // Invoice
    invoice: z.object({
      business_name: z.string().trim().min(1, "Business name is required").max(300),
      country: z.enum(VAT_COUNTRY_NAMES as [string, ...string[]]),
      country_other: shortText.optional().default(""),
      vat_registered: z.enum(["yes", "no", ""]).optional().default(""),
      vat_number: shortText.optional().default(""),
    }),

    acknowledged_short_answers: z.array(z.string().max(100)).max(50).optional().default([]),
  })
  .superRefine((d, ctx) => {
    if (d.biggest_cost === "Something else" && !d.biggest_cost_other.trim()) {
      ctx.addIssue({ code: "custom", path: ["biggest_cost_other"], message: "Please say what it is" });
    }
    const country = findVatCountry(d.invoice.country);
    if (country?.asks) {
      if (!d.invoice.vat_registered) {
        ctx.addIssue({ code: "custom", path: ["invoice", "vat_registered"], message: "Please answer yes or no" });
      } else if (d.invoice.vat_registered === "yes") {
        const err = vatError(d.invoice.country, d.invoice.vat_number);
        if (err) ctx.addIssue({ code: "custom", path: ["invoice", "vat_number"], message: err });
      }
    }
    if (d.invoice.country === "Other" && !d.invoice.country_other.trim()) {
      ctx.addIssue({ code: "custom", path: ["invoice", "country_other"], message: "Please type your country" });
    }
    const nonEnglish = d.languages.filter((l) => l.language !== "English");
    for (const [i, l] of d.languages.entries()) {
      if (l.language !== "English" && !l.formality.trim()) {
        ctx.addIssue({ code: "custom", path: ["languages", i, "formality"], message: `How formal are you in ${l.language}?` });
      }
    }
    if (nonEnglish.length > 0 && !d.reply_format.trim()) {
      ctx.addIssue({ code: "custom", path: ["reply_format"], message: "Please pick how you want suggested replies" });
    }
    const urls = [d.linkedin_url, ...d.example_profiles.map((p) => p.url), ...d.similar_sellers.map((p) => p.url)].map(
      normaliseLinkedInUrl
    );
    if (new Set(urls).size !== urls.length) {
      ctx.addIssue({ code: "custom", path: ["example_profiles"], message: "The same LinkedIn profile is listed twice" });
    }
  });

export type SubmissionV2 = z.infer<typeof submissionV2Schema>;
export type SubmissionV2Input = z.input<typeof submissionV2Schema>;
