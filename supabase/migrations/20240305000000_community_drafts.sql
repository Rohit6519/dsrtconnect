-- ====================================================================================
-- PHASE 7: COMMUNITY DRAFTS — server-persisted Studio drafts
-- ====================================================================================

CREATE TABLE IF NOT EXISTS public.community_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_identity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
    step VARCHAR(40) NOT NULL DEFAULT 'identity',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    autosave_version INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    discarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_owner
    ON public.community_drafts(owner_identity_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_drafts_status
    ON public.community_drafts(status);

DROP TRIGGER IF EXISTS trg_community_drafts_updated ON public.community_drafts;
CREATE TRIGGER trg_community_drafts_updated
BEFORE UPDATE ON public.community_drafts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drafts_owner_all" ON public.community_drafts;
CREATE POLICY "drafts_owner_all" ON public.community_drafts
  FOR ALL USING (auth.uid() = owner_identity_id)
  WITH CHECK (auth.uid() = owner_identity_id);

-- Ensure the community-assets storage bucket exists (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'community-assets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('community-assets', 'community-assets', true);
  END IF;
END $$;

-- Storage policies: owner uploads own files, anyone can read (assets are visually public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'community_assets_owner_upload'
  ) THEN
    CREATE POLICY "community_assets_owner_upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'community-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'community_assets_public_read'
  ) THEN
    CREATE POLICY "community_assets_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'community-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'community_assets_owner_delete'
  ) THEN
    CREATE POLICY "community_assets_owner_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'community-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;