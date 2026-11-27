import "server-only";
import { Resend } from "resend";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ROBOTO_REGULAR_BASE64 } from "../fonts/roboto-regular";
import { ROBOTO_BOLD_BASE64 } from "../fonts/roboto-bold";
import type { SubmissionV2 } from "./definitions";
import type { LinkedInReport, PulledProfile } from "./linkedin";
import type { BriefResult } from "./brief";
import { buildSections, ratingRows, type Section } from "./sections";

const FROM = "Onboarding Form <onboarding@resendupdates.darrengibb.com>";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const ROLE_LABEL: Record<PulledProfile["role"], string> = {
  client: "The client",
  ideal_client: "Ideal-client example",
  similar_seller: "Similar seller",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "done",
  partial: "partly done",
  failed: "FAILED",
  skipped: "not run",
};

// ─── PDF ──────────────────────────────────────────────────

/** pdf-lib with Roboto cannot draw some characters (emoji, some scripts); swap them so the PDF never fails to build. */
function safeText(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

export async function generatePdf(
  meta: { name: string; email: string; created_at: string },
  briefText: string,
  sections: Section[],
  ratings: { label: string; value: number }[],
  acknowledged: Set<string>
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(Buffer.from(ROBOTO_REGULAR_BASE64, "base64"), { subset: true });
  const bold = await pdf.embedFont(Buffer.from(ROBOTO_BOLD_BASE64, "base64"), { subset: true });

  const W = 595;
  const H = 842;
  const M = 50;
  const CW = W - M * 2;
  const GREEN = rgb(2 / 255, 66 / 255, 40 / 255);
  const YELLOW = rgb(249 / 255, 236 / 255, 0);
  const WHITE = rgb(1, 1, 1);
  const TEXT = rgb(40 / 255, 40 / 255, 40 / 255);
  const GREY = rgb(220 / 255, 220 / 255, 220 / 255);
  const SUBTLE = rgb(200 / 255, 200 / 255, 200 / 255);

  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;
  const top = (yt: number) => H - yt;
  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      page = pdf.addPage([W, H]);
      y = M;
    }
  };
  const wrap = (text: string, font: PDFFont, size: number): string[] => {
    const lines: string[] = [];
    for (const para of safeText(font, text).split(/\n/)) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }
      let cur = "";
      for (const word of para.split(/\s+/)) {
        const next = cur ? `${cur} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > CW && cur) {
          lines.push(cur);
          cur = word;
        } else cur = next;
      }
      if (cur) lines.push(cur);
    }
    return lines;
  };

  page.drawRectangle({ x: 0, y: top(80), width: W, height: 80, color: GREEN });
  page.drawText("Client Onboarding", { x: M, y: top(34), size: 22, font: bold, color: YELLOW });
  page.drawText(safeText(bold, meta.name), { x: M, y: top(54), size: 13, font: bold, color: WHITE });
  const date = new Date(meta.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  page.drawText(safeText(regular, `${meta.email}  |  ${date}`), { x: M, y: top(70), size: 9, font: regular, color: SUBTLE });
  y = 105;

  const header = (title: string) => {
    ensure(40);
    page.drawRectangle({ x: M, y: top(y + 22), width: CW, height: 22, color: GREEN });
    page.drawText(safeText(bold, title), { x: M + 10, y: top(y + 15), size: 12, font: bold, color: YELLOW });
    y += 34;
  };
  const paragraph = (text: string) => {
    for (const line of wrap(text || "-", regular, 10)) {
      ensure(18);
      page.drawText(line, { x: M, y: top(y + 10), size: 10, font: regular, color: TEXT });
      y += 14;
    }
    y += 8;
  };
  const field = (label: string, value: string, flagged: boolean) => {
    ensure(30);
    const l = safeText(bold, label);
    page.drawText(l, { x: M, y: top(y + 10), size: 10, font: bold, color: GREEN });
    if (flagged) {
      const badge = "Said they had nothing more to add";
      const bx = M + bold.widthOfTextAtSize(l, 10) + 6;
      const bw = regular.widthOfTextAtSize(badge, 8) + 8;
      page.drawRectangle({ x: bx, y: top(y + 11), width: bw, height: 12, color: YELLOW });
      page.drawText(badge, { x: bx + 4, y: top(y + 9), size: 8, font: regular, color: GREEN });
    }
    y += 16;
    paragraph(value);
  };

  if (briefText) {
    header("Session 1 brief (AI-written, check before use)");
    paragraph(briefText);
  }
  sections.forEach((s, i) => {
    header(s.title);
    for (const f of s.fields) field(f.label, f.value, Boolean(f.key && acknowledged.has(f.key)));
    if (i === 1) {
      header("Q7 Ratings (1 to 5)");
      for (const r of ratings) {
        ensure(22);
        page.drawText(safeText(regular, r.label), { x: M, y: top(y + 10), size: 9, font: regular, color: TEXT });
        const bx = M + 330;
        page.drawRectangle({ x: bx, y: top(y + 12), width: 100, height: 8, color: GREY });
        page.drawRectangle({ x: bx, y: top(y + 12), width: (r.value / 5) * 100, height: 8, color: YELLOW });
        page.drawText(`${r.value}/5`, { x: bx + 110, y: top(y + 10), size: 10, font: bold, color: GREEN });
        y += 18;
      }
      y += 6;
    }
  });
  return Buffer.from(await pdf.save());
}

// ─── HTML ─────────────────────────────────────────────────

/** Only real LinkedIn profile links become clickable; anything else is shown as plain text. */
const safeHref = (url: unknown) => typeof url === "string" && /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s"'<>]+$/i.test(url);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "0");
const str = (v: unknown) => (typeof v === "string" ? v : "");

function profileHtml(p: PulledProfile): string {
  if (!p.found) {
    return `<p style="margin:0 0 12px"><strong>${esc(ROLE_LABEL[p.role])}</strong>: ${esc(p.url)}<br><em>Not found on LinkedIn.</em></p>`;
  }
  const exp = (Array.isArray(p.experience) ? p.experience : [])
    .slice(0, 3)
    .map((e) => `${esc(e.position ?? "")}${e.company ? ` at ${esc(e.company)}` : ""}${e.start ? ` (${esc(e.start)} to ${esc(e.end ?? "")})` : ""}`)
    .join("<br>");
  const posts = (Array.isArray(p.posts) ? p.posts : [])
    .map(
      (post) =>
        `<li style="margin:0 0 6px">${str(post.date) ? `<span style="color:#666">${esc(str(post.date).slice(0, 10))}</span> ` : ""}${esc(str(post.text).slice(0, 500))}${
          post.comments !== null ? ` <span style="color:#666">(${num(post.likes)} likes, ${num(post.comments)} comments)</span>` : ""
        }</li>`
    )
    .join("");
  return `<div style="margin:0 0 18px;padding:10px 12px;border:1px solid #ddd;border-radius:6px">
    <p style="margin:0 0 4px"><strong>${esc(ROLE_LABEL[p.role])}: ${esc(p.name ?? "")}</strong>${p.note ? ` <em>(${esc(p.note)})</em>` : ""}<br>
    ${safeHref(p.url) ? `<a href="${esc(p.url)}">${esc(p.url)}</a>` : esc(p.url)}${p.location ? ` · ${esc(p.location)}` : ""}</p>
    ${p.headline ? `<p style="margin:4px 0"><strong>Headline:</strong> ${esc(p.headline)}</p>` : ""}
    ${p.about ? `<p style="margin:4px 0;white-space:pre-wrap"><strong>About:</strong> ${esc(p.about.slice(0, 1200))}</p>` : ""}
    ${exp ? `<p style="margin:4px 0"><strong>Roles:</strong><br>${exp}</p>` : ""}
    ${posts ? `<p style="margin:6px 0 2px"><strong>Recent posts:</strong></p><ul style="margin:0;padding-left:18px">${posts}</ul>` : `<p style="margin:4px 0;color:#666">No recent posts found.</p>`}
  </div>`;
}

export function buildHtml(
  a: SubmissionV2,
  sections: Section[],
  ratings: { label: string; value: number }[],
  linkedin: LinkedInReport,
  brief: BriefResult,
  notes: string[]
): string {
  const status = `<p style="margin:0;font-size:13px;color:#333">
    LinkedIn pull: <strong>${esc(STATUS_LABEL[linkedin.status] ?? linkedin.status)}</strong>. ${esc(linkedin.detail)}<br>
    Session 1 brief: <strong>${esc(STATUS_LABEL[brief.status] ?? brief.status)}</strong>. ${esc(brief.detail)}
    ${notes.map((n) => `<br>${esc(n)}`).join("")}
  </p>`;
  const answers = sections
    .map(
      (s) =>
        `<h3 style="color:#024228;margin:18px 0 6px">${esc(s.title)}</h3>` +
        s.fields
          .map(
            (f) =>
              `<p style="margin:0 0 8px"><strong>${esc(f.label)}</strong><br><span style="white-space:pre-wrap">${esc(f.value)}</span></p>`
          )
          .join("")
    )
    .join("");
  const ratingsHtml = ratings.map((r) => `${esc(r.label)}: <strong>${r.value}/5</strong>`).join("<br>");
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222">
  <div style="background:#024228;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:#F9EC00;margin:0;font-size:20px">New Client Onboarding</h1>
    <p style="color:#fff;margin:5px 0 0">${esc(a.name)} · ${esc(a.email)}</p>
  </div>
  <div style="background:#f9f9f9;padding:16px 20px;border-bottom:1px solid #ddd">${status}</div>
  <div style="padding:16px 20px">
    <h2 style="color:#024228;margin:0 0 8px">Session 1 brief</h2>
    ${
      brief.text
        ? `<p style="font-size:12px;color:#666;margin:0 0 8px">Written by AI from their answers and LinkedIn. Check it before you use it.</p><div style="white-space:pre-wrap;font-size:14px;line-height:1.5">${esc(brief.text)}</div>`
        : `<p><em>No brief this time: ${esc(brief.detail)} Everything is still below.</em></p>`
    }
    <h2 style="color:#024228;margin:26px 0 4px">Their answers</h2>
    <p style="font-size:12px;color:#666;margin:0">Also attached as a PDF.</p>
    ${answers}
    <h3 style="color:#024228;margin:18px 0 6px">Q7 Ratings</h3><p>${ratingsHtml}</p>
    <h2 style="color:#024228;margin:26px 0 8px">LinkedIn data</h2>
    ${(Array.isArray(linkedin.profiles) ? linkedin.profiles : []).map(profileHtml).join("") || "<p>None.</p>"}
  </div>
</div>`;
}

