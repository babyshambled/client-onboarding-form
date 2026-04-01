"use client";

import { useState, useEffect, useCallback } from "react";
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
  q1_business: string;
  q2_problems: string;
  q3_current_clients: string;
  q4_ideal_client: string;
  q5_pricing: string;
  sliders: number[];
  q7_biggest_cost: string;
  q7_other: string;
  q8_tried: string;
  q9_top_problems: string;
  q10_false_belief: string;
  q11_success_90: string;
  q12_anything_else: string;
}

const defaultFormData: FormData = {
  name: "",
  email: "",
  q1_business: "",
  q2_problems: "",
  q3_current_clients: "",
  q4_ideal_client: "",
  q5_pricing: "",
  sliders: Array(10).fill(3),
  q7_biggest_cost: "",
  q7_other: "",
  q8_tried: "",
  q9_top_problems: "",
  q10_false_belief: "",
  q11_success_90: "",
  q12_anything_else: "",
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
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
    if (!validateStep(currentStep)) return;
    setSubmitting(true);

    try {
      // Transform frontend field names to match backend Zod schema
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
        anything_else: formData.q12_anything_else,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Submission failed");

      localStorage.removeItem(STORAGE_KEY);
      window.location.href = "/thank-you";
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col">
      {/* Header */}
      <header className="border-b border-brand-green/20 py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-brand-white tracking-tight">
            Client Onboarding
          </h1>
        </div>
      </header>

      {/* Progress */}
      <ProgressBar currentStep={currentStep} />

      {/* Form body */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-32">
        {/* Step 1: About You & Your Business */}
        {currentStep === 0 && (
          <FormStep
            title="About You & Your Business"
            subtitle="Let&rsquo;s start with the basics about you and what you do."
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
              />
              <TextInput
                label="Email"
                value={formData.email}
                onChange={(v) => updateField("email", v)}
                type="email"
                placeholder="you@email.com"
                required
                error={errors.email}
              />
            </div>

            <TextArea
              label="Q1: What does your business do?"
              helper="Describe your core service/offer - not the tagline, the actual work you do with clients day-to-day."
              value={formData.q1_business}
              onChange={(v) => updateField("q1_business", v)}
            />
            <TextArea
              label="Q2: What specific problems do you solve for your clients?"
              helper="List every problem you help with. Think about what's actually broken in their world when they come to you."
              value={formData.q2_problems}
              onChange={(v) => updateField("q2_problems", v)}
            />
            <TextArea
              label="Q3: Who are the people you work with right now?"
              helper="Their job titles, industries, experience level, company size, typical situation when they find you."
              value={formData.q3_current_clients}
              onChange={(v) => updateField("q3_current_clients", v)}
            />
            <TextArea
              label="Q4: Now describe your IDEAL client - the one you'd clone if you could."
              helper="What makes them perfect? Their mindset, budget, urgency, stage of business, personality. What separates a dream client from a nightmare one?"
              value={formData.q4_ideal_client}
              onChange={(v) => updateField("q4_ideal_client", v)}
            />
            <TextArea
              label="Q5: What do you currently charge, and how is your offer structured?"
              helper="Price point(s), package structure, length of engagement, and how you deliver (1:1, group, done-for-you, hybrid, etc.)"
              value={formData.q5_pricing}
              onChange={(v) => updateField("q5_pricing", v)}
            />
          </FormStep>
        )}

        {/* Step 2: Self Assessment */}
        {currentStep === 1 && (
          <FormStep
            title="Rate Your Current Situation"
            subtitle="Rate yourself honestly on each area. 1 = struggling, 5 = confident."
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
              value={formData.q7_biggest_cost}
              onChange={(v) => updateField("q7_biggest_cost", v)}
              options={PAIN_OPTIONS}
            />
            {formData.q7_biggest_cost === "Something else" && (
              <TextInput
                label="Please specify"
                value={formData.q7_other}
                onChange={(v) => updateField("q7_other", v)}
                placeholder="What's costing you money?"
              />
            )}
            <TextArea
              label="Q8: What have you already tried to fix this, and why didn't it work?"
              value={formData.q8_tried}
              onChange={(v) => updateField("q8_tried", v)}
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
              helper="Not what you think they need - what THEY say when they first reach out."
              value={formData.q9_top_problems}
              onChange={(v) => updateField("q9_top_problems", v)}
            />
            <TextArea
              label="Q10: What does your ideal client typically say or believe before they work with you that turns out to be wrong?"
              helper="The false belief they hold about their problem or the solution."
              value={formData.q10_false_belief}
              onChange={(v) => updateField("q10_false_belief", v)}
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
              helper="Be specific - revenue, clients, pipeline, confidence, positioning."
              value={formData.q11_success_90}
              onChange={(v) => updateField("q11_success_90", v)}
            />
            <TextArea
              label="Q12: Is there anything else useful you think I should know about you, your business, your clients, or anything you've not mentioned?"
              value={formData.q12_anything_else}
              onChange={(v) => updateField("q12_anything_else", v)}
            />
          </FormStep>
        )}

        {/* Error message */}
        {errors.submit && (
          <p className="mt-4 text-sm text-red-400 text-center">{errors.submit}</p>
        )}
      </main>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-black/90 backdrop-blur-md border-t border-brand-green/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
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
