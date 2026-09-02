"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProgressBar from "@/components/ProgressBar";
import FormStep from "@/components/FormStep";
import TextInput from "@/components/TextInput";
import TextArea from "@/components/TextArea";
import Slider from "@/components/Slider";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";

const STORAGE_KEY = "onboarding-form-data";

const SLIDER_QUESTIONS = [
  "I know exactly who my ideal client is",
  "I can articulate what I do in one clear sentence",
  "I consistently attract inbound leads on LinkedIn",
  "I'm confident starting DM conversations with strangers",
  "I can move a DM conversation toward a call without feeling salesy",
  "I handle objections on sales calls with confidence",
  "My close rate on calls is where I want it to be",
  "My LinkedIn content generates actual conversations (not just likes)",
  "I have a repeatable system for my DMs (not winging it)",
  "I position myself as the expert, not the one chasing",
];

const CAN_NAME_OPTIONS = [
  "Yes",
  "Only anonymised",
  "No - my work doesn't allow it",
];

const PAIN_OPTIONS = [
  "DMs",
  "Sales Calls",
  "Content",
  "Positioning",
  "All of the above",
  "Something else",
];

interface FormData {
  name: string;
  email: string;
  qA_their_word: string;
  qB_can_name: string;
  qB_rough_count: string;
  q1_business: string;
  q2_problems: string;
  q3_current_clients: string;
  q4_ideal_client: string;
  q5_pricing: string;
  q6_pre_ask: string;
  sliders: number[];
  q7_biggest_cost: string;
  q7_other: string;
  q8_tried: string;
  q9_top_problems: string;
  q10_false_belief: string;
  q11_success_90: string;
  q12_handover: string;
  q12_anything_else: string;
}

