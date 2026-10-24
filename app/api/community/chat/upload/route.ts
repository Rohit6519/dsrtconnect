import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_SIZES = {
  image: 10 * 1024 * 1024, // 10 MB
  video: 50 * 1024 * 1024, // 50 MB
  audio: 10 * 1024 * 1024, // 10 MB
  file: 20 * 1024 * 1024, // 20 MB
};

const ALLOWED_TYPES = {
  image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
  ],
};

function getMediaType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const communityId = formData.get("community_id") as string;
  const duration = formData.get("duration") as string; // For voice/video

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!communityId) {
    return NextResponse.json(
      { error: "community_id required" },
      { status: 400 },
    );
  }

  // Verify community membership
  const { data: community } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("id", communityId)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const isCreator = community.created_by === user.id;
  if (!isCreator) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this community" },
        { status: 403 },
      );
    }
  }

  // Determine media type
  const mediaType = getMediaType(file.type);
  const maxSize = MAX_SIZES[mediaType];

  if (file.size > maxSize) {
    return NextResponse.json(
      {
        error: `File too large. Max size for ${mediaType}: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
      },
      { status: 400 },
    );
  }

  // Generate unique file path
  const ext = file.name.split(".").pop() || "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${random}.${ext}`;
  const filePath = `communities/${communityId}/${user.id}/${fileName}`;

  // Upload to storage
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(filePath, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 },
    );
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("chat-media").getPublicUrl(filePath);

  return NextResponse.json({
    success: true,
    url: publicUrl,
    path: filePath,
    type: mediaType,
    mime: file.type,
    size: file.size,
    name: file.name,
    duration: duration ? parseInt(duration) : null,
  });
}
