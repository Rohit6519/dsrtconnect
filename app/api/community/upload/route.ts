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

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'image' | 'video' | 'file'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size limits
    const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB video, 10MB others
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Max ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const fileName = `${user.id}/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("posts")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("posts").getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
