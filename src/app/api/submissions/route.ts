import { NextRequest, NextResponse, after } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { adminPasswordOk } from "@/lib/admin-auth";
import { FORM_VERSION, submissionV2Schema, type SubmissionV2 } from "@/lib/v2/definitions";
import { processSubmission } from "@/lib/v2/process";

// The LinkedIn pull and the brief run after the response, inside this limit.
export const maxDuration = 300;

/** Old columns still filled in, so older tools that read them keep working. */
function legacyColumns(a: SubmissionV2) {
  return {
    name: a.name,
    email: a.email,
    business_description: a.business_description,
    problems_solved: a.problems_in_their_words,
    current_clients: a.clients_now_and_ideal,
    ideal_client: a.clients_now_and_ideal,
    pricing_structure: a.pricing,
    rating_ideal_client_clarity: a.ratings.ideal_client_clarity,
    rating_dm_confidence: a.ratings.dm_confidence,
    rating_dm_to_call: a.ratings.dm_to_call,
    rating_close_rate: a.ratings.calls_to_clients,
    rating_dm_system: a.ratings.dm_system,
    biggest_cost: a.biggest_cost === "Something else" ? `Something else: ${a.biggest_cost_other}` : a.biggest_cost,
    biggest_cost_other: a.biggest_cost_other || null,
    attempted_fixes: a.attempted_fixes,
    top_3_client_problems: a.problems_in_their_words,
    client_false_beliefs: a.false_beliefs,
    ninety_day_success: a.ninety_day,
    anything_else: a.anything_else ?? "",
    their_word: a.their_word || null,
    acknowledged_short_answers: a.acknowledged_short_answers,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // A hidden field people never see. Bots fill it in; they get a polite "thanks" and nothing is stored or spent.
  const trap = (body as { company_url?: unknown })?.company_url;
  if (typeof trap === "string" && trap.trim() !== "") {
    console.warn("Onboarding: honeypot field filled, submission dropped.");
    return NextResponse.json({ success: true });
  }

  if ((body as { form_version?: unknown })?.form_version !== FORM_VERSION) {
    return NextResponse.json(
      {
        error: "Old form",
        issues: [{ path: ["form"], message: "This form has been updated. Please refresh the page and try again." }],
      },
      { status: 400 }
    );
  }

  const result = submissionV2Schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: result.error.issues.slice(0, 20).map((i) => ({ path: i.path.map(String), message: i.message })),
      },
      { status: 400 }
    );
  }
  const answers = result.data;

  const db = getAdminClient();
  if (!db) {
    // Fail loudly rather than save somewhere the safety net can't see.
    console.error("Onboarding: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel, so the submission could not be saved.");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const { data: row, error } = await db
    .from("onboarding_submissions")
    .insert({ ...legacyColumns(answers), form_version: FORM_VERSION, answers })
    .select("id, created_at")
    .single();

  if (error || !row) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  after(async () => {
    try {
      const outcome = await processSubmission(row.id, { budgetMs: 270_000, allowLinkedIn: true });
      if (!outcome.sent) {
        console.error(`Onboarding ${row.id}: not sent on first attempt (${outcome.detail}); the backstop will retry.`);
      }
    } catch (err) {
      console.error(`Onboarding ${row.id}: processing crashed; the backstop will retry.`, err);
    }
  });

  return NextResponse.json({ id: row.id, success: true });
}

export async function GET(request: NextRequest) {
  if (!adminPasswordOk(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getAdminClient();
  if (!db) {
    console.error("Admin read: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel.");
    return NextResponse.json({ error: "Server not configured: service key missing" }, { status: 500 });
  }
  const { data: submissions, error } = await db
    .from("onboarding_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase select error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
  return NextResponse.json({ submissions });
}
