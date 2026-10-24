import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { decryptMessage } from "@/lib/encryption/messages";

export const dynamic = "force-dynamic";

/**
 * POST /api/community/decrypt
 * Body: { content: string, community_id?: string }
 * Decrypts an encrypted community message
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { content, community_id } = body;

  if (!content) {
    return NextResponse.json({ decrypted: "" });
  }

  // Verify user is a community member if community_id provided
  if (community_id) {
    const { data: community } = await supabase
      .from("communities")
      .select("id, created_by")
      .eq("id", community_id)
      .maybeSingle();

    if (community) {
      const isCreator = community.created_by === user.id;

      if (!isCreator) {
        const { data: membership } = await supabase
          .from("community_members")
          .select("id")
          .eq("community_id", community_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership) {
          return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }
      }
    }
  }

  const decrypted = decryptMessage(content);

  return NextResponse.json({ decrypted });
}