/** Sends the single onboarding email. Throws if Resend refuses it, so the caller can record the failure and retry. */
export async function sendOnboardingEmail(args: {
  id: string;
  created_at: string;
  answers: SubmissionV2;
  linkedin: LinkedInReport;
  brief: BriefResult;
  notes: string[];
}): Promise<void> {
  const to = process.env.NOTIFICATION_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key || key === "placeholder") {
    throw new Error("Email is not configured (NOTIFICATION_EMAIL or RESEND_API_KEY missing)");
  }
  const { answers: a } = args;
  const sections = buildSections(a);
  const ratings = ratingRows(a);
  const acknowledged = new Set(a.acknowledged_short_answers);

  let attachments: { filename: string; content: Buffer }[] = [];
  const notes = [...args.notes];
  try {
    const pdf = await generatePdf({ name: a.name, email: a.email, created_at: args.created_at }, args.brief.text, sections, ratings, acknowledged);
    const safeName = a.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) || "client";
    attachments = [{ filename: `Onboarding_${safeName}_${args.created_at.slice(0, 10)}.pdf`, content: pdf }];
  } catch (err) {
    // The email still goes; it just says the PDF could not be built.
    console.error("Onboarding PDF failed:", err);
    notes.push(`The PDF could not be built (${String(err).slice(0, 120)}), so it is not attached. Everything is in this email.`);
  }

  const resend = new Resend(key);
  const problem = (st: string) => st === "failed" || st === "skipped" || st === "partial";
  const flag = problem(args.linkedin.status) || problem(args.brief.status) ? " [check: LinkedIn or brief incomplete]" : "";
  const subjectName = a.name.replace(/[\r\n]+/g, " ").slice(0, 120);
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: `New Client Onboarding: ${subjectName}${flag}`,
    html: buildHtml(a, sections, ratings, args.linkedin, args.brief, notes),
    attachments,
  }, { idempotencyKey: `onboarding-${args.id}` });
  // Resend refuses a repeat of a key it has already accepted with different content: that means it already went.
  if (result.error?.name === "invalid_idempotent_request") {
    console.warn(`Onboarding ${args.id}: Resend says this email was already sent; treating as sent.`);
    return;
  }
  if (result.error) {
    throw new Error(`Resend refused the email: ${result.error.message ?? JSON.stringify(result.error)}`);
  }
}

/** A plain alert with the raw stored answers, for when the normal email can't be built or keeps failing. */
export async function sendAlertEmail(id: string, reason: string, rawAnswers: unknown): Promise<void> {
  const to = process.env.NOTIFICATION_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key || key === "placeholder") {
    throw new Error("Email is not configured (NOTIFICATION_EMAIL or RESEND_API_KEY missing)");
  }
  const resend = new Resend(key);
  const result = await resend.emails.send(
    {
      from: FROM,
      to,
      subject: "ACTION NEEDED: an onboarding form could not be processed",
      html: `<div style="font-family:Arial,sans-serif;max-width:680px">
        <h2 style="color:#a3221c">An onboarding form needs you</h2>
        <p>${esc(reason)}</p>
        <p>Submission id: ${esc(id)}. Its raw answers are below and on the admin page.</p>
        <pre style="white-space:pre-wrap;font-size:12px;background:#f4f4f4;padding:10px">${esc(JSON.stringify(rawAnswers, null, 2))}</pre>
      </div>`,
    },
    { idempotencyKey: `onboarding-alert-${id}` }
  );
  if (result.error && result.error.name !== "invalid_idempotent_request") {
    throw new Error(`Resend refused the alert: ${result.error.message}`);
  }
}
