"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProgressBar from "@/components/ProgressBar";
import FormStep from "@/components/FormStep";
import TextInput from "@/components/TextInput";
import TextArea from "@/components/TextArea";
import Slider from "@/components/Slider";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import CheckboxGroup from "@/components/CheckboxGroup";
import NumberInput from "@/components/NumberInput";
import {
  BIGGEST_COST_OPTIONS,
  FORM_VERSION,
  LANGUAGE_OPTIONS,
  LINKEDIN_TOOL_OPTIONS,
  RATING_ITEMS,
  REPLY_FORMAT_OPTIONS,
  SOURCE_ITEMS,
  emailSchema,
  formalityFor,
  isLinkedInProfileUrl,
  normaliseLinkedInUrl,
  type RatingKey,
  type SourceKey,
} from "@/lib/v2/definitions";
import { VAT_COUNTRY_NAMES, findVatCountry, vatError } from "@/lib/v2/vat";

// A new key, so answers saved by the old form never load into this one.
const STORAGE_KEY = "onboarding-form-data-v2";

const STEP_LABELS = ["Business", "Ratings", "Blockers", "Prospects", "Messaging", "Proof", "Goals", "Invoice"];
const LAST_STEP = STEP_LABELS.length - 1;

interface ProfileRow {
  url: string;
  note: string;
}

interface FormState {
  name: string;
  email: string;
  linkedin_url: string;
  website: string;
  their_word: string;
  business_description: string;
  clients_now_and_ideal: string;
  problems_in_their_words: string;
  false_beliefs: string;
  pricing: string;
  ratings: Record<RatingKey, number>;
  biggest_cost: string;
  biggest_cost_other: string;
  attempted_fixes: string;
  example_profiles: ProfileRow[];
  similar_sellers: ProfileRow[];
  who_titles: string;
  who_size: string;
  who_location: string;
  who_industries: string;
  buying_signals: string;
  exclusions: string;
  hours_per_week: string;
  people_per_month: string;
  linkedin_tools: string[];
  linkedin_tools_detail: string;
  selected_languages: string[];
  other_languages: string[];
  formality: Record<string, string>;
  formality_note: Record<string, string>;
  language_split: string;
  reply_format: string;
  msg_first: string;
  msg_good: string;
  msg_nowhere: string;
  live_conversations: string;
  client_results: string;
  sources: Record<SourceKey, string>;
  sources_other_label: string;
  first_month_win: string;
  ninety_day: string;
  honest_about: string;
  anything_else: string;
  inv_business_name: string;
  inv_country: string;
  inv_country_other: string;
  inv_vat_registered: string;
  inv_vat_number: string;
}

const emptyRow = (): ProfileRow => ({ url: "", note: "" });

const defaultState: FormState = {
  name: "",
  email: "",
  linkedin_url: "",
  website: "",
  their_word: "",
  business_description: "",
  clients_now_and_ideal: "",
  problems_in_their_words: "",
  false_beliefs: "",
  pricing: "",
  ratings: Object.fromEntries(RATING_ITEMS.map((r) => [r.key, 3])) as Record<RatingKey, number>,
  biggest_cost: "",
  biggest_cost_other: "",
  attempted_fixes: "",
  example_profiles: [emptyRow(), emptyRow(), emptyRow()],
  similar_sellers: [emptyRow()],
  who_titles: "",
  who_size: "",
  who_location: "",
  who_industries: "",
  buying_signals: "",
  exclusions: "",
  hours_per_week: "",
  people_per_month: "",
  linkedin_tools: [],
  linkedin_tools_detail: "",
  selected_languages: [],
  other_languages: [],
  formality: {},
  formality_note: {},
  language_split: "",
  reply_format: "",
  msg_first: "",
  msg_good: "",
  msg_nowhere: "",
  live_conversations: "",
  client_results: "",
  sources: Object.fromEntries(SOURCE_ITEMS.map((s) => [s.key, ""])) as Record<SourceKey, string>,
  sources_other_label: "",
  first_month_win: "",
  ninety_day: "",
  honest_about: "",
  anything_else: "",
  inv_business_name: "",
  inv_country: "",
  inv_country_other: "",
  inv_vat_registered: "",
  inv_vat_number: "",
};

type MissingItem = { label: string; key: string; kind: "empty" | "short" };

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Every language they write in, in a stable order, typed-in languages last. */
function allLanguages(f: FormState): string[] {
  const std = LANGUAGE_OPTIONS.filter((l) => f.selected_languages.includes(l));
  const others = f.selected_languages.includes("Other")
    ? f.other_languages.map((l) => l.trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...std, ...others]));
}

const toNumber = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Restore a saved draft safely: nested objects merged key by key, arrays checked, anything odd dropped. */
function restoreDraft(raw: string | null): FormState | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Partial<FormState>;
    if (!saved || typeof saved !== "object") return null;
    const out: FormState = { ...defaultState };
    const target = out as unknown as Record<string, unknown>;
    for (const key of Object.keys(defaultState) as (keyof FormState)[]) {
      const def = defaultState[key];
      const val = saved[key] as unknown;
      if (val === undefined || val === null) continue;
      if (Array.isArray(def)) {
        if (Array.isArray(val)) target[key] = val;
      } else if (typeof def === "object") {
        if (typeof val === "object" && !Array.isArray(val)) target[key] = { ...(def as object), ...(val as object) };
      } else if (typeof val === typeof def) {
        target[key] = val;
      }
    }
    const rows = (list: unknown, min: number): ProfileRow[] => {
      const clean = (Array.isArray(list) ? list : [])
        .filter((r): r is ProfileRow => !!r && typeof r === "object" && typeof (r as ProfileRow).url === "string")
        .map((r) => ({ url: r.url, note: typeof r.note === "string" ? r.note : "" }));
      while (clean.length < min) clean.push(emptyRow());
      return clean;
    };
    out.example_profiles = rows(out.example_profiles, 3);
    out.similar_sellers = rows(out.similar_sellers, 1);
    out.other_languages = out.other_languages.filter((l) => typeof l === "string");
    out.selected_languages = out.selected_languages.filter((l) => typeof l === "string");
    out.linkedin_tools = out.linkedin_tools.filter((l) => typeof l === "string");
    out.ratings = { ...out.ratings };
    for (const r of RATING_ITEMS) {
      const v = out.ratings[r.key];
      if (typeof v !== "number" || v < 1 || v > 5) out.ratings[r.key] = 3;
    }
    return out;
  } catch {
    return null;
  }
}

