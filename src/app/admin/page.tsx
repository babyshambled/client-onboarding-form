"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/Button";

const ADMIN_PASSWORD = "darren2024";

const SLIDER_LABELS = [
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

interface Submission {
  id: string;
  name: string;
  email: string;
  business_description: string;
  problems_solved: string;
  current_clients: string;
  ideal_client: string;
  pricing_structure: string;
  rating_ideal_client_clarity: number;
  rating_articulation: number;
  rating_inbound_leads: number;
  rating_dm_confidence: number;
  rating_dm_to_call: number;
  rating_objection_handling: number;
  rating_close_rate: number;
  rating_content_conversations: number;
  rating_dm_system: number;
  rating_expert_positioning: number;
  biggest_cost: string;
  biggest_cost_other?: string;
  attempted_fixes: string;
  top_3_client_problems: string;
  client_false_beliefs: string;
  ninety_day_success: string;
  anything_else: string;
  created_at: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/submissions", {
        headers: { "x-admin-password": ADMIN_PASSWORD },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchSubmissions();
    }
  }, [authenticated, fetchSubmissions]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  };

  const getRatingsArray = (sub: Submission): number[] => [
    sub.rating_ideal_client_clarity,
    sub.rating_articulation,
    sub.rating_inbound_leads,
    sub.rating_dm_confidence,
    sub.rating_dm_to_call,
    sub.rating_objection_handling,
    sub.rating_close_rate,
    sub.rating_content_conversations,
    sub.rating_dm_system,
    sub.rating_expert_positioning,
  ];

  const generatePDF = async (sub: Submission) => {
    const { default: jsPDF } = await import("jspdf");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPageBreak = (needed: number) => {
      if (y + needed > 270) {
        doc.addPage();
        y = 20;
      }
    };

    // Header bar
    doc.setFillColor(2, 66, 40); // #024228
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Client Onboarding - ${sub.name}`, margin, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const dateStr = new Date(sub.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    doc.text(dateStr, pageWidth - margin, 18, { align: "right" });

    y = 40;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Email: ${sub.email}`, margin, y);
    y += 10;

    // Helper to add a section
    const addSection = (title: string) => {
      checkPageBreak(15);
      doc.setFillColor(249, 236, 0); // #F9EC00
      doc.rect(margin, y, contentWidth, 0.5, "F");
      y += 5;
      doc.setTextColor(249, 236, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, y);
      y += 8;
    };

    const addQA = (question: string, answer: string) => {
      checkPageBreak(20);
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const qLines = doc.splitTextToSize(question, contentWidth);
      doc.text(qLines, margin, y);
      y += qLines.length * 4 + 2;

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      const aLines = doc.splitTextToSize(answer || "Not answered", contentWidth);
      // Check if we need a page break for the answer
      checkPageBreak(aLines.length * 5 + 5);
      doc.text(aLines, margin, y);
      y += aLines.length * 5 + 6;
    };

    // Section 1
    addSection("About You & Your Business");
    addQA("What does your business do?", sub.business_description);
    addQA("What specific problems do you solve?", sub.problems_solved);
    addQA("Who are the people you work with?", sub.current_clients);
    addQA("Describe your IDEAL client", sub.ideal_client);
    addQA("What do you charge and how is your offer structured?", sub.pricing_structure);

    // Section 2 - Sliders
    addSection("Self Assessment Ratings");
    const ratings = getRatingsArray(sub);
    if (ratings.length > 0) {
      ratings.forEach((val, i) => {
        checkPageBreak(8);
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const label = SLIDER_LABELS[i] || `Question ${i + 1}`;
        const labelLines = doc.splitTextToSize(label, contentWidth - 25);
        doc.text(labelLines, margin, y);

        doc.setTextColor(249, 236, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${val}/5`, pageWidth - margin, y, { align: "right" });
        y += labelLines.length * 4 + 4;
      });
      y += 2;
    }

    // Section 3
    addSection("Pain Points");
    addQA(
      "Biggest thing costing you money",
      sub.biggest_cost === "Something else" && sub.biggest_cost_other
        ? `Something else: ${sub.biggest_cost_other}`
        : sub.biggest_cost
    );
    addQA("What have you tried to fix this?", sub.attempted_fixes);

    // Section 4
    addSection("Your Prospects' World");
    addQA("Top 3 problems your ideal clients come to you with", sub.top_3_client_problems);
    addQA("False belief before working with you", sub.client_false_beliefs);

    // Section 5
    addSection("Where You Want To Be");
    addQA("Success 90 days from now", sub.ninety_day_success);
    addQA("Anything else", sub.anything_else);

    // Set PDF background to dark
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(10, 10, 10); // #0A0A0A
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");
    }

    // Redraw content — jsPDF doesn't support layer ordering easily,
    // so we'll regenerate with background first approach
    // Actually, let's use a simpler approach: white background PDF for readability
    // Regenerate with clean white background
    const cleanDoc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = cleanDoc.internal.pageSize.getWidth();
    const m = 20;
    const cw = pw - m * 2;
    let cy = 20;

    const checkPB = (needed: number) => {
      if (cy + needed > 270) {
        cleanDoc.addPage();
        cy = 20;
      }
    };

    // Header
    cleanDoc.setFillColor(2, 66, 40);
    cleanDoc.rect(0, 0, pw, 30, "F");
    cleanDoc.setTextColor(255, 255, 255);
    cleanDoc.setFontSize(16);
    cleanDoc.setFont("helvetica", "bold");
    cleanDoc.text(`Client Onboarding - ${sub.name}`, m, 18);
    cleanDoc.setFontSize(9);
    cleanDoc.setFont("helvetica", "normal");
    cleanDoc.text(dateStr, pw - m, 18, { align: "right" });

    cy = 40;
    cleanDoc.setTextColor(100, 100, 100);
    cleanDoc.setFontSize(9);
    cleanDoc.text(`Email: ${sub.email}`, m, cy);
    cy += 10;

    const addSec = (title: string) => {
      checkPB(15);
      cleanDoc.setDrawColor(2, 66, 40);
      cleanDoc.setLineWidth(0.5);
      cleanDoc.line(m, cy, m + cw, cy);
      cy += 5;
      cleanDoc.setTextColor(2, 66, 40);
      cleanDoc.setFontSize(12);
      cleanDoc.setFont("helvetica", "bold");
      cleanDoc.text(title, m, cy);
      cy += 8;
    };

    const addQ = (question: string, answer: string) => {
      checkPB(20);
      cleanDoc.setTextColor(120, 120, 120);
      cleanDoc.setFontSize(9);
      cleanDoc.setFont("helvetica", "normal");
      const ql = cleanDoc.splitTextToSize(question, cw);
      cleanDoc.text(ql, m, cy);
      cy += ql.length * 4 + 2;

      cleanDoc.setTextColor(30, 30, 30);
      cleanDoc.setFontSize(10);
      const al = cleanDoc.splitTextToSize(answer || "Not answered", cw);
      checkPB(al.length * 5 + 5);
      cleanDoc.text(al, m, cy);
      cy += al.length * 5 + 6;
    };

    addSec("About You & Your Business");
    addQ("What does your business do?", sub.business_description);
    addQ("What specific problems do you solve?", sub.problems_solved);
    addQ("Who are the people you work with?", sub.current_clients);
    addQ("Describe your IDEAL client", sub.ideal_client);
    addQ("What do you charge and how is your offer structured?", sub.pricing_structure);

    addSec("Self Assessment Ratings");
    const cleanRatings = getRatingsArray(sub);
    if (cleanRatings.length > 0) {
      cleanRatings.forEach((val, i) => {
        checkPB(8);
        cleanDoc.setTextColor(80, 80, 80);
        cleanDoc.setFontSize(9);
        cleanDoc.setFont("helvetica", "normal");
        const label = SLIDER_LABELS[i] || `Question ${i + 1}`;
        const ll = cleanDoc.splitTextToSize(label, cw - 25);
        cleanDoc.text(ll, m, cy);

        cleanDoc.setTextColor(2, 66, 40);
        cleanDoc.setFontSize(11);
        cleanDoc.setFont("helvetica", "bold");
        cleanDoc.text(`${val}/5`, pw - m, cy, { align: "right" });
        cy += ll.length * 4 + 4;
      });
      cy += 2;
    }

    addSec("Pain Points");
    addQ(
      "Biggest thing costing you money",
      sub.biggest_cost === "Something else" && sub.biggest_cost_other
        ? `Something else: ${sub.biggest_cost_other}`
        : sub.biggest_cost
    );
    addQ("What have you tried to fix this?", sub.attempted_fixes);

    addSec("Your Prospects' World");
    addQ("Top 3 problems your ideal clients come to you with", sub.top_3_client_problems);
    addQ("False belief before working with you", sub.client_false_beliefs);

    addSec("Where You Want To Be");
    addQ("Success 90 days from now", sub.ninety_day_success);
    addQ("Anything else", sub.anything_else);

    cleanDoc.save(`onboarding-${sub.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-bold text-brand-white mb-6 text-center">
            Admin Access
          </h1>
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-brand-black border border-brand-green/40 rounded-lg text-brand-white placeholder:text-brand-muted/50 focus:border-brand-yellow"
              />
              {passwordError && (
                <p className="mt-1 text-xs text-red-400">{passwordError}</p>
              )}
            </div>
            <Button onClick={handleLogin}>
              Access Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <header className="border-b border-brand-green/20 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-brand-white">
            Submissions Dashboard
          </h1>
          <span className="text-xs text-brand-muted">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-brand-muted">Loading...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-brand-muted">
            No submissions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id;
              const date = new Date(sub.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={sub.id}
                  className="border border-brand-green/30 rounded-lg overflow-hidden"
                >
                  {/* Summary row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : sub.id)
                    }
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-brand-green/10 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-brand-white truncate">
                          {sub.name}
                        </span>
                        <span className="text-xs text-brand-muted hidden sm:block">
                          {sub.email}
                        </span>
                      </div>
                      <div className="text-xs text-brand-muted mt-0.5">
                        {date}
                        {sub.biggest_cost && (
                          <span className="ml-3 text-brand-yellow">
                            Pain: {sub.biggest_cost}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-brand-muted transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-brand-green/20 px-5 py-5 space-y-5 bg-brand-black/50">
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          onClick={() => generatePDF(sub)}
                        >
                          Download PDF
                        </Button>
                      </div>

                      <DetailSection title="About You & Your Business">
                        <DetailItem label="Business" value={sub.business_description} />
                        <DetailItem label="Problems Solved" value={sub.problems_solved} />
                        <DetailItem label="Current Clients" value={sub.current_clients} />
                        <DetailItem label="Ideal Client" value={sub.ideal_client} />
                        <DetailItem label="Pricing & Structure" value={sub.pricing_structure} />
                      </DetailSection>

                      <DetailSection title="Self Assessment">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {getRatingsArray(sub).map((val, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-brand-yellow font-bold min-w-[2ch]">
                                {val}/5
                              </span>
                              <span className="text-brand-muted text-xs">
                                {SLIDER_LABELS[i]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </DetailSection>

                      <DetailSection title="Pain Points">
                        <DetailItem
                          label="Biggest Cost"
                          value={
                            sub.biggest_cost === "Something else" && sub.biggest_cost_other
                              ? `Something else: ${sub.biggest_cost_other}`
                              : sub.biggest_cost
                          }
                        />
                        <DetailItem label="What's Been Tried" value={sub.attempted_fixes} />
                      </DetailSection>

                      <DetailSection title="Your Prospects' World">
                        <DetailItem label="Top 3 Problems" value={sub.top_3_client_problems} />
                        <DetailItem label="False Belief" value={sub.client_false_beliefs} />
                      </DetailSection>

                      <DetailSection title="Goals">
                        <DetailItem label="90-Day Success" value={sub.ninety_day_success} />
                        <DetailItem label="Anything Else" value={sub.anything_else} />
                      </DetailSection>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-yellow mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-brand-muted block mb-0.5">{label}</span>
      <p className="text-sm text-brand-white whitespace-pre-wrap">
        {value || "Not answered"}
      </p>
    </div>
  );
}
