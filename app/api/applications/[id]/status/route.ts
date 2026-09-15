import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { statusTransitionSchema, ALLOWED_TRANSITIONS } from "@/lib/validation";
import { logAuditEvent } from "@/lib/mongo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { message: "Not authenticated", code: "UNAUTHENTICATED" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body", code: "BAD_REQUEST" } },
      { status: 400 }
    );
  }

  const parsed = statusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          message: parsed.error.issues.map((i) => i.message).join("; "),
          code: "VALIDATION_ERROR",
        },
      },
      { status: 400 }
    );
  }

  const applicationId = params.id;

  // RLS ensures this select only succeeds if the caller (verifier/admin) is
  // actually allowed to see this application — the DB, not this route, is
  // the real access-control boundary.
  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("id, status, assigned_verifier_id")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return NextResponse.json(
      { error: { message: "Application not found", code: "NOT_FOUND" } },
      { status: 404 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile?.role === "admin" || profile?.role === "verifier";
  if (!isStaff) {
    return NextResponse.json(
      { error: { message: "Only verifiers or admins can change status", code: "FORBIDDEN" } },
      { status: 403 }
    );
  }

  const { to_status, remarks } = parsed.data;
  const allowedNext = ALLOWED_TRANSITIONS[application.status] ?? [];

  if (!allowedNext.includes(to_status)) {
    return NextResponse.json(
      {
        error: {
          message: `Cannot move from "${application.status}" to "${to_status}"`,
          code: "INVALID_TRANSITION",
        },
      },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: to_status })
    .eq("id", applicationId);

  if (updateError) {
    return NextResponse.json(
      { error: { message: "Failed to update status", code: "DB_ERROR" } },
      { status: 500 }
    );
  }

  await supabase.from("application_status_history").insert({
    application_id: applicationId,
    from_status: application.status,
    to_status,
    changed_by: user.id,
    remarks: remarks ?? null,
  });

  await supabase.from("notifications").insert({
    user_id: application.assigned_verifier_id ?? user.id,
    application_id: applicationId,
    message: `Application status changed to "${to_status.replace(/_/g, " ")}"`,
  });

  try {
    await logAuditEvent({
      applicationId,
      actorId: user.id,
      action: "status_transition",
      metadata: { from: application.status, to: to_status, remarks },
    });
  } catch {
    // Audit logging to Mongo is best-effort — never fail the request over it,
    // the Postgres status_history row above is already the source of truth.
  }

  return NextResponse.json({ data: { status: to_status } });
}