/** Which step and field a server-side problem belongs to, so "Take me there" works. */
function locateIssue(path: string[]): { step: number; key: string } {
  const top = path[0] ?? "";
  const STEP_OF: Record<string, number> = {
    name: 0, email: 0, linkedin_url: 0, website: 0, their_word: 0, business_description: 0, clients_now_and_ideal: 0,
    problems_in_their_words: 0, false_beliefs: 0, pricing: 0, ratings: 1, biggest_cost: 2, biggest_cost_other: 2,
    attempted_fixes: 2, example_profiles: 3, similar_sellers: 3, who_to_find: 3, buying_signals: 3, exclusions: 3,
    hours_per_week: 3, people_per_month: 3, linkedin_tools: 3, linkedin_tools_detail: 3, languages: 4, language_split: 4,
    reply_format: 4, messages: 4, live_conversations: 4, client_results: 5, client_sources: 5, first_month_win: 6,
    ninety_day: 6, honest_about: 6, anything_else: 6, invoice: 7,
  };
  const MESSAGE_KEYS: Record<string, string> = { first_message: "msg_first", good_reply: "msg_good", went_nowhere: "msg_nowhere" };
  const KEY_OF: Record<string, string> = {
    who_to_find: `who_${path[1] ?? "titles"}`,
    messages: MESSAGE_KEYS[path[1] ?? ""] ?? "msg_first",
    invoice: `inv_${path[1] ?? "business_name"}`,
    client_sources: `source_${path[1] ?? "referral"}`,
  };
  return { step: STEP_OF[top] ?? 0, key: KEY_OF[top] ?? top };
}

