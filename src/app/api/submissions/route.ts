import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { submissionSchema } from "@/lib/validation";
import { sendSubmissionEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = submissionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { data: submission, error } = await supabase
      .from("onboarding_submissions")
      .insert(result.data)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 }
      );
    }

    // Send email notification with PDF in background
    sendSubmissionEmail({
      ...result.data,
      id: submission.id,
      created_at: submission.created_at,
    }).catch((err) =>
      console.error("Failed to send email notification:", err)
    );

    return NextResponse.json({ id: submission.id, success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save submission" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: submissions, error } = await supabase
      .from("onboarding_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
