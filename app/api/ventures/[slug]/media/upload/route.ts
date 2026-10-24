import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_DOC_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: venture } = await supabase
    .from("ventures")
    .select("id, founder_id, user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!venture) {
    return NextResponse.json({ error: "Venture not found" }, { status: 404 });
  }

  const isOwner =
    venture.founder_id === user.id ||
    venture.user_id === user.id ||
    (!venture.founder_id && !venture.user_id);

  if (!isOwner) {
    const { data: isMember } = await supabase
      .rpc("is_venture_owner_or_member", {
        p_venture_id: venture.id,
        p_user_id: user.id,
      })
      .catch(() => ({ data: false }));

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    let file_name = "";
    let mime_type = "";
    let file_size = 0;
    let fileObject: File | null = null;

    const contentType = req.headers.get("content-type") || "";

    // 🎯 SUPPORT BOTH FORM-DATA AND JSON
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        fileObject = file;
        file_name = file.name;
        mime_type = file.type || "image/png";
        file_size = file.size;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      file_name = body.file_name || "image.png";
      mime_type = body.mime_type || "image/png";
      file_size = Number(body.file_size) || 1024;
    }

    if (!file_name || !mime_type) {
      return NextResponse.json(
        { error: "Missing file details" },
        { status: 400 },
      );
    }

    // ─── Determine media type & validate ───
    let mediaType: "image" | "video" | "document" | "other" = "image";
    let maxSize = MAX_IMAGE_SIZE;

    if (
      ALLOWED_IMAGE_TYPES.includes(mime_type) ||
      mime_type.startsWith("image/")
    ) {
      mediaType = "image";
      maxSize = MAX_IMAGE_SIZE;
    } else if (
      ALLOWED_VIDEO_TYPES.includes(mime_type) ||
      mime_type.startsWith("video/")
    ) {
      mediaType = "video";
      maxSize = MAX_VIDEO_SIZE;
    } else if (ALLOWED_DOC_TYPES.includes(mime_type)) {
      mediaType = "document";
      maxSize = MAX_DOC_SIZE;
    }

    if (file_size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Max ${Math.round(maxSize / (1024 * 1024))}MB`,
        },
        { status: 400 },
      );
    }

    // ─── Generate Storage Path ───
    const ext = file_name.split(".").pop() || "png";
    const cleanExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8);
    const storagePath = `${venture.id}/media/${mediaType}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

    // 🎯 Direct upload if File object is present in FormData
    if (fileObject) {
      const { data: upData, error: upErr } = await supabase.storage
        .from("ventures")
        .upload(storagePath, fileObject, {
          upsert: true,
          contentType: mime_type,
        });

      if (!upErr && upData) {
        const { data: pubUrl } = supabase.storage
          .from("ventures")
          .getPublicUrl(upData.path);
        return NextResponse.json({
          url: pubUrl.publicUrl,
          public_url: pubUrl.publicUrl,
          storage_path: upData.path,
          media_type: mediaType,
        });
      }
    }

    // ─── Fallback: Signed Upload URL ───
    const { data: signed, error: signErr } = await supabase.storage
      .from("ventures")
      .createSignedUploadUrl(storagePath);

    if (signErr || !signed) {
      // Direct client fallback public URL
      const { data: pubUrl } = supabase.storage
        .from("ventures")
        .getPublicUrl(storagePath);
      return NextResponse.json({
        upload_url: "",
        storage_path: storagePath,
        public_url: pubUrl.publicUrl,
        url: pubUrl.publicUrl,
        media_type: mediaType,
      });
    }

    const { data: pubUrl } = supabase.storage
      .from("ventures")
      .getPublicUrl(storagePath);

    return NextResponse.json({
      upload_url: signed.signedUrl,
      upload_token: signed.token,
      storage_path: storagePath,
      public_url: pubUrl.publicUrl,
      url: pubUrl.publicUrl,
      media_type: mediaType,
    });
  } catch (e: any) {
    console.error("Media upload URL error:", e);
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 },
    );
  }
}
