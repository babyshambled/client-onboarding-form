// Turns a v2 submission into labelled sections, in form order. Used by the
// email, the PDF and the admin page, so the three always agree.

import { RATING_ITEMS, SOURCE_ITEMS, type SubmissionV2 } from "./definitions";
import { findVatCountry, normaliseVat } from "./vat";

export interface Field {
  label: string;
  value: string;
  key?: string;
}
export interface Section {
  title: string;
  fields: Field[];
}

const dash = (s: string | null | undefined) => (s && s.trim() ? s.trim() : "-");

export function ratingRows(a: SubmissionV2): { label: string; value: number }[] {
  return RATING_ITEMS.map((r) => ({ label: r.label, value: a.ratings[r.key] }));
}

export function buildSections(a: SubmissionV2): Section[] {
  const links = (list: { url: string; note: string }[]) =>
    list.length ? list.map((p) => `${p.url}${p.note ? ` (${p.note})` : ""}`).join("\n") : "-";
  const langs = a.languages
    .map((l) => {
      const f = l.formality ? `: ${l.formality}${l.formality_note ? `, ${l.formality_note}` : ""}` : "";
      return `${l.language}${f}`;
    })
    .join("\n");
  const sources = SOURCE_ITEMS.map((s) => {
    const v = a.client_sources?.[s.key as keyof typeof a.client_sources];
    const label = s.key === "other" && a.client_sources?.other_label ? `Other (${a.client_sources.other_label})` : s.label;
    return typeof v === "number" ? `${label}: ${v}` : null;
  })
    .filter(Boolean)
    .join("\n");
  const country = findVatCountry(a.invoice.country);
  const vatLine =
    country?.asks && a.invoice.vat_registered === "yes"
      ? `${country.taxName}: ${normaliseVat(country, a.invoice.vat_number)}`
      : country?.asks && a.invoice.vat_registered === "no"
        ? `Not registered for ${country.taxName}`
        : "No VAT question for this country";

  return [
    {
      title: "Details",
      fields: [
        { label: "LinkedIn", value: a.linkedin_url },
        { label: "Website or booking link", value: dash(a.website) },
        { label: "Their word for the people they work with", value: dash(a.their_word) },
      ],
    },
    {
      title: "You and your business",
      fields: [
        { label: "Q2 What they do for clients", value: a.business_description, key: "business_description" },
        { label: "Q3 Clients now, the one to clone, never again", value: a.clients_now_and_ideal, key: "clients_now_and_ideal" },
        { label: "Q4 What people say when they first come", value: a.problems_in_their_words, key: "problems_in_their_words" },
        { label: "Q5 What people wrongly believe", value: a.false_beliefs, key: "false_beliefs" },
        { label: "Q6 Price now, how paid, price in a year", value: a.pricing },
      ],
    },
    {
      title: "What's in the way",
      fields: [
        {
          label: "Q8 The one thing worth the most money",
          value: a.biggest_cost === "Something else" ? `Something else: ${a.biggest_cost_other}` : a.biggest_cost,
        },
        { label: "Q9 What they've tried", value: a.attempted_fixes, key: "attempted_fixes" },
      ],
    },
    {
      title: "Who we're looking for",
      fields: [
        { label: "Q10 Ideal-client examples", value: links(a.example_profiles) },
        { label: "Q10b Similar sellers", value: links(a.similar_sellers) },
        { label: "Q11 Job titles", value: a.who_to_find.titles },
        { label: "Q11 Business size", value: a.who_to_find.size },
        { label: "Q11 Country and region", value: a.who_to_find.location },
        { label: "Q11 Industries in and out", value: a.who_to_find.industries },
        { label: "Q12 Signs they need help", value: dash(a.buying_signals) },
        { label: "Q13 Leave off the list", value: dash(a.exclusions) },
        { label: "Q14 Hours a week / people a month", value: `${a.hours_per_week} hours a week, ${a.people_per_month} people a month` },
        {
          label: "Q15 LinkedIn tools",
          value: [a.linkedin_tools.join(", "), a.linkedin_tools_detail].filter(Boolean).join(". ") || "-",
        },
      ],
    },
    {
      title: "How they message",
      fields: [
        { label: "Q16 Languages and formality", value: langs || "-" },
        { label: "Who gets which language", value: dash(a.language_split) },
        { label: "Suggested replies", value: dash(a.reply_format) },
        { label: "Q17 Usual first message", value: a.messages.first_message },
        { label: "Q17 Got a good reply", value: a.messages.good_reply },
        { label: "Q17 Went nowhere", value: a.messages.went_nowhere },
        { label: "Q18 Live conversations to help with", value: dash(a.live_conversations) },
      ],
    },
    {
      title: "Proof and where clients come from",
      fields: [
        { label: "Q19 Best client results", value: dash(a.client_results) },
        { label: "Q20 Last 10 clients by source", value: sources || "-" },
      ],
    },
    {
      title: "Where they want to be",
      fields: [
        { label: "Q21 First month is worth it if", value: a.first_month_win, key: "first_month_win" },
        { label: "Q22 True in 90 days", value: a.ninety_day, key: "ninety_day" },
        { label: "Q23 The honest About paragraph", value: dash(a.honest_about) },
        { label: "Q24 Anything else, dates", value: dash(a.anything_else) },
      ],
    },
    {
      title: "Invoice details",
      fields: [
        { label: "Business name", value: a.invoice.business_name },
        {
          label: "Country",
          value: a.invoice.country === "Other" ? `Other: ${a.invoice.country_other}` : a.invoice.country,
        },
        { label: "Tax number", value: vatLine },
      ],
    },
  ];
}
