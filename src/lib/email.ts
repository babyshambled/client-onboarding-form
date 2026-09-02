import { Resend } from "resend";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ROBOTO_REGULAR_BASE64 } from "./fonts/roboto-regular";
import { ROBOTO_BOLD_BASE64 } from "./fonts/roboto-bold";

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
  their_word?: string;
  can_name_clients?: string;
  rough_client_count?: string;
  pre_conversation_ask?: string;
  handover_asset?: string;
  acknowledged_short_answers?: string[];
}

const FIELD_KEY_TO_LABEL: Record<string, string> = {
  q1_business: "What does your business do?",
  q2_problems: "What specific problems do you solve?",
  q3_current_clients: "Who do you work with right now?",
  q4_ideal_client: "Describe your IDEAL client",
  q5_pricing: "Pricing & offer structure",
  q8_tried: "What have you tried & why didn't it work?",
  q9_top_problems: "Top 3 problems your clients come to you with",
  q10_false_belief: "False beliefs your clients hold",
  q11_success_90: "Success in 90 days",
};

const KEY_FOR_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_KEY_TO_LABEL).map(([k, v]) => [v, k])
);

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

async function generatePDF(data: SubmissionData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const robotoBytes = Buffer.from(ROBOTO_REGULAR_BASE64, "base64");
  const robotoBoldBytes = Buffer.from(ROBOTO_BOLD_BASE64, "base64");
  const fontRegular = await pdfDoc.embedFont(robotoBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(robotoBoldBytes, { subset: true });

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const HEADER_HEIGHT = 80;

  const GREEN = rgb(2 / 255, 66 / 255, 40 / 255);
  const YELLOW = rgb(249 / 255, 236 / 255, 0 / 255);
  const WHITE = rgb(1, 1, 1);
  const TEXT = rgb(40 / 255, 40 / 255, 40 / 255);
  const GREY = rgb(220 / 255, 220 / 255, 220 / 255);
  const SUBTLE = rgb(200 / 255, 200 / 255, 200 / 255);

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  // y is tracked from top of page (top = 0); convert at draw time
  let y = 0;

  // pdf-lib uses bottom-left origin. Convert "y from top" to pdf-lib y.
  const fromTop = (yt: number) => PAGE_HEIGHT - yt;

  const ensurePage = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = MARGIN;
    }
  };

  const wrap = (
    text: string,
    maxWidth: number,
    font: PDFFont,
    size: number
  ): string[] => {
    const paragraphs = text.split(/\n/);
    const lines: string[] = [];
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      const words = paragraph.split(/\s+/);
      let current = "";
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  // ─── Header banner ──────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: fromTop(HEADER_HEIGHT),
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    color: GREEN,
  });
  page.drawText("Client Onboarding", {
    x: MARGIN,
    y: fromTop(34),
    size: 22,
    font: fontBold,
    color: YELLOW,
  });
  page.drawText(data.name, {
    x: MARGIN,
    y: fromTop(54),
    size: 13,
    font: fontBold,
    color: WHITE,
  });
  const dateStr = new Date(data.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText(`${data.email}  |  ${dateStr}`, {
    x: MARGIN,
    y: fromTop(70),
    size: 9,
    font: fontRegular,
    color: SUBTLE,
  });

  y = HEADER_HEIGHT + 25;

  const acknowledged = new Set(data.acknowledged_short_answers ?? []);

  const drawSectionHeader = (title: string) => {
    ensurePage(40);
    const headerH = 22;
    page.drawRectangle({
      x: MARGIN,
      y: fromTop(y + headerH),
      width: CONTENT_WIDTH,
      height: headerH,
      color: GREEN,
    });
    page.drawText(title, {
      x: MARGIN + 10,
      y: fromTop(y + 15),
      size: 12,
      font: fontBold,
      color: YELLOW,
    });
    y += headerH + 12;
  };

  const drawField = (label: string, value?: string) => {
    ensurePage(30);
    const fieldKey = KEY_FOR_LABEL[label];
    const isAcknowledged = fieldKey ? acknowledged.has(fieldKey) : false;

    const labelSize = 10;
    page.drawText(label, {
      x: MARGIN,
      y: fromTop(y + labelSize),
      size: labelSize,
      font: fontBold,
      color: GREEN,
    });

    if (isAcknowledged) {
      const labelW = fontBold.widthOfTextAtSize(label, labelSize);
      const badgeText = "User noted nothing further to add";
      const badgeSize = 8;
      const badgePadX = 4;
      const badgePadY = 2;
      const badgeTextW = fontRegular.widthOfTextAtSize(badgeText, badgeSize);
      const badgeW = badgeTextW + badgePadX * 2;
      const badgeH = badgeSize + badgePadY * 2;
      const badgeX = MARGIN + labelW + 6;
      const badgeTopY = y + labelSize - badgeH + 1;

      page.drawRectangle({
        x: badgeX,
        y: fromTop(badgeTopY + badgeH),
        width: badgeW,
        height: badgeH,
        color: YELLOW,
      });
      page.drawText(badgeText, {
        x: badgeX + badgePadX,
        y: fromTop(badgeTopY + badgeH - badgePadY - 1),
        size: badgeSize,
        font: fontRegular,
        color: GREEN,
      });
    }

    y += 16;

    const valueSize = 10;
    const lineHeight = 14;
    const lines = wrap(value || "-", CONTENT_WIDTH, fontRegular, valueSize);
    for (const line of lines) {
      ensurePage(lineHeight + 4);
      page.drawText(line, {
        x: MARGIN,
        y: fromTop(y + valueSize),
        size: valueSize,
        font: fontRegular,
        color: TEXT,
      });
      y += lineHeight;
    }
    y += 8;
  };

  // ─── Sections ───────────────────────────────────────────
  drawSectionHeader("Scoping");
  drawField("Their word for the people they work with", data.their_word);
  drawField("Can talk about them by name?", data.can_name_clients);
  drawField("Roughly how many worked with", data.rough_client_count);

  drawSectionHeader("About You & Your Business");
  drawField("What does your business do?", data.business_description);
  drawField("What specific problems do you solve?", data.problems_solved);
  drawField("Who do you work with right now?", data.current_clients);
  drawField("Describe your IDEAL client", data.ideal_client);
  drawField("Pricing & offer structure", data.pricing_structure);
  drawField(
    "What they ask for before a first conversation",
    data.pre_conversation_ask
  );

  drawSectionHeader("Self Assessment (1-5)");
  const ratingRowH = 18;
  for (const rating of RATINGS) {
    ensurePage(ratingRowH + 4);
    const val = data[rating.key as keyof SubmissionData] as number;
    const rowSize = 10;
    page.drawText(rating.label, {
      x: MARGIN,
      y: fromTop(y + rowSize),
      size: rowSize,
      font: fontRegular,
      color: TEXT,
    });

    const barX = MARGIN + 230;
    const barW = 130;
    const barH = 8;
    const filled = (val / 5) * barW;
    const barTopY = y + 4;
    page.drawRectangle({
      x: barX,
      y: fromTop(barTopY + barH),
      width: barW,
      height: barH,
      color: GREY,
    });
    page.drawRectangle({
      x: barX,
      y: fromTop(barTopY + barH),
      width: filled,
      height: barH,
      color: YELLOW,
    });

    page.drawText(`${val}/5`, {
      x: barX + barW + 10,
      y: fromTop(y + rowSize),
      size: rowSize,
      font: fontBold,
      color: GREEN,
    });
    y += ratingRowH;
  }
  y += 6;

  drawSectionHeader("Pain Points");
  const costText =
    data.biggest_cost === "Something else"
      ? `Something else: ${data.biggest_cost_other || "-"}`
      : data.biggest_cost;
  drawField("Biggest thing costing you money", costText);
  drawField(
    "What have you tried & why didn't it work?",
    data.attempted_fixes
  );

  drawSectionHeader("Your Prospects' World");
  drawField(
    "Top 3 problems your clients come to you with",
    data.top_3_client_problems
  );
  drawField("False beliefs your clients hold", data.client_false_beliefs);

  drawSectionHeader("Where You Want To Be");
  drawField("Success in 90 days", data.ninety_day_success);
  drawField("Something they could hand somebody", data.handover_asset);
  drawField("Anything else", data.anything_else);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function sendSubmissionEmail(data: SubmissionData) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "placeholder") {
    console.log("Email not configured - skipping notification");
    return;
  }

  const pdfBuffer = await generatePDF(data);
  const fileName = `Onboarding_${data.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date(data.created_at).toISOString().slice(0, 10)}.pdf`;

  const ratings = RATINGS.map((r) => data[r.key as keyof SubmissionData] as number);
  const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);

  const result = await resend.emails.send({
    from: "Onboarding Form <onboarding@resendupdates.darrengibb.com>",
    to: notificationEmail,
    subject: `New Client Onboarding: ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #024228; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #F9EC00; margin: 0; font-size: 20px;">New Client Onboarding</h1>
          <p style="color: #ffffff; margin: 5px 0 0 0;">${data.name} - ${data.email}</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="color: #024228; margin-top: 0;">Quick Summary</h3>
          <p><strong>Business:</strong> ${data.business_description.substring(0, 200)}${data.business_description.length > 200 ? "..." : ""}</p>
          <p><strong>Biggest Pain:</strong> ${data.biggest_cost}${data.biggest_cost === "Something else" ? ` - ${data.biggest_cost_other}` : ""}</p>
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

  if (result.error) {
    console.error("Resend rejected send:", JSON.stringify(result.error));
    throw new Error(`Resend error: ${result.error.message ?? JSON.stringify(result.error)}`);
  }
  console.log("Resend send ok:", JSON.stringify(result.data));
}
