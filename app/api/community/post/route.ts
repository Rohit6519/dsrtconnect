import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    community_id,
    content,
    image_urls, // Array of image URLs
    video_url, // Single video URL
    file_urls, // Array of file objects
    visibility,
  } = body;

  if (!community_id) {
    return NextResponse.json(
      { error: "Missing community_id" },
      { status: 400 },
    );
  }

  // Allow empty content if media exists
  const hasMedia = image_urls?.length > 0 || video_url || file_urls?.length > 0;

  if (!content?.trim() && !hasMedia) {
    return NextResponse.json(
      { error: "Content or media required" },
      { status: 400 },
    );
  }

  // Verify membership
  const { data: community } = await supabase
    .from("communities")
    .select("created_by")
    .eq("id", community_id)
    .single();

  const isCreator = community?.created_by === user.id;

  if (!isCreator) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Must be member" }, { status: 403 });
    }
  }

  // Determine media type
  let mediaType = "text";
  const mediaTypes = [];
  if (image_urls?.length > 0) mediaTypes.push("image");
  if (video_url) mediaTypes.push("video");
  if (file_urls?.length > 0) mediaTypes.push("file");
  if (mediaTypes.length > 1) mediaType = "mixed";
  else if (mediaTypes.length === 1) mediaType = mediaTypes[0];

  const finalVisibility =
    isCreator && visibility === "members_only" ? "members_only" : "public";

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      community_id,
      content: content?.trim() || "",
      image_url: image_urls?.[0] || null, // For backward compatibility
      image_urls: image_urls || [],
      video_url: video_url || null,
      file_urls: file_urls || [],
      media_type: mediaType,
      visibility: finalVisibility,
      is_public: finalVisibility === "public",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, post });
}
