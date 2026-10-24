"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  Plus,
  PencilSimple,
  Check,
  X,
  Eye,
  EyeSlash,
  ShareNetwork,
  ClockCounterClockwise,
  Clock,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { MarkdownEditor } from "./MarkdownEditor";
import { DocsSidebarTree } from "./docs/DocsSidebarTree";
import { DocsSearchBar } from "./docs/DocsSearchBar";
import { DocRenderer } from "./docs/DocRenderer";
import { DocContributors } from "./docs/DocContributors";
import { DocVersionHistory } from "./docs/DocVersionHistory";
import { DocShareModal } from "./docs/DocShareModal";
import { DocTableOfContents } from "./docs/DocTableOfContents";

interface DocSection {
  id: string;
  parent_id: string | null;
  title: string;
  content: string;
  slug: string | null;
  position: number;
  is_published: boolean;
  version?: number;
  view_count?: number;
  reading_minutes?: number;
  updated_at: string;
}

interface Props {
  slug: string;
  project: any;
  isOwner: boolean;
}

export function ProjectDocumentation({ slug, project, isOwner }: Props) {
  const [sections, setSections] = useState<DocSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const viewCountedRef = useRef<Set<string>>(new Set());

  // ─── FETCH ───
  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/projects/" + slug + "/documentation");
      const json = await res.json();
      const list: DocSection[] = json.sections || json.data?.sections || [];
      setSections(list);
      setActiveSectionId((prev) => {
        if (prev && list.some((s) => s.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || null;

  // ─── VIEW TRACKING ───
  useEffect(() => {
    if (!activeSection || editing) return;
    if (viewCountedRef.current.has(activeSection.id)) return;
    viewCountedRef.current.add(activeSection.id);
    fetch(
      "/api/projects/" + slug + "/documentation/" + activeSection.id + "/view",
      { method: "POST" },
    ).catch(() => {});
  }, [activeSection, editing, slug]);

  // ─── URL fragment scroll on doc change ───
  useEffect(() => {
    if (editing || !activeSection) return;
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const id = hash.slice(1);
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [activeSection, editing]);

  // ─── 🎯 BULLETPROOF CREATE SECTION ───
  const createSection = async (parentId: string | null = null) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projects/" + slug + "/documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New section",
          content: "",
          parent_id: parentId,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        const newSec = json.section || json.data?.section || json.data || json;
        if (newSec && newSec.id) {
          setSections((prev) => [...prev, newSec]);
          setActiveSectionId(newSec.id);
          setDraftTitle(newSec.title || "New section");
          setDraftContent(newSec.content || "");
          setEditing(true);
          toast.success("Created new section");
        }
        await fetchDocs();
      } else {
        toast.error(json?.error || "Failed to create section");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not create section");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (!activeSection) return;
    setDraftTitle(activeSection.title);
    setDraftContent(activeSection.content || "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftTitle("");
    setDraftContent("");
  };

  const saveSection = async () => {
    if (!activeSection) return;
    setSaving(true);
    try {
      const res = await fetch(
        "/api/projects/" + slug + "/documentation/" + activeSection.id,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draftTitle.trim() || "Untitled",
            content: draftContent,
          }),
        },
      );
      if (res.ok) {
        toast.success("Section saved");
        await fetchDocs();
        setEditing(false);
        setRefreshKey((k) => k + 1);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json?.error || "Failed to save section");
      }
    } catch {
      toast.error("Could not save section");
    } finally {
      setSaving(false);
    }
  };

  const renameSection = async (id: string, title: string) => {
    try {
      await fetch("/api/projects/" + slug + "/documentation/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePublish = async (id: string, next: boolean) => {
    try {
      await fetch("/api/projects/" + slug + "/documentation/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: next }),
      });
      await fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePublishActive = async () => {
    if (!activeSection) return;
    await togglePublish(activeSection.id, !activeSection.is_published);
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete this section and all its history?")) return;
    try {
      await fetch("/api/projects/" + slug + "/documentation/" + id, {
        method: "DELETE",
      });
      const idx = sections.findIndex((s) => s.id === id);
      const next = sections[idx + 1] || sections[idx - 1];
      setActiveSectionId(next?.id || null);
      await fetchDocs();
      toast.success("Section deleted");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-[18px] font-semibold text-white flex items-center gap-2">
            <BookOpen size={17} weight="fill" /> Documentation
          </h2>
          <p className="text-[12px] text-white/45 mt-0.5">
            Guides, references, tutorials for {project?.name}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => createSection(null)}
            disabled={saving}
            className="flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-3.5 h-8 rounded-md disabled:opacity-50 cursor-pointer"
          >
            <Plus size={12} weight="bold" /> New section
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-10 text-center text-[13px] text-white/45">
          Loading documentation...
        </div>
      ) : sections.length === 0 ? (
        <div className="p-16 text-center">
          <BookOpen size={36} className="mx-auto mb-4 text-white/20" />
          <p className="text-[14px] text-white/50 mb-1">No documentation yet</p>
          <p className="text-[12px] text-white/30 mb-4">
            {isOwner
              ? "Start documenting your project. Everything is versioned automatically."
              : "This project has no documentation."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={() => createSection(null)}
              disabled={saving}
              className="text-[13px] font-medium text-[#38bdf8] hover:underline underline-offset-2 cursor-pointer disabled:opacity-50"
            >
              + Create first section
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_200px] min-h-[600px]">
          {/* Sidebar tree */}
          <div className="border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col overflow-hidden">
            {isOwner && (
              <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
                <DocsSearchBar
                  slug={slug}
                  onSelect={(id) => {
                    setActiveSectionId(id);
                    setEditing(false);
                  }}
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
              <DocsSidebarTree
                sections={sections}
                activeSectionId={activeSectionId}
                isOwner={isOwner}
                onSelect={(id) => {
                  setActiveSectionId(id);
                  setEditing(false);
                }}
                onAdd={createSection}
                onDelete={deleteSection}
                onRename={renameSection}
                onTogglePublish={togglePublish}
              />
            </div>
          </div>

          {/* Main content */}
          <div className="p-6 min-w-0 overflow-x-hidden">
            {activeSection ? (
              editing ? (
                <>
                  <input
                    value={draftTitle}
                    onChange={(e) =>
                      setDraftTitle(e.target.value.slice(0, 200))
                    }
                    placeholder="Section title"
                    className="w-full text-[22px] font-bold text-white bg-transparent border-b border-white/[0.1] outline-none focus:border-white/30 pb-2 mb-4"
                  />
                  <MarkdownEditor
                    value={draftContent}
                    onChange={setDraftContent}
                    placeholder="Write your documentation. Supports full markdown, code blocks with syntax highlighting..."
                    minHeight={450}
                    maxLength={100000}
                  />
                  <div className="flex items-center justify-between gap-2 mt-4">
                    <p className="text-[11px] text-white/40">
                      💡 Every save creates a revision — nothing is lost.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveSection}
                        disabled={saving}
                        className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? (
                          "Saving..."
                        ) : (
                          <>
                            <Check size={13} weight="bold" /> Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Section header */}
                  <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
                    <div className="min-w-0">
                      <h1 className="text-[24px] font-bold text-white leading-tight tracking-tight">
                        {activeSection.title}
                      </h1>
                      <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-white/45">
                        {activeSection.reading_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {activeSection.reading_minutes}{" "}
                            min read
                          </span>
                        )}
                        {activeSection.view_count !== undefined &&
                          activeSection.view_count > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Eye size={11} /> {activeSection.view_count}{" "}
                                view{activeSection.view_count !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        {activeSection.version && (
                          <>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => setHistoryOpen(true)}
                              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            >
                              <ClockCounterClockwise size={11} /> v
                              {activeSection.version}
                            </button>
                          </>
                        )}
                        {!activeSection.is_published && (
                          <>
                            <span>·</span>
                            <span className="text-orange-300 font-semibold flex items-center gap-1">
                              <EyeSlash size={11} /> Draft
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setShareOpen(true)}
                        title="Share"
                        className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <ShareNetwork size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryOpen(true)}
                        title="History"
                        className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <ClockCounterClockwise size={14} />
                      </button>
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={togglePublishActive}
                            title={
                              activeSection.is_published
                                ? "Unpublish"
                                : "Publish"
                            }
                            className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            {activeSection.is_published ? (
                              <Eye size={14} />
                            ) : (
                              <EyeSlash size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={startEdit}
                            className="flex items-center gap-1.5 text-[13px] font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] px-3 h-8 rounded-md ml-1 cursor-pointer"
                          >
                            <PencilSimple size={12} /> Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contributors */}
                  <DocContributors
                    slug={slug}
                    docId={activeSection.id}
                    refreshKey={refreshKey}
                  />

                  {/* Content */}
                  {activeSection.content ? (
                    <DocRenderer content={activeSection.content} />
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-[14px] text-white/45 mb-2">
                        This section is empty
                      </p>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={startEdit}
                          className="text-[13px] font-medium text-[#38bdf8] hover:underline underline-offset-2 cursor-pointer"
                        >
                          Add content
                        </button>
                      )}
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="py-10 text-center text-[14px] text-white/45">
                Select a section
              </div>
            )}
          </div>

          {/* Right: Table of Contents */}
          {activeSection && !editing && (
            <div className="hidden xl:block border-l border-white/[0.06] p-5 overflow-y-auto max-h-[600px]">
              <DocTableOfContents content={activeSection.content || ""} />
            </div>
          )}
        </div>
      )}

      {historyOpen && activeSection && (
        <DocVersionHistory
          slug={slug}
          docId={activeSection.id}
          currentTitle={activeSection.title}
          isOwner={isOwner}
          onClose={() => setHistoryOpen(false)}
          onReverted={() => {
            fetchDocs();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {shareOpen && activeSection && (
        <DocShareModal
          slug={slug}
          docSlug={activeSection.slug}
          isPublished={activeSection.is_published}
          onClose={() => setShareOpen(false)}
          onTogglePublish={togglePublishActive}
        />
      )}
    </div>
  );
}