const inputClass =
  "w-full px-4 py-3 text-base bg-brand-black border rounded-lg text-brand-white placeholder:text-brand-muted/50 border-brand-green/40 hover:border-brand-green";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [form, setForm] = useState<FormState>(defaultState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [missingDetail, setMissingDetail] = useState<MissingItem[]>([]);
  const [firstMissingKey, setFirstMissingKey] = useState<string | null>(null);
  const [acceptShort, setAcceptShort] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<"next" | "submit" | null>(null);
  const [acknowledgedShorts, setAcknowledgedShorts] = useState<string[]>([]);
  const softWarnedRef = useRef<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [trap, setTrap] = useState("");
  const modalButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked: start empty.
    }
    const restored = restoreDraft(saved);
    if (saved && !restored) {
      try {
        localStorage.removeItem(STORAGE_KEY); // a damaged save must not break the form on every visit
      } catch {
        // nothing more to do
      }
    }
    // Loading saved answers from the browser once, after the first render, so the server and client HTML match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (restored) setForm(restored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Storage full or blocked: the form still works, it just won't remember.
    }
  }, [form, loaded]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the error for this field, and for the group it belongs to.
    const related: Record<string, (k: string) => boolean> = {
      selected_languages: (k) => k === "languages" || k.startsWith("formality_"),
      other_languages: (k) => k === "languages" || k.startsWith("formality_"),
      formality: (k) => k.startsWith("formality_"),
      similar_sellers: (k) => k === "example_profiles",
      inv_country: (k) => k.startsWith("inv_"),
      inv_vat_registered: (k) => k === "inv_vat_number" || k === "inv_vat_registered",
      sources: (k) => k.startsWith("source_"),
    };
    const match = related[key as string] ?? ((k: string) => k === key);
    setErrors((prev) => {
      const keys = Object.keys(prev).filter(match);
      if (keys.length === 0) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }, []);

  const updateRow = (list: "example_profiles" | "similar_sellers", i: number, patch: Partial<ProfileRow>) => {
    update(
      list,
      form[list].map((r, j) => (j === i ? { ...r, ...patch } : r))
    );
  };

  // ─── Validation per step ───────────────────────────────
  const collectMissing = (step: number) => {
    const detail: MissingItem[] = [];
    const errs: Record<string, string> = {};
    const need = (key: string, label: string, value: string, minWords?: number) => {
      if (!value.trim()) {
        detail.push({ label, key, kind: "empty" });
        errs[key] = "Required";
      } else if (minWords && wordCount(value) < minWords && !softWarnedRef.current[key]) {
        const wc = wordCount(value);
        detail.push({ label: `${label}: ideally at least ${minWords} words (you have ${wc})`, key, kind: "short" });
        errs[key] = `Ideally at least ${minWords} words (currently ${wc})`;
      }
    };
    const fail = (key: string, label: string) => {
      detail.push({ label, key, kind: "empty" });
      errs[key] = label;
    };

    if (step === 0) {
      need("name", "Full name", form.name);
      need("email", "Email", form.email);
      if (form.email.trim() && !emailSchema.safeParse(form.email).success)
        fail("email", "Email: that doesn't look like an email address");
      need("linkedin_url", "Your LinkedIn profile link", form.linkedin_url);
      if (form.linkedin_url.trim() && !isLinkedInProfileUrl(form.linkedin_url))
        fail("linkedin_url", "Your LinkedIn link should look like linkedin.com/in/your-name");
      need("business_description", "Q2: What you do for your clients", form.business_description, 15);
      need("clients_now_and_ideal", "Q3: Your clients now, the one you'd clone, and who you'd never take again", form.clients_now_and_ideal, 30);
      need("problems_in_their_words", "Q4: What people say when they first come to you", form.problems_in_their_words, 10);
      need("false_beliefs", "Q5: What people believe that turns out to be wrong", form.false_beliefs, 10);
      need("pricing", "Q6: What you charge", form.pricing);
    }
    if (step === 2) {
      need("biggest_cost", "Q8: The one thing that would bring you the most money", form.biggest_cost);
      if (form.biggest_cost === "Something else") need("biggest_cost_other", "Q8: Say what it is", form.biggest_cost_other);
      need("attempted_fixes", "Q9: What you've already tried", form.attempted_fixes, 20);
    }
    if (step === 3) {
      const filled = form.example_profiles.filter((r) => r.url.trim());
      if (filled.length < 3) fail("example_profiles", "Q10: Add at least 3 LinkedIn profiles of people you'd love as clients");
      const bad = [...filled, ...form.similar_sellers.filter((x) => x.url.trim())].find((r) => !isLinkedInProfileUrl(r.url));
      if (bad) fail("example_profiles", `Not a LinkedIn profile link: ${bad.url.slice(0, 60)}`);
      const urls = [form.linkedin_url, ...filled.map((r) => r.url), ...form.similar_sellers.map((r) => r.url)]
        .filter((u) => u.trim())
        .map(normaliseLinkedInUrl);
      if (new Set(urls).size !== urls.length) fail("example_profiles", "The same LinkedIn profile is listed twice");
      need("who_titles", "Q11: Job titles", form.who_titles);
      need("who_size", "Q11: How many staff", form.who_size);
      need("who_location", "Q11: Country and region", form.who_location);
      need("who_industries", "Q11: Industries in and out", form.who_industries);
      const hours = toNumber(form.hours_per_week);
      const people = toNumber(form.people_per_month);
      if (hours === null) fail("hours_per_week", "Q14: Hours a week");
      else if (hours < 0 || hours > 80) fail("hours_per_week", "Q14: Hours a week should be between 0 and 80");
      if (people === null) fail("people_per_month", "Q14: New people a month");
      else if (people < 0 || people > 1000) fail("people_per_month", "Q14: New people a month should be between 0 and 1,000");
    }
    if (step === 4) {
      const langs = allLanguages(form);
      if (langs.length === 0) fail("languages", "Q16: Tick at least one language");
      if (form.selected_languages.includes("Other") && form.other_languages.every((l) => !l.trim()))
        fail("languages", "Q16: Type the language you ticked as Other");
      for (const l of langs) {
        if (l !== "English" && !(form.formality[l] ?? "").trim()) fail(`formality_${l}`, `How formal are you in ${l}?`);
      }
      if (langs.some((l) => l !== "English") && !form.reply_format) fail("reply_format", "How you want suggested replies");
      need("msg_first", "Q17: Your usual first message", form.msg_first);
      need("msg_good", "Q17: A message that got a good reply", form.msg_good);
      need("msg_nowhere", "Q17: A message that went nowhere", form.msg_nowhere);
    }
    if (step === 5) {
      for (const src of SOURCE_ITEMS) {
        const n = toNumber(form.sources[src.key]);
        if (n !== null && (n < 0 || n > 1000)) fail(`source_${src.key}`, `Q20: ${src.label} should be between 0 and 1,000`);
      }
    }
    if (step === 6) {
      need("first_month_win", "Q21: What would make the first month worth it", form.first_month_win, 8);
      need("ninety_day", "Q22: What you'd like to be true in 90 days", form.ninety_day, 8);
    }
    if (step === 7) {
      need("inv_business_name", "Business name for invoices", form.inv_business_name);
      need("inv_country", "Country your business is registered in", form.inv_country);
      if (form.inv_country === "Other") need("inv_country_other", "Type your country", form.inv_country_other);
      const c = findVatCountry(form.inv_country);
      if (c?.asks) {
        if (!form.inv_vat_registered) fail("inv_vat_registered", `Are you registered for ${c.taxName}?`);
        if (form.inv_vat_registered === "yes") {
          const err = vatError(form.inv_country, form.inv_vat_number);
          if (err) fail("inv_vat_number", err);
        }
      }
    }
    return { detail, firstKey: detail[0]?.key ?? null, errs };
  };

  const scrollToField = (key: string) => {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field-id="${key}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
    }, 50);
  };

  const showMissing = (detail: MissingItem[], firstKey: string | null, attempt: "next" | "submit") => {
    setMissingDetail(detail);
    setFirstMissingKey(firstKey);
    setLastAttempt(attempt);
  };

  const dismissMissing = () => {
    const target = firstMissingKey;
    setMissingDetail([]);
    setAcceptShort(false);
    if (target) scrollToField(target);
  };

  const goTo = (step: number) => {
    setDirection(step > currentStep ? "right" : "left");
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const { detail, firstKey, errs } = collectMissing(currentStep);
    setErrors(errs);
    if (detail.length > 0) return showMissing(detail, firstKey, "next");
    if (currentStep < LAST_STEP) goTo(currentStep + 1);
  };

  const buildPayload = (acknowledged: string[]) => {
    const rows = (list: ProfileRow[]) =>
      list.filter((r) => r.url.trim()).map((r) => ({ url: normaliseLinkedInUrl(r.url), note: r.note.trim() }));
    const langs = allLanguages(form);
    const sources = Object.fromEntries(
      SOURCE_ITEMS.map((src) => {
        const n = toNumber(form.sources[src.key]);
        return [src.key, n === null ? null : Math.round(n)];
      })
    );
    const country = findVatCountry(form.inv_country);
    return {
      form_version: FORM_VERSION,
      name: form.name,
      email: form.email,
      linkedin_url: normaliseLinkedInUrl(form.linkedin_url),
      website: form.website,
      their_word: form.their_word,
      business_description: form.business_description,
      clients_now_and_ideal: form.clients_now_and_ideal,
      problems_in_their_words: form.problems_in_their_words,
      false_beliefs: form.false_beliefs,
      pricing: form.pricing,
      ratings: form.ratings,
      biggest_cost: form.biggest_cost,
      biggest_cost_other: form.biggest_cost === "Something else" ? form.biggest_cost_other : "",
      attempted_fixes: form.attempted_fixes,
      example_profiles: rows(form.example_profiles),
      similar_sellers: rows(form.similar_sellers),
      who_to_find: {
        titles: form.who_titles,
        size: form.who_size,
        location: form.who_location,
        industries: form.who_industries,
      },
      buying_signals: form.buying_signals,
      exclusions: form.exclusions,
      hours_per_week: toNumber(form.hours_per_week) ?? 0,
      people_per_month: Math.round(toNumber(form.people_per_month) ?? 0),
      linkedin_tools: form.linkedin_tools,
      linkedin_tools_detail: form.linkedin_tools_detail,
      languages: langs.map((l) => ({
        language: l,
        formality: l === "English" ? "" : form.formality[l] ?? "",
        formality_note: l === "English" ? "" : form.formality_note[l] ?? "",
      })),
      language_split: langs.length > 1 ? form.language_split : "",
      reply_format: langs.some((l) => l !== "English") ? form.reply_format : "",
      messages: { first_message: form.msg_first, good_reply: form.msg_good, went_nowhere: form.msg_nowhere },
      live_conversations: form.live_conversations,
      client_results: form.client_results,
      client_sources: { ...sources, other_label: form.sources_other_label },
      first_month_win: form.first_month_win,
      ninety_day: form.ninety_day,
      honest_about: form.honest_about,
      anything_else: form.anything_else,
      invoice: {
        business_name: form.inv_business_name,
        country: form.inv_country,
        country_other: form.inv_country === "Other" ? form.inv_country_other : "",
        vat_registered: country?.asks ? form.inv_vat_registered : "",
        vat_number: country?.asks && form.inv_vat_registered === "yes" ? form.inv_vat_number : "",
      },
      acknowledged_short_answers: acknowledged,
      company_url: trap,
    };
  };

  const handleSubmit = async (acknowledged: string[] = acknowledgedShorts) => {
    const all: MissingItem[] = [];
    let firstStep: number | null = null;
    let firstKey: string | null = null;
    let allErrs: Record<string, string> = {};
    for (let s = 0; s <= LAST_STEP; s++) {
      const r = collectMissing(s);
      allErrs = { ...allErrs, ...r.errs };
      if (r.detail.length > 0) {
        all.push(...r.detail);
        if (firstStep === null) {
          firstStep = s;
          firstKey = r.firstKey;
        }
      }
    }
    setErrors(allErrs);
    if (all.length > 0) {
      showMissing(all, firstKey, "submit");
      if (firstStep !== null && firstStep !== currentStep) goTo(firstStep);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(acknowledged)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const issues: { path?: string[]; message?: string }[] = Array.isArray(body?.issues) ? body.issues : [];
        if (issues.length > 0) {
          const first = locateIssue((issues[0].path ?? []).map(String));
          setMissingDetail(
            issues.map((i) => ({ label: `${(i.path ?? []).join(" > ")}: ${i.message ?? "invalid"}`, key: "api", kind: "empty" as const }))
          );
          setFirstMissingKey(first.key);
          if (first.step !== currentStep) goTo(first.step);
        } else {
          setMissingDetail([
            { label: "Something went wrong saving your answers. They're still here; please try again.", key: "submit", kind: "empty" },
          ]);
        }
        setLastAttempt("submit");
        setSubmitting(false);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = "/thank-you";
    } catch {
      setMissingDetail([
        { label: "Couldn't reach the server. Your answers are saved on this device; please try again.", key: "submit", kind: "empty" },
      ]);
      setLastAttempt("submit");
      setSubmitting(false);
    }
  };

  const continueAnyway = () => {
    const next = [...acknowledgedShorts];
    for (const item of missingDetail) {
      if (item.kind === "short") {
        softWarnedRef.current[item.key] = true;
        if (!next.includes(item.key)) next.push(item.key);
      }
    }
    setAcknowledgedShorts(next);
    setMissingDetail([]);
    setAcceptShort(false);
    if (lastAttempt === "submit") void handleSubmit(next);
    else goNext();
  };

  // The popup takes focus when it opens and closes on Escape.
  useEffect(() => {
    if (missingDetail.length === 0) return;
    modalButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMissingDetail([]);
        setAcceptShort(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [missingDetail.length]);

  // A plain render function, not a component: a component defined in here
  // would remount on every keystroke and lose the cursor.
  const renderProfileRows = (list: "example_profiles" | "similar_sellers", max: number, min: number) => (
    <div className="space-y-3">
      {form[list].map((row, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <input
            aria-label={`LinkedIn link ${i + 1}`}
            value={row.url}
            onChange={(e) => updateRow(list, i, { url: e.target.value })}
            placeholder="linkedin.com/in/their-name"
            className={inputClass}
          />
          <input
            aria-label={`Why, for link ${i + 1}`}
            value={row.note}
            onChange={(e) => updateRow(list, i, { note: e.target.value })}
            placeholder="A few words on why"
            className={inputClass}
          />
          {form[list].length > min ? (
            <button
              type="button"
              onClick={() => update(list, form[list].filter((_, j) => j !== i))}
              className="px-3 py-3 text-sm text-brand-muted hover:text-brand-white"
              aria-label={`Remove link ${i + 1}`}
            >
              Remove
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      {form[list].length < max && (
        <button
          type="button"
          onClick={() => update(list, [...form[list], emptyRow()])}
          className="text-sm font-semibold text-brand-yellow hover:underline"
        >
          + Add another
        </button>
      )}
    </div>
  );

  const langs = allLanguages(form);
  const vatCountry = findVatCountry(form.inv_country);
  const allShort = missingDetail.length > 0 && missingDetail.every((d) => d.kind === "short");
  const serverProblem = missingDetail.some((d) => d.key === "submit" || d.key === "api");

  return (
    <div className="min-h-screen bg-brand-black flex flex-col">
      <header className="border-b border-brand-green/20 py-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Darren Gibb" className="h-8 sm:h-10 w-auto mb-2" />
          <h1 className="text-lg font-semibold text-brand-white tracking-tight">Client Onboarding</h1>
        </div>
      </header>

      <ProgressBar currentStep={currentStep} steps={STEP_LABELS} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-32">
        {/* Invisible to people, tempting to bots. Anything typed here makes the server drop the submission. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="company_url">Company website (leave empty)</label>
          <input id="company_url" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>

        {currentStep === 0 && (
          <FormStep
            title="You and your business"
            subtitle="Please be as detailed as you can. Every question shows a made-up example answer. Your answers save on this device as you go."
            direction={direction}
            stepKey={0}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Full name" value={form.name} onChange={(v) => update("name", v)} required error={errors.name} fieldId="name" />
              <TextInput label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required error={errors.email} fieldId="email" />
            </div>
            <TextInput
              label="Your LinkedIn profile link"
              helper="When you press Submit, I pull your headline, About section and last ten posts from LinkedIn, so you don't have to paste them."
              placeholder="linkedin.com/in/your-name"
              value={form.linkedin_url}
              onChange={(v) => update("linkedin_url", v)}
              required
              error={errors.linkedin_url}
              fieldId="linkedin_url"
            />
            <TextInput
              label="Your website or booking link"
              placeholder="yourwebsite.com"
              value={form.website}
              onChange={(v) => update("website", v)}
              fieldId="website"
            />
            <TextInput
              label="Q1: What word do you use for the people who pay you?"
              helper="I'll use the same word in your messages and in our sessions."
              example={'Example: "Clients". Or "Members", "Patients", "Students".'}
              value={form.their_word}
              onChange={(v) => update("their_word", v)}
              fieldId="their_word"
            />
            <TextArea
              label="Q2: In two or three sentences, what do you actually do for your clients?"
              helper="Not your tagline. What you do with them day to day, and how long you work with them."
              example={'Example: "I work 1:1 with owners of small service businesses for 3 months. We rewrite their website and LinkedIn profile, and I edit their posts every week."'}
              value={form.business_description}
              onChange={(v) => update("business_description", v)}
              required
              error={errors.business_description}
              fieldId="business_description"
            />
            <TextArea
              label="Q3: Who are your clients right now, who is the one you'd clone, and who would you never take again?"
              helper="For each: their job title, type of business, how many staff, and the state they're in when they find you."
              example={'Example: "Now: mostly coaches, solo or up to 5 staff, posting for a year with no clients from it. Clone: the owner of a 12-person IT firm who did every bit of homework and referred two friends. Never again: people who want me to do it all for them."'}
              value={form.clients_now_and_ideal}
              onChange={(v) => update("clients_now_and_ideal", v)}
              required
              error={errors.clients_now_and_ideal}
              fieldId="clients_now_and_ideal"
            />
            <TextArea
              label="Q4: What do people say when they first come to you?"
              helper="Write it the way they say it, not how you'd describe it. Copy lines from your inbox if you can."
              example={'Example: "I post every week and nobody buys." / "I hate selling." / "My profile doesn\'t say what I do."'}
              value={form.problems_in_their_words}
              onChange={(v) => update("problems_in_their_words", v)}
              required
              error={errors.problems_in_their_words}
              fieldId="problems_in_their_words"
            />
            <TextArea
              label="Q5: What do people believe before working with you that turns out to be wrong?"
              helper="Two or three if you have them."
              example={'Example: "I need more followers before I can get clients." / "If my content is good enough, people will come to me."'}
              value={form.false_beliefs}
              onChange={(v) => update("false_beliefs", v)}
              required
              error={errors.false_beliefs}
              fieldId="false_beliefs"
            />
            <TextArea
              label="Q6: What do you charge today, how is it paid, and what would you like to charge a year from now?"
              helper="The real numbers, for each thing you sell."
              example={'Example: "£3,000 for a 12-week programme, paid monthly. A £400 one-off audit. In a year I want the programme at £5,000."'}
              value={form.pricing}
              onChange={(v) => update("pricing", v)}
              required
              error={errors.pricing}
              fieldId="pricing"
            />
          </FormStep>
        )}

        {currentStep === 1 && (
          <FormStep
            title="Q7: Rate where you are"
            subtitle="1 = a real struggle, 5 = confident and it works. Nobody scores five across the board. The low ones tell me where we start."
            direction={direction}
            stepKey={1}
          >
            <div className="space-y-5">
              {RATING_ITEMS.map((r) => (
                <Slider
                  key={r.key}
                  label={r.label}
                  value={form.ratings[r.key]}
                  onChange={(v) => update("ratings", { ...form.ratings, [r.key]: v })}
                />
              ))}
            </div>
          </FormStep>
        )}

        {currentStep === 2 && (
          <FormStep title="What's in the way" direction={direction} stepKey={2}>
            <Dropdown
              label="Q8: Which ONE thing, if it were fixed, would bring you the most money in the next 3 months?"
              helper="Pick one."
              options={[...BIGGEST_COST_OPTIONS]}
              value={form.biggest_cost}
              onChange={(v) => update("biggest_cost", v)}
              required
              error={errors.biggest_cost}
              fieldId="biggest_cost"
            />
            {form.biggest_cost === "Something else" && (
              <TextInput
                label="Say what it is"
                value={form.biggest_cost_other}
                onChange={(v) => update("biggest_cost_other", v)}
                required
                error={errors.biggest_cost_other}
                fieldId="biggest_cost_other"
              />
            )}
            <TextArea
              label="Q9: What have you already tried to fix that, and what happened?"
              helper="What you tried, for how long, and why it didn't work."
              example={'Example: "Hired an appointment setter for 2 months: lots of calls booked, almost none a fit. Bought a DM course: used the scripts for a week, they felt fake."'}
              value={form.attempted_fixes}
              onChange={(v) => update("attempted_fixes", v)}
              required
              error={errors.attempted_fixes}
              fieldId="attempted_fixes"
            />
          </FormStep>
        )}

        {currentStep === 3 && (
          <FormStep title="Who we're looking for" subtitle="This is what your monthly lead list is built from." direction={direction} stepKey={3}>
            <div data-field-id="example_profiles">
              <p className="block text-base font-medium text-brand-white mb-2">
                Q10: Paste the LinkedIn links of 3 to 5 people you&rsquo;d love as clients
                <span className="text-brand-yellow ml-1">*</span>
              </p>
              <p className="text-sm text-brand-muted mb-2.5 leading-relaxed">
                Past clients you&rsquo;d clone, or people you&rsquo;ve never spoken to who&rsquo;d be perfect. Add a few words on why for each.
              </p>
              <p className="text-sm text-brand-muted/80 italic mb-3">
                Example: linkedin.com/in/example-name, &ldquo;past client, perfect fit, did the work&rdquo;.
              </p>
              {renderProfileRows("example_profiles", 5, 3)}
              {errors.example_profiles && <p className="mt-1.5 text-sm text-red-400">{errors.example_profiles}</p>}
            </div>
            <div data-field-id="similar_sellers">
              <p className="block text-base font-medium text-brand-white mb-2">
                Q10b: Paste the LinkedIn links of 1 to 3 people who sell something like you do (optional)
              </p>
              <p className="text-sm text-brand-muted mb-3 leading-relaxed">
                People you rate, or people your clients compare you with. I&rsquo;ll look at how they describe themselves and what their audience responds to.
              </p>
              {renderProfileRows("similar_sellers", 3, 1)}
            </div>
            <fieldset>
              <legend className="block text-base font-medium text-brand-white mb-2">
                Q11: Who should I be finding for you?<span className="text-brand-yellow ml-1">*</span>
              </legend>
              <p className="text-sm text-brand-muted/80 italic mb-3">
                Example: Titles: owner, founder, managing director. Size: 2 to 20 staff, no solo freelancers. Where: UK, mainly the North West. Yes: IT services, accountancy. No: retail, hospitality.
              </p>
              <div className="space-y-4">
                <TextInput label="Job titles (as they write them on LinkedIn, in any language)" value={form.who_titles} onChange={(v) => update("who_titles", v)} required error={errors.who_titles} fieldId="who_titles" />
                <TextInput label="How many staff, and do people who work alone count?" value={form.who_size} onChange={(v) => update("who_size", v)} required error={errors.who_size} fieldId="who_size" />
                <TextInput label="Country and region" value={form.who_location} onChange={(v) => update("who_location", v)} required error={errors.who_location} fieldId="who_location" />
                <TextInput label="Industries you want, and ones you don't" value={form.who_industries} onChange={(v) => update("who_industries", v)} required error={errors.who_industries} fieldId="who_industries" />
              </div>
            </fieldset>
            <TextArea
              label="Q12: Are there any signs on someone's LinkedIn that tell you they might need you?"
              helper='Optional. If nothing comes to mind, write "not sure" and move on.'
              example={'Example: "They posted every week, then stopped two months ago." / "They\'ve just announced a new offer." / "They\'re hiring their first salesperson."'}
              value={form.buying_signals}
              onChange={(v) => update("buying_signals", v)}
              fieldId="buying_signals"
            />
            <TextArea
              label="Q13: Who must NOT be on your list?"
              helper="Names, companies or rules."
              example={'Example: "My current and past clients (I\'ll send a list). Anyone at [a competitor]. Clients of the agency I freelance for."'}
              value={form.exclusions}
              onChange={(v) => update("exclusions", v)}
              fieldId="exclusions"
            />
            <fieldset>
              <legend className="block text-base font-medium text-brand-white mb-2">
                Q14: How much time, and how many people?<span className="text-brand-yellow ml-1">*</span>
              </legend>
              <p className="text-sm text-brand-muted mb-3 leading-relaxed">
                Be honest: fifteen you follow up beats fifty you don&rsquo;t. This sets the size of your list. Example: 3 hours a week, about 15 new people a month.
              </p>
              <div className="space-y-3">
                <NumberInput compact label="Hours a week finding and messaging new people" value={form.hours_per_week} onChange={(v) => update("hours_per_week", v)} step={0.5} max={80} error={errors.hours_per_week} fieldId="hours_per_week" />
                <NumberInput compact label="New people a month you can properly follow up" value={form.people_per_month} onChange={(v) => update("people_per_month", v)} error={errors.people_per_month} fieldId="people_per_month" />
              </div>
            </fieldset>
            <CheckboxGroup
              label="Q15: What do you use for LinkedIn today?"
              helper="Tick all that apply. Your monthly lead list comes as an Excel file."
              options={LINKEDIN_TOOL_OPTIONS}
              values={form.linkedin_tools}
              onChange={(v) => update("linkedin_tools", v)}
              fieldId="linkedin_tools"
            />
            {(form.linkedin_tools.includes("An inbox tool") || form.linkedin_tools.includes("A CRM")) && (
              <TextInput
                label="Which inbox tool or CRM?"
                example={'Example: "Kondo for my inbox. No CRM."'}
                value={form.linkedin_tools_detail}
                onChange={(v) => update("linkedin_tools_detail", v)}
                fieldId="linkedin_tools_detail"
              />
            )}
          </FormStep>
        )}

        {currentStep === 4 && (
          <FormStep title="How you message" direction={direction} stepKey={4}>
            <CheckboxGroup
              label="Q16: Which languages do you write your LinkedIn messages in?"
              helper="Tick every one you use."
              options={[...LANGUAGE_OPTIONS, "Other"]}
              values={form.selected_languages}
              onChange={(v) => {
                update("selected_languages", v);
                if (v.includes("Other") && form.other_languages.length === 0) update("other_languages", [""]);
              }}
              required
              error={errors.languages}
              fieldId="languages"
            />
            {form.selected_languages.includes("Other") && (
              <div className="space-y-2">
                {form.other_languages.map((l, i) => (
                  <input
                    key={i}
                    aria-label={`Other language ${i + 1}`}
                    value={l}
                    onChange={(e) =>
                      update(
                        "other_languages",
                        form.other_languages.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                    placeholder="Type the language"
                    className={inputClass}
                  />
                ))}
                {form.other_languages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => update("other_languages", [...form.other_languages, ""])}
                    className="text-sm font-semibold text-brand-yellow hover:underline"
                  >
                    + Add another language
                  </button>
                )}
              </div>
            )}
            {langs.length > 1 && (
              <TextArea
                label="Who do you write to in each language?"
                example={'Example: "Dutch for Dutch business owners, English for anyone international."'}
                value={form.language_split}
                onChange={(v) => update("language_split", v)}
                fieldId="language_split"
              />
            )}
            {langs
              .filter((l) => l !== "English")
              .map((l) => {
                const opts = formalityFor(l);
                const key = `formality_${l}`;
                const label = `In ${l}, how formal is your first message to someone you don't know yet?`;
                return (
                  <div key={l} className="space-y-3">
                    {opts ? (
                      <Dropdown
                        label={label}
                        options={opts}
                        value={form.formality[l] ?? ""}
                        onChange={(v) => update("formality", { ...form.formality, [l]: v })}
                        required
                        error={errors[key]}
                        fieldId={key}
                      />
                    ) : (
                      <TextInput
                        label={label}
                        example={'Example: "Formal until they reply informally."'}
                        value={form.formality[l] ?? ""}
                        onChange={(v) => update("formality", { ...form.formality, [l]: v })}
                        required
                        error={errors[key]}
                        fieldId={key}
                      />
                    )}
                    {opts && (form.formality[l] ?? "").startsWith("It depends") && (
                      <TextInput
                        label="Say how it depends"
                        example={'Example: "Formal until they switch to informal."'}
                        value={form.formality_note[l] ?? ""}
                        onChange={(v) => update("formality_note", { ...form.formality_note, [l]: v })}
                        fieldId={`formality_note_${l}`}
                      />
                    )}
                  </div>
                );
              })}
            {langs.some((l) => l !== "English") && (
              <Dropdown
                label="When I suggest a reply in a language other than English, how do you want it?"
                options={[...REPLY_FORMAT_OPTIONS]}
                value={form.reply_format}
                onChange={(v) => update("reply_format", v)}
                required
                error={errors.reply_format}
                fieldId="reply_format"
              />
            )}
            <fieldset>
              <legend className="block text-base font-medium text-brand-white mb-2">
                Q17: Copy and paste 3 real LinkedIn messages you&rsquo;ve sent, exactly as written<span className="text-brand-yellow ml-1">*</span>
              </legend>
              <p className="text-sm text-brand-muted mb-3 leading-relaxed">In your own language, don&rsquo;t translate. Take names out if you like.</p>
              <div className="space-y-4">
                <TextArea
                  label="(1) The first message you usually send a new connection"
                  example={'Example: "Hi Sam, thanks for connecting. What made you reach out?"'}
                  value={form.msg_first}
                  onChange={(v) => update("msg_first", v)}
                  required
                  error={errors.msg_first}
                  fieldId="msg_first"
                />
                <TextArea label="(2) One that got a good reply" value={form.msg_good} onChange={(v) => update("msg_good", v)} required error={errors.msg_good} fieldId="msg_good" />
                <TextArea label="(3) One that went nowhere" value={form.msg_nowhere} onChange={(v) => update("msg_nowhere", v)} required error={errors.msg_nowhere} fieldId="msg_nowhere" />
              </div>
            </fieldset>
            <TextArea
              label="Q18: Which 2 or 3 LinkedIn conversations happening right now would you like help with?"
              helper="For each: who they are (initials and what they do), what they last said, and what you're unsure about."
              example={'Example: "S., runs a 10-person design agency. Last said \'sounds interesting, let\'s talk in the new year\'. I don\'t know whether to follow up now or wait."'}
              value={form.live_conversations}
              onChange={(v) => update("live_conversations", v)}
              fieldId="live_conversations"
            />
          </FormStep>
        )}

        {currentStep === 5 && (
          <FormStep title="Proof, and where clients come from" direction={direction} stepKey={5}>
            <TextArea
              label="Q19: List your 3 to 5 best client results"
              helper="For each: what kind of client, what changed, and numbers if you have them. No names needed."
              example={'Example: "Solo coach, no clients from LinkedIn before: 4 new clients in 3 months." / "8-person agency: raised their prices 30% and kept every client."'}
              value={form.client_results}
              onChange={(v) => update("client_results", v)}
              fieldId="client_results"
            />
            <fieldset>
              <legend className="block text-base font-medium text-brand-white mb-2">
                Q20: Of your last 10 clients, roughly how many came from each source?
              </legend>
              <p className="text-sm text-brand-muted mb-3 leading-relaxed">
                Rough is fine. If you&rsquo;ve had fewer than 10 clients, count them all. Example: Referral 6, Events 2, LinkedIn message 1, Website 1.
              </p>
              <div className="space-y-3">
                {SOURCE_ITEMS.map((s) => (
                  <NumberInput
                    key={s.key}
                    compact
                    label={s.label}
                    value={form.sources[s.key]}
                    onChange={(v) => update("sources", { ...form.sources, [s.key]: v })}
                    fieldId={`source_${s.key}`}
                  />
                ))}
                {toNumber(form.sources.other) ? (
                  <TextInput
                    label="What was the other source?"
                    value={form.sources_other_label}
                    onChange={(v) => update("sources_other_label", v)}
                    fieldId="sources_other_label"
                  />
                ) : null}
              </div>
            </fieldset>
          </FormStep>
        )}

        {currentStep === 6 && (
          <FormStep title="Where you want to be" direction={direction} stepKey={6}>
            <TextArea
              label={'Q21: At the end of our first month, what would have to have happened for you to say "that was worth it"?'}
              helper="Something we could both check. I'll plan the first four weeks around it."
              example={'Example: "I\'ve had 3 real conversations with new people and booked 1 call." / "I\'ve got a first message I\'m not embarrassed to send."'}
              value={form.first_month_win}
              onChange={(v) => update("first_month_win", v)}
              required
              error={errors.first_month_win}
              fieldId="first_month_win"
            />
            <TextArea
              label="Q22: What would you like to be true 90 days from now?"
              helper={'Numbers we\'d both know were hit or missed. "More leads" can\'t be checked.'}
              example={'Example: "4 calls a month from LinkedIn and 2 new clients at my new price."'}
              value={form.ninety_day}
              onChange={(v) => update("ninety_day", v)}
              required
              error={errors.ninety_day}
              fieldId="ninety_day"
            />
            <TextArea
              label="Q23: Your LinkedIn About section shows the version of you that you want prospects to see, and that's how it should be. Now imagine adding one honest paragraph to it: who you really are, how you feel about your work right now, and how the business is really going. What would it say?"
              helper="Optional. Only I read this, and it never goes anywhere public. Write it the way you'd say it to a friend. A few lines is plenty."
              example={'Example: "Most weeks I love the work. But two clients pay most of the bills and that scares me. I\'m better at this than my price says, and I know it. I just hate feeling like I\'m selling."'}
              value={form.honest_about}
              onChange={(v) => update("honest_about", v)}
              fieldId="honest_about"
            />
            <TextArea
              label="Q24: Anything else I should know, including dates you're away or very busy?"
              helper="The bit you nearly didn't write down is often the most useful."
              example={'Example: "Away 20 Dec to 6 Jan. My biggest client takes most of my time in March."'}
              value={form.anything_else}
              onChange={(v) => update("anything_else", v)}
              fieldId="anything_else"
            />
          </FormStep>
        )}

        {currentStep === 7 && (
          <FormStep title="Invoice details" subtitle="So your invoices are right for your accountant." direction={direction} stepKey={7}>
            <TextInput
              label="Business name, as it should appear on your invoices"
              value={form.inv_business_name}
              onChange={(v) => update("inv_business_name", v)}
              required
              error={errors.inv_business_name}
              fieldId="inv_business_name"
            />
            <Dropdown
              label="Country your business is registered in"
              options={VAT_COUNTRY_NAMES}
              value={form.inv_country}
              onChange={(v) => {
                update("inv_country", v);
                update("inv_vat_number", "");
              }}
              required
              error={errors.inv_country}
              fieldId="inv_country"
            />
            {form.inv_country === "Other" && (
              <TextInput
                label="Type your country"
                value={form.inv_country_other}
                onChange={(v) => update("inv_country_other", v)}
                required
                error={errors.inv_country_other}
                fieldId="inv_country_other"
              />
            )}
            {vatCountry?.asks && (
              <Dropdown
                label={`Is your business registered for ${vatCountry.taxName}?`}
                options={["Yes", "No"]}
                value={form.inv_vat_registered === "yes" ? "Yes" : form.inv_vat_registered === "no" ? "No" : ""}
                onChange={(v) => update("inv_vat_registered", v === "Yes" ? "yes" : v === "No" ? "no" : "")}
                required
                error={errors.inv_vat_registered}
                fieldId="inv_vat_registered"
              />
            )}
            {vatCountry?.asks && form.inv_vat_registered === "yes" && (
              <TextInput
                label={`Your ${vatCountry.taxName}`}
                placeholder={vatCountry.example}
                helper={vatCountry.example ? `It should look like ${vatCountry.example}` : undefined}
                value={form.inv_vat_number}
                onChange={(v) => update("inv_vat_number", v)}
                required
                error={errors.inv_vat_number}
                fieldId="inv_vat_number"
              />
            )}
          </FormStep>
        )}
      </main>

      {missingDetail.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="missing-fields-title"
          onClick={dismissMissing}
        >
          <div
            className="bg-brand-black border border-brand-yellow/60 rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="missing-fields-title" className="text-xl sm:text-2xl font-bold text-brand-yellow mb-3">
              {serverProblem ? "That didn't go through" : "Please check these"}
            </h3>
            {!serverProblem && (
              <p className="text-brand-muted text-sm sm:text-base mb-4">
                Questions marked <span className="text-brand-yellow font-bold">*</span> are required. If a longer answer is short and you
                genuinely have nothing to add, tick the box to continue.
              </p>
            )}
            <ul className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1">
              {missingDetail.map((item, i) => (
                <li key={i} className="text-brand-white text-sm sm:text-base flex gap-2">
                  <span className="text-brand-yellow shrink-0">•</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            {allShort && (
              <label className="flex items-start gap-3 mb-5 cursor-pointer select-none p-3 rounded-lg border border-brand-green/30 hover:border-brand-green/60">
                <input
                  type="checkbox"
                  checked={acceptShort}
                  onChange={(e) => setAcceptShort(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-brand-yellow shrink-0"
                />
                <span className="text-brand-white text-sm sm:text-base leading-snug">
                  I&rsquo;ve shared everything I can on these. Let me continue.
                </span>
              </label>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                ref={modalButtonRef}
                type="button"
                onClick={dismissMissing}
                className="px-6 py-3 rounded-lg border border-brand-green text-brand-white font-semibold hover:bg-brand-green/20"
              >
                Take me there
              </button>
              {allShort && (
                <Button onClick={continueAnyway} disabled={!acceptShort}>
                  Continue anyway
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-brand-black/90 backdrop-blur-md border-t border-brand-green/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            {currentStep > 0 && (
              <Button variant="secondary" onClick={() => goTo(currentStep - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-muted hidden sm:block">
              Step {currentStep + 1} of {STEP_LABELS.length}
            </span>
            {currentStep < LAST_STEP ? (
              <Button onClick={goNext}>Next</Button>
            ) : (
              <Button onClick={() => void handleSubmit()} loading={submitting}>
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
