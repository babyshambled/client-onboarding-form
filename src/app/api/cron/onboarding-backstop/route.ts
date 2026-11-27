import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAdminClient } from "@/lib/supabase-admin";
import { MAX_EMAIL_ATTEMPTS, alertGaveUp, processSubmission } from "@/lib/v2/process";

// Runs every 15 minutes (vercel.json). Sends any onboarding email that has
// not gone out 15 minutes after the form was submitted, emails one alert for
// any form that has failed every attempt, and clears raw LinkedIn data older
// than 90 days (the brief is kept).
export const maxDuration = 300;
const RUN_BUDGET_MS = 270_000;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Onboarding backstop: CRON_SECRET is not set in Vercel, so the safety net cannot run.");
    return false;
  }
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getAdminClient();
  if (!db) {
    console.error("Onboarding backstop: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel, so nothing can be checked.");
    return NextResponse.json({ error: "Service key missing" }, { status: 500 });
  }

  // 1. Purge first, so a slow run can never starve it.
  const purgeBefore = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error: purgeError } = await db
    .from("onboarding_submissions")
    .update({ linkedin_report: null })
    .lt("created_at", purgeBefore)
    .not("linkedin_report", "is", null);
  if (purgeError) console.error("Onboarding backstop: 90-day LinkedIn purge failed", purgeError);

  // 2. One alert for each form that has used up every attempt.
  const { data: gaveUp, error: gaveUpError } = await db
    .from("onboarding_submissions")
    .select("id")
    .eq("form_version", "v2")
    .is("email_sent_at", null)
    .is("alert_sent_at", null)
    .gte("email_attempts", MAX_EMAIL_ATTEMPTS)
    .limit(10);
  if (gaveUpError) console.error("Onboarding backstop: give-up query failed", gaveUpError);
  const alerts: { id: string; sent: boolean; detail: string }[] = [];
  for (const row of gaveUp ?? []) alerts.push({ id: row.id, ...(await alertGaveUp(row.id)) });

  // 3. Retry unsent forms, oldest first, while there is time.
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: pending, error } = await db
    .from("onboarding_submissions")
    .select("id, email_attempts")
    .eq("form_version", "v2")
    .is("email_sent_at", null)
    .lt("email_attempts", MAX_EMAIL_ATTEMPTS)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(5);
  if (error) {
    console.error("Onboarding backstop: query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; sent: boolean; detail: string }[] = [];
  for (const row of pending ?? []) {
    const left = RUN_BUDGET_MS - (Date.now() - started);
    if (left < 60_000) break; // the next run in 15 minutes picks up the rest
    const outcome = await processSubmission(row.id, {
      budgetMs: left - 10_000,
      // Only the first attempt pulls LinkedIn; a retry sends the email without it rather than risk timing out again.
      allowLinkedIn: (row.email_attempts ?? 0) === 0,
    });
    results.push({ id: row.id, ...outcome });
  }

  return NextResponse.json({ checked: results.length, results, alerts, purge: purgeError ? "failed" : "ok" });
}
