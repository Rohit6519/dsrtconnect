import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuthContext,
  requestUploadIntent,
  ok,
  fail,
} from "@/lib/kernel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuthContext(req);
    const supabase = await createClient();
    const body = await req.json();

    const bucket = body.bucket || "community-assets";
    const entityType = body.entity_type || "community_draft";

    try {
      // 1) Try standard kernel requestUploadIntent
      const intent = await requestUploadIntent(supabase, {
        identityId: ctx.identityId,
        entityType,
        entityId: body.entity_id,
        expectedSize: body.expected_size,
        expectedMime: body.expected_mime,
        originalName: body.original_name,
        bucket,
        visibility: body.visibility || "PUBLIC",
      });

      return ok(intent, { ctx });
    } catch (innerErr: any) {
      console.warn(
        "[upload-intent requestUploadIntent error, trying fallback]:",
        innerErr?.message,
      );

      // 2) Fallback: Create signed upload URL directly via Supabase Storage
      const fileId = "file_" + Math.random().toString(36).slice(2, 11);
      const ext = (body.original_name || "file.png").split(".").pop() || "png";
      const key = `${entityType}/${fileId}.${ext}`;

      const { data: signedData, error: signedErr } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(key);

      if (!signedErr && signedData) {
        return ok(
          {
            file_id: fileId,
            storage_bucket: bucket,
            storage_key: key,
            token: signedData.token,
            signed_url: signedData.signedUrl,
          },
          { ctx },
        );
      }

      // 3) Fallback instructions for direct client upload
      return ok(
        {
          file_id: fileId,
          storage_bucket: bucket,
          storage_key: key,
          fallback_direct: true,
        },
        { ctx },
      );
    }
  } catch (err: any) {
    console.error("[upload-intent fatal error]:", err);
    return fail(err, ctx);
  }
}
