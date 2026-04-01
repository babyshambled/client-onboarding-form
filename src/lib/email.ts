import { Resend } from "resend";
import { jsPDF } from "jspdf";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SubmissionData {
  id: string;
  created_at: string;
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
}

const RATINGS = [
  { key: "rating_ideal_client_clarity", label: "Ideal client clarity" },
  { key: "rating_articulation", label: "Can articulate what I do" },
  { key: "rating_inbound_leads", label: "Inbound leads on LinkedIn" },
  { key: "rating_dm_confidence", label: "DM conversation confidence" },
  { key: "rating_dm_to_call", label: "DM to call conversion" },
  { key: "rating_objection_handling", label: "Objection handling" },
  { key: "rating_close_rate", label: "Close rate satisfaction" },
  { key: "rating_content_conversations", label: "Content generates conversations" },
  { key: "rating_dm_system", label: "Repeatable DM system" },
  { key: "rating_expert_positioning", label: "Expert positioning" },
] as const;

function generatePDF(data: SubmissionData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  const addSectionHeader = (title: string) => {
    checkPage(20);
    doc.setFillColor(2, 66, 40); // #024228
    doc.rect(margin, y, contentWidth, 10, "F");
    doc.setTextColor(249, 236, 0); // #F9EC00
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 4, y + 7);
    doc.setTextColor(0, 0, 0);
    y += 16;
  };

  const addField = (label: string, value: string) => {
    checkPage(10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 66, 40);
    doc.text(label, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(value || "—", contentWidth);
    checkPage(lines.length * 4.5);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  };

  // Header
  doc.setFillColor(2, 66, 40);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(249, 236, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Client Onboarding", margin, 14);
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(data.name, margin, 23);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  const dateStr = new Date(data.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`${data.email}  |  ${dateStr}`, margin, 28);
  y = 40;

  // Section 1
  addSectionHeader("About You & Your Business");
  addField("What does your business do?", data.business_description);
  addField("What specific problems do you solve?", data.problems_solved);
  addField("Who do you work with right now?", data.current_clients);
  addField("Describe your IDEAL client", data.ideal_client);
  addField("Pricing & offer structure", data.pricing_structure);

  // Section 2 - Ratings
  addSectionHeader("Self Assessment (1-5)");
  checkPage(60);

  for (const rating of RATINGS) {
    const val = data[rating.key as keyof SubmissionData] as number;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(rating.label, margin, y);

    // Draw rating bar
    const barX = margin + 90;
    const barWidth = 50;
    const filledWidth = (val / 5) * barWidth;

    doc.setFillColor(220, 220, 220);
    doc.rect(barX, y - 3, barWidth, 4, "F");
    doc.setFillColor(249, 236, 0);
    doc.rect(barX, y - 3, filledWidth, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 66, 40);
    doc.text(`${val}/5`, barX + barWidth + 4, y);
    y += 7;
    checkPage(7);
  }
  y += 4;

  // Section 3
  addSectionHeader("Pain Points");
  const costText =
    data.biggest_cost === "Something else"
      ? `Something else: ${data.biggest_cost_other || "—"}`
      : data.biggest_cost;
  addField("Biggest thing costing you money", costText);
  addField("What have you tried & why didn't it work?", data.attempted_fixes);

  // Section 4
  addSectionHeader("Your Prospects' World");
  addField("Top 3 problems your clients come to you with", data.top_3_client_problems);
  addField("False beliefs your clients hold", data.client_false_beliefs);

  // Section 5
  addSectionHeader("Where You Want To Be");
  addField("Success in 90 days", data.ninety_day_success);
  addField("Anything else", data.anything_else);

  return Buffer.from(doc.output("arraybuffer"));
}

export async function sendSubmissionEmail(data: SubmissionData) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "placeholder") {
    console.log("Email not configured — skipping notification");
    return;
  }

  const pdfBuffer = generatePDF(data);
  const fileName = `Onboarding_${data.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date(data.created_at).toISOString().slice(0, 10)}.pdf`;

  // Calculate average rating
  const ratings = RATINGS.map((r) => data[r.key as keyof SubmissionData] as number);
  const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);

  await resend.emails.send({
    from: "Onboarding Form <onboarding@resend.dev>",
    to: notificationEmail,
    subject: `New Client Onboarding: ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #024228; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #F9EC00; margin: 0; font-size: 20px;">New Client Onboarding</h1>
          <p style="color: #ffffff; margin: 5px 0 0 0;">${data.name} &mdash; ${data.email}</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="color: #024228; margin-top: 0;">Quick Summary</h3>
          <p><strong>Business:</strong> ${data.business_description.substring(0, 200)}${data.business_description.length > 200 ? "..." : ""}</p>
          <p><strong>Biggest Pain:</strong> ${data.biggest_cost}${data.biggest_cost === "Something else" ? ` — ${data.biggest_cost_other}` : ""}</p>
          <p><strong>Avg Self-Rating:</strong> ${avgRating}/5</p>
          <p><strong>90-Day Goal:</strong> ${data.ninety_day_success.substring(0, 200)}${data.ninety_day_success.length > 200 ? "..." : ""}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
          <p style="color: #666; font-size: 13px;">Full onboarding PDF attached. View all submissions at your <a href="#">admin dashboard</a>.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
      },
    ],
  });
}