const defaultFormData: FormData = {
  name: "",
  email: "",
  qA_their_word: "",
  qB_can_name: "",
  qB_rough_count: "",
  q1_business: "",
  q2_problems: "",
  q3_current_clients: "",
  q4_ideal_client: "",
  q5_pricing: "",
  q6_pre_ask: "",
  sliders: Array(10).fill(3),
  q7_biggest_cost: "",
  q7_other: "",
  q8_tried: "",
  q9_top_problems: "",
  q10_false_belief: "",
  q11_success_90: "",
  q12_handover: "",
  q12_anything_else: "",
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [missingDetail, setMissingDetail] = useState<{ label: string; key: string; kind: "empty" | "short" }[]>([]);
  const [firstMissingKey, setFirstMissingKey] = useState<string | null>(null);
  const [acceptShort, setAcceptShort] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<"next" | "submit" | null>(null);
  const [acknowledgedShorts, setAcknowledgedShorts] = useState<string[]>([]);
  const softWarnedRef = useRef<Record<string, boolean>>({});

  const wordCount = (s: string) =>
    s.trim().split(/\s+/).filter(Boolean).length;

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData({ ...defaultFormData, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-save to localStorage
  const saveToStorage = useCallback((data: FormData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value };
        saveToStorage(next);
        return next;
      });
      // Clear error for this field
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [saveToStorage]
  );

  const updateSlider = useCallback(
    (index: number, value: number) => {
      setFormData((prev) => {
        const sliders = [...prev.sliders];
        sliders[index] = value;
        const next = { ...prev, sliders };
        saveToStorage(next);
        return next;
      });
    },
    [saveToStorage]
  );

  const STEP_REQUIRED: Record<
    number,
    { key: keyof FormData; label: string; minWords?: number }[]
  > = {
    0: [
      { key: "name", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "q1_business", label: "Q1: What does your business do?", minWords: 30 },
      { key: "q2_problems", label: "Q2: What specific problems do you solve?", minWords: 30 },
      { key: "q3_current_clients", label: "Q3: Who are the people you work with right now?", minWords: 30 },
      { key: "q4_ideal_client", label: "Q4: Describe your IDEAL client", minWords: 30 },
      { key: "q5_pricing", label: "Q5: What do you charge & how is your offer structured?" },
    ],
    1: [],
    2: [
      { key: "q7_biggest_cost", label: "Q7: What's the single biggest thing costing you money?" },
      { key: "q8_tried", label: "Q8: What have you already tried to fix this, and why didn't it work?", minWords: 30 },
    ],
    3: [
      { key: "q9_top_problems", label: "Q9: Top 3 problems your ideal clients come to you with", minWords: 30 },
      { key: "q10_false_belief", label: "Q10: What does your ideal client typically believe before working with you that turns out to be wrong?", minWords: 30 },
    ],
    4: [
      { key: "q11_success_90", label: "Q11: What would success look like 90 days from now?", minWords: 30 },
    ],
  };

  type MissingItem = { label: string; key: string; kind: "empty" | "short" };

  const collectMissing = (step: number): { detail: MissingItem[]; firstKey: string | null } => {
    const newErrors: Record<string, string> = {};
    const detail: MissingItem[] = [];
    let firstKey: string | null = null;

    for (const { key, label, minWords } of STEP_REQUIRED[step] ?? []) {
      const v = formData[key];
      if (typeof v !== "string") continue;

      if (!v.trim()) {
        newErrors[key] = "Required";
        detail.push({ label, key, kind: "empty" });
        if (!firstKey) firstKey = key;
        continue;
      }

      if (minWords) {
        const wc = wordCount(v);
        if (wc < minWords && !softWarnedRef.current[key]) {
          newErrors[key] = `Needs at least ${minWords} words (currently ${wc})`;
          detail.push({
            label: `${label} - at least ${minWords} words ideally (you have ${wc})`,
            key,
            kind: "short",
          });
          if (!firstKey) firstKey = key;
        }
      }
    }

    if (step === 0 && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
      if (!detail.some((d) => d.key === "email")) {
        detail.push({ label: "Email - invalid format", key: "email", kind: "empty" });
      }
      if (!firstKey) firstKey = "email";
    }

    if (step === 2 && formData.q7_biggest_cost === "Something else" && !formData.q7_other.trim()) {
      newErrors.q7_other = "Required";
      detail.push({ label: "Q7: Please specify what costs you money", key: "q7_other", kind: "empty" });
      if (!firstKey) firstKey = "q7_other";
    }

    setErrors(newErrors);
    return { detail, firstKey };
  };

  const scrollToField = (key: string) => {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field-id="${key}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>("input, textarea, select");
      input?.focus({ preventScroll: true });
    }, 50);
  };

  const dismissMissing = () => {
    const target = firstMissingKey;
    setMissingDetail([]);
    setAcceptShort(false);
    if (target) scrollToField(target);
  };

  const continueAnyway = () => {
    for (const item of missingDetail) {
      if (item.kind === "short") {
        softWarnedRef.current[item.key] = true;
        setAcknowledgedShorts((prev) =>
          prev.includes(item.key) ? prev : [...prev, item.key]
        );
      }
    }
    setMissingDetail([]);
    setAcceptShort(false);
    if (lastAttempt === "submit") {
      void handleSubmit();
    } else {
      goNext();
    }
  };

  const goNext = () => {
    const { detail, firstKey } = collectMissing(currentStep);
    if (detail.length > 0) {
      setMissingDetail(detail);
      setFirstMissingKey(firstKey);
      setLastAttempt("next");
      return;
    }
    if (currentStep < 4) {
      setDirection("right");
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection("left");
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    const allDetail: { label: string; key: string; kind: "empty" | "short" }[] = [];
    let firstMissingStep: number | null = null;
    let firstKey: string | null = null;
    for (let s = 0; s <= 4; s++) {
      const r = collectMissing(s);
      if (r.detail.length > 0) {
        allDetail.push(...r.detail);
        if (firstMissingStep === null) {
          firstMissingStep = s;
          firstKey = r.firstKey;
        }
      }
    }
    if (allDetail.length > 0) {
      setMissingDetail(allDetail);
      setFirstMissingKey(firstKey);
      setLastAttempt("submit");
      if (firstMissingStep !== null && firstMissingStep !== currentStep) {
        setDirection("left");
        setCurrentStep(firstMissingStep);
      }
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        business_description: formData.q1_business,
        problems_solved: formData.q2_problems,
        current_clients: formData.q3_current_clients,
        ideal_client: formData.q4_ideal_client,
        pricing_structure: formData.q5_pricing,
        rating_ideal_client_clarity: formData.sliders[0],
        rating_articulation: formData.sliders[1],
        rating_inbound_leads: formData.sliders[2],
        rating_dm_confidence: formData.sliders[3],
        rating_dm_to_call: formData.sliders[4],
        rating_objection_handling: formData.sliders[5],
        rating_close_rate: formData.sliders[6],
        rating_content_conversations: formData.sliders[7],
        rating_dm_system: formData.sliders[8],
        rating_expert_positioning: formData.sliders[9],
        biggest_cost: formData.q7_biggest_cost,
        biggest_cost_other: formData.q7_other || undefined,
        attempted_fixes: formData.q8_tried,
        top_3_client_problems: formData.q9_top_problems,
        client_false_beliefs: formData.q10_false_belief,
        ninety_day_success: formData.q11_success_90,
        anything_else: formData.q12_anything_else || undefined,
        their_word: formData.qA_their_word || undefined,
        can_name_clients: formData.qB_can_name || undefined,
        rough_client_count: formData.qB_rough_count || undefined,
        pre_conversation_ask: formData.q6_pre_ask || undefined,
        handover_asset: formData.q12_handover || undefined,
        acknowledged_short_answers: acknowledgedShorts,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const fieldErrors: Record<string, string[]> = body?.details?.fieldErrors ?? {};
        const messages = Object.entries(fieldErrors).flatMap(([k, v]) =>
          (v ?? []).map((m) => `${k}: ${m}`)
        );
        const fallback = [{ label: "Something went wrong. Please try again.", key: "submit", kind: "empty" as const }];
        setMissingDetail(
          messages.length > 0
            ? messages.map((m) => ({ label: m, key: "api", kind: "empty" as const }))
            : fallback
        );
        setSubmitting(false);
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      window.location.href = "/thank-you";
    } catch {
      setMissingDetail([
        { label: "Something went wrong. Please try again.", key: "submit", kind: "empty" },
      ]);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col">
      {/* Header */}
      <header className="border-b border-brand-green/20 py-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Darren Gibb"
            className="h-8 sm:h-10 w-auto mb-2"
          />
          <h1 className="text-lg font-semibold text-brand-white tracking-tight">
            Client Onboarding
          </h1>
        </div>
      </header>

      {/* Progress */}
      <ProgressBar currentStep={currentStep} />

      {/* Form body */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-32">
        {/* Step 1: About You & Your Business */}
        {currentStep === 0 && (
          <FormStep
            title="About You & Your Business"
            subtitle="Please be as detailed as you possibly can. The more information I have about you and your business, the better I can serve you."
            direction={direction}
            stepKey={0}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                label="Full Name"
                value={formData.name}
                onChange={(v) => updateField("name", v)}
                placeholder="Your name"
                required
                error={errors.name}
                fieldId="name"
              />
              <TextInput
                label="Email"
                value={formData.email}
                onChange={(v) => updateField("email", v)}
                type="email"
                placeholder="you@email.com"
                required
                error={errors.email}
                fieldId="email"
              />
            </div>

            <TextInput
              label="What do you call the people you work with?"
              helper="Clients, patients, customers, members, guests. I'll use your word from here on, in the sessions and in anything we write."
              value={formData.qA_their_word}
              onChange={(v) => updateField("qA_their_word", v)}
              placeholder="Clients"
              fieldId="qA_their_word"
            />
            <Dropdown
              label="Can you talk about them by name?"
              helper="Confidentiality, NDAs, regulated work. Say so now and you lose nothing - some of the best material comes from people who can't name names, because they have to describe the pattern instead."
              value={formData.qB_can_name}
              onChange={(v) => updateField("qB_can_name", v)}
              options={CAN_NAME_OPTIONS}
              fieldId="qB_can_name"
            />
            <TextInput
              label="Roughly how many have you worked with?"
              helper="Don't go and count. Nearest ten, or 'more than fifty', or 'about six' - all fine. There's no right answer to this one and it changes nothing."
              value={formData.qB_rough_count}
              onChange={(v) => updateField("qB_rough_count", v)}
              placeholder="About 30"
              fieldId="qB_rough_count"
            />

            <TextArea
              label="Q1: What does your business do?"
              helper="Not the tagline. The actual work, day to day. The tagline is the thing we're going to rebuild, so I need what's underneath it."
              value={formData.q1_business}
              onChange={(v) => updateField("q1_business", v)}
              required
              error={errors.q1_business}
              fieldId="q1_business"
            />
            <TextArea
              label="Q2: What specific problems do you solve for your clients?"
              helper="Every one you can think of, not just the headline. Nearly everything you post this year comes out of this list, so long and boring beats short and polished."
              value={formData.q2_problems}
              onChange={(v) => updateField("q2_problems", v)}
              required
              error={errors.q2_problems}
              fieldId="q2_problems"
            />
            <TextArea
              label="Q3: Who are the people you work with right now?"
              helper="The ones you actually have, not the ones you want. Titles, industries, size, and the state they're usually in when they find you."
              value={formData.q3_current_clients}
              onChange={(v) => updateField("q3_current_clients", v)}
              required
              error={errors.q3_current_clients}
              fieldId="q3_current_clients"
            />
            <TextArea
              label="Q4: Now describe your IDEAL client - the one you'd clone if you could."
              helper="Both halves, and the nightmare half matters more. Who you turn away is the most persuasive thing you can say in public, and almost nobody has ever written it down."
              value={formData.q4_ideal_client}
              onChange={(v) => updateField("q4_ideal_client", v)}
              required
              error={errors.q4_ideal_client}
              fieldId="q4_ideal_client"
            />
            <TextArea
              label="Q5: What do you currently charge, and how is your offer structured?"
              helper="The real numbers, structure and length. At some point you're going to put a price in public, and I can't help you do that if I'm guessing at it now."
              value={formData.q5_pricing}
              onChange={(v) => updateField("q5_pricing", v)}
              required
              error={errors.q5_pricing}
              fieldId="q5_pricing"
            />
            <TextArea
              label="Q6: What do you ask people to send you before you first speak to them?"
              helper="Specific and real - last twelve months, a client list, nothing at all. What you ask for before a conversation says more about you than anything on your website, and almost nobody ever tells people what it is."
              value={formData.q6_pre_ask}
              onChange={(v) => updateField("q6_pre_ask", v)}
              fieldId="q6_pre_ask"
            />
          </FormStep>
        )}

        {/* Step 2: Self Assessment */}
        {currentStep === 1 && (
          <FormStep
            title="Rate Your Current Situation"
            subtitle="1 = struggling, 5 = confident. Nobody scores themselves a five across the board, and I'd be suspicious if you did. The low ones tell me where we start, so be unkind to yourself."
            direction={direction}
            stepKey={1}
          >
            <div className="space-y-5">
              {SLIDER_QUESTIONS.map((q, i) => (
                <Slider
                  key={i}
                  label={`${i + 1}. ${q}`}
                  value={formData.sliders[i]}
                  onChange={(v) => updateSlider(i, v)}
                />
              ))}
            </div>
          </FormStep>
        )}

        {/* Step 3: Pain Points */}
        {currentStep === 2 && (
          <FormStep
            title="Your Pain Points"
            subtitle="Understanding what's holding you back helps us focus on what matters."
            direction={direction}
            stepKey={2}
          >
            <Dropdown
              label="Q7: What's the single biggest thing costing you money right now?"
              helper="The one that actually hurts, not the one that's easiest to admit. One, not three."
              value={formData.q7_biggest_cost}
              onChange={(v) => updateField("q7_biggest_cost", v)}
              options={PAIN_OPTIONS}
              required
              error={errors.q7_biggest_cost}
              fieldId="q7_biggest_cost"
            />
            {formData.q7_biggest_cost === "Something else" && (
              <TextInput
                label="Please specify"
                helper="What it is, and roughly what it's cost you so far. A number or a count of months if you've got one."
                value={formData.q7_other}
                onChange={(v) => updateField("q7_other", v)}
                placeholder="What's costing you money?"
                required
                error={errors.q7_other}
                fieldId="q7_other"
              />
            )}
            <TextArea
              label="Q8: What have you already tried to fix this, and why didn't it work?"
              helper="So I don't spend our first session suggesting things you tried two years ago. The failures are worth more to me than the wins."
              value={formData.q8_tried}
              onChange={(v) => updateField("q8_tried", v)}
              required
              error={errors.q8_tried}
              fieldId="q8_tried"
            />
          </FormStep>
        )}

        {/* Step 4: Your Prospects */}
        {currentStep === 3 && (
          <FormStep
            title="Your Prospects' World"
            subtitle="Let's get inside the head of the people you want to work with."
            direction={direction}
            stepKey={3}
          >
            <TextArea
              label="Q9: What are the top 3 problems your ideal clients come to you with?"
              helper="Their words, not your diagnosis. Copy them out of your inbox if you can - the phrasing people actually use is what makes a stranger stop scrolling."
              value={formData.q9_top_problems}
              onChange={(v) => updateField("q9_top_problems", v)}
              required
              error={errors.q9_top_problems}
              fieldId="q9_top_problems"
            />
            <TextArea
              label="Q10: What does your ideal client typically say or believe before they work with you that turns out to be wrong?"
              helper="The thing they're certain about that quietly costs them. A big chunk of your content comes from this one, so give me two or three if you have them."
              value={formData.q10_false_belief}
              onChange={(v) => updateField("q10_false_belief", v)}
              required
              error={errors.q10_false_belief}
              fieldId="q10_false_belief"
            />
          </FormStep>
        )}

        {/* Step 5: Your Goals */}
        {currentStep === 4 && (
          <FormStep
            title="Where You Want To Be"
            subtitle="Paint the picture of your ideal outcome."
            direction={direction}
            stepKey={4}
          >
            <TextArea
              label="Q11: What would success look like for you 90 days from now?"
              helper="Specific enough that we'd both know whether it happened. 'More leads' isn't checkable. 'Four calls a month from LinkedIn' is."
              value={formData.q11_success_90}
              onChange={(v) => updateField("q11_success_90", v)}
              required
              error={errors.q11_success_90}
              fieldId="q11_success_90"
            />
            <TextArea
              label="Q12: Is there anything you've built that you could hand somebody?"
              helper="A checklist, a one-page audit, the questions you always ask, a short video. It doesn't need to exist yet - if there's something you've explained forty times and thought 'I should write this down', that's the answer."
              value={formData.q12_handover}
              onChange={(v) => updateField("q12_handover", v)}
              fieldId="q12_handover"
            />
            <TextArea
              label="Q13: Is there anything else useful you think I should know about you, your business, your clients, or anything you've not mentioned?"
              helper="The bit you nearly didn't put down. That one is usually worth more than the rest of the form."
              value={formData.q12_anything_else}
              onChange={(v) => updateField("q12_anything_else", v)}
              fieldId="q12_anything_else"
            />
          </FormStep>
        )}

      </main>

      {/* Missing-fields modal */}
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
            <h3
              id="missing-fields-title"
              className="text-xl sm:text-2xl font-bold text-brand-yellow mb-3"
            >
              Please complete these questions
            </h3>
            <p className="text-brand-muted text-sm sm:text-base mb-4">
              Questions marked with{" "}
              <span className="text-brand-yellow font-bold">*</span> are required.
              For open-ended answers, aim for at least 30 words so I have enough to
              work with - but if you genuinely have nothing more to add, tick the
              box below to continue.
            </p>
            <ul className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1">
              {missingDetail.map((item, i) => (
                <li
                  key={i}
                  className="text-brand-white text-sm sm:text-base flex gap-2"
                >
                  <span className="text-brand-yellow shrink-0">•</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            {missingDetail.some((d) => d.kind === "short") && (
              <label className="flex items-start gap-3 mb-5 cursor-pointer select-none p-3 rounded-lg border border-brand-green/30 hover:border-brand-green/60 transition-colors">
                <input
                  type="checkbox"
                  checked={acceptShort}
                  onChange={(e) => setAcceptShort(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-brand-yellow shrink-0 cursor-pointer"
                />
                <span className="text-brand-white text-sm sm:text-base leading-snug">
                  I&rsquo;ve shared everything I can on the open-ended questions
                  above - let me continue.
                </span>
              </label>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="secondary" onClick={dismissMissing}>
                Take me there
              </Button>
              {missingDetail.some((d) => d.kind === "short") && (
                <Button onClick={continueAnyway} disabled={!acceptShort}>
                  Continue anyway
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-black/90 backdrop-blur-md border-t border-brand-green/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            {currentStep > 0 && (
              <Button variant="secondary" onClick={goBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-muted hidden sm:block">
              Step {currentStep + 1} of 5
            </span>
            {currentStep < 4 ? (
              <Button onClick={goNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
