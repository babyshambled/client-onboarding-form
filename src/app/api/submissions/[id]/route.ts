import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { adminPasswordOk } from "@/lib/admin-auth";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminPasswordOk(request.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
  }
  const db = getAdminClient();
  if (!db) {
    console.error("Admin read: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel.");
    return NextResponse.json({ error: "Server not configured: service key missing" }, { status: 500 });
  }
  const { data: submission, error } = await db.from("onboarding_submissions").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Admin read failed:", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  return NextResponse.json({ submission });
}
