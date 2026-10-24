import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 🎯 Flexible & Safe Project Lookup Helper
async function findProject(supabase: any, slugOrId: string) {
  const clean = decodeURIComponent(slugOrId).trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clean,
    );

  try {
    // Select ONLY existing columns: id, slug, founder_id, user_id
    let query = supabase
      .from("projects")
      .select("id, slug, founder_id, user_id");
    if (isUuid) {
      query = query.or(`id.eq.${clean},slug.ilike.${clean}`);
    } else {
      query = query.ilike("slug", clean);
    }

    const { data } = await query.maybeSingle();
    if (data) return data;

    // Fallback search
    const { data: fallbackData } = await supabase
      .from("projects")
      .select("id, slug, founder_id, user_id")
      .or(`slug.ilike.%${clean}%,name.ilike.%${clean}%`)
      .limit(1)
      .maybeSingle();

    return fallbackData || null;
  } catch (e) {
    console.error("[findProject error]:", e);
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const supabase = await createClient();

  try {
    const project = await findProject(supabase, slug);
    if (!project) return NextResponse.json({ sections: [] });

    const { data, error } = await supabase
      .from("project_documentation")
      .select("*")
      .eq("project_id", project.id)
      .order("position", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ sections: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message, sections: [] },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const project = await findProject(supabase, slug);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Ownership check (Safe)
    const isOwner =
      project.founder_id === user.id ||
      project.user_id === user.id ||
      (!project.founder_id && !project.user_id);

    if (!isOwner) {
      const { data: member } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const title = (body.title || "New section").trim().slice(0, 200);

    const { data: last } = await supabase
      .from("project_documentation")
      .select("position")
      .eq("project_id", project.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPos = (last?.position ?? -1) + 1;

    // 🎯 Insert Documentation Section
    const { data: section, error: docErr } = await supabase
      .from("project_documentation")
      .insert({
        project_id: project.id,
        title,
        content: body.content || "",
        position: nextPos,
        created_by: user.id,
        is_published: true,
      })
      .select()
      .single();

    if (docErr || !section) {
      console.error("[doc:create error]", docErr?.message);
      throw docErr || new Error("Failed to insert section");
    }

    // 🎯 Safely create initial revision history (Non-blocking)
    try {
      await supabase.from("project_doc_revisions").insert({
        doc_id: section.id,
        project_id: project.id,
        version: 1,
        title: section.title,
        content: section.content || "",
        created_by: user.id,
      });
    } catch (e: any) {
      console.warn("[doc_revision_warning]:", e?.message);
    }

    return NextResponse.json({ success: true, section, data: { section } });
  } catch (e: any) {
    console.error("Doc create error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to create section" },
      { status: 500 },
    );
  }
}
