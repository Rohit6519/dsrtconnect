"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  ChatCircle,
  Rocket,
  Wrench,
  Code,
  TrendUp,
  Megaphone,
  Users,
  Lightbulb,
  Package,
  CurrencyDollar,
  Star,
  TextB,
  TextItalic,
  TextUnderline,
  TextH,
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  Quotes,
  Code as CodeIcon,
  PencilSimple,
  Eye,
  Check,
  Flag,
  Tag,
  ChatText,
  ImageSquare,
  VideoCamera,
  Paperclip,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { toast } from "sonner";

interface Props {
  slug: string;
  onClose: () => void;
  onPosted: () => void;
}

const UPDATE_TYPES = [
  {
    id: "general",
    label: "General Update",
    icon: ChatCircle,
    tint: "text-white/70",
    bg: "bg-white/[0.06]",
  },
  {
    id: "release",
    label: "Release",
    icon: Rocket,
    tint: "text-purple-300",
    bg: "bg-purple-500/10",
  },
  {
    id: "building",
    label: "Building",
    icon: Wrench,
    tint: "text-blue-300",
    bg: "bg-blue-500/10",
  },
  {
    id: "experiment",
    label: "Experiment",
    icon: Code,
    tint: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    id: "progress",
    label: "Progress",
    icon: TrendUp,
    tint: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    id: "fix",
    label: "Fix",
    icon: Wrench,
    tint: "text-orange-300",
    bg: "bg-orange-500/10",
  },
  {
    id: "announcement",
    label: "Announcement",
    icon: Megaphone,
    tint: "text-red-300",
    bg: "bg-red-500/10",
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: Users,
    tint: "text-pink-300",
    bg: "bg-pink-500/10",
  },
  {
    id: "insight",
    label: "Insight",
    icon: Lightbulb,
    tint: "text-yellow-300",
    bg: "bg-yellow-500/10",
  },
  {
    id: "hiring",
    label: "Hiring",
    icon: Users,
    tint: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  {
    id: "funding",
    label: "Funding",
    icon: CurrencyDollar,
    tint: "text-yellow-300",
    bg: "bg-yellow-500/10",
  },
  {
    id: "milestone",
    label: "Milestone",
    icon: Star,
    tint: "text-orange-300",
    bg: "bg-orange-500/10",
  },
];

export function VentureUpdateModal({ slug, onClose, onPosted }: Props) {
  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [markAsMilestone, setMarkAsMilestone] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [disableComments, setDisableComments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; url: string }[]
  >([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType =
    UPDATE_TYPES.find((t) => t.id === type) || UPDATE_TYPES[0];
  const SelectedIcon = selectedType.icon;

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const insertFormat = (before: string, after: string = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const newText =
      content.slice(0, start) +
      before +
      (selected || "text") +
      after +
      content.slice(end);
    setContent(newText);
    setTimeout(() => {
      ta.focus();
      const pos = start + before.length + (selected || "text").length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const beforeCursor = content.slice(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const newText =
      content.slice(0, lineStart) + prefix + content.slice(lineStart);
    setContent(newText);
    setTimeout(() => {
      ta.focus();
      const pos = start + prefix.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertLinkInText = () => {
    const url = prompt("Enter URL:");
    if (!url) return;
    insertFormat("[", "](" + url + ")");
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const uploadAttachment = async (
    file: File,
    kind: "image" | "video" | "file",
  ) => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "update");
      const res = await fetch("/api/ventures/" + slug + "/media", {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed");

      if (kind === "image") setAttachedImages([...attachedImages, j.url]);
      if (kind === "video") setAttachedVideo(j.url);
      if (kind === "file")
        setAttachedFiles([...attachedFiles, { name: file.name, url: j.url }]);
      toast.success(kind.charAt(0).toUpperCase() + kind.slice(1) + " attached");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Add a title");
      return;
    }
    setSaving(true);
    try {
      let fullContent = content;
      if (attachedImages.length > 0) {
        fullContent +=
          "\n\n" +
          attachedImages.map((url) => "![image](" + url + ")").join("\n");
      }
      if (attachedVideo) {
        fullContent += "\n\n[Watch video](" + attachedVideo + ")";
      }
      if (attachedFiles.length > 0) {
        fullContent +=
          "\n\n" +
          attachedFiles
            .map((f) => "[📎 " + f.name + "](" + f.url + ")")
            .join("\n");
      }
      if (linkUrl) {
        fullContent +=
          "\n\n[" + (linkLabel || "View link") + "](" + linkUrl + ")";
      }
      if (tags.length > 0) {
        fullContent += "\n\n" + tags.map((t) => "#" + t).join(" ");
      }

      const res = await fetch("/api/ventures/" + slug + "/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          content: fullContent,
          is_public: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(selectedType.label + " posted");
      onPosted();
    } catch {
      toast.error("Failed to post");
    } finally {
      setSaving(false);
    }
  };

  const renderMarkdown = (md: string) => {
    if (!md) return "";
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-[15px] font-bold text-white mt-4 mb-2">$1</h3>',
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-[16px] font-bold text-white mt-4 mb-2">$1</h2>',
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-[19px] font-bold text-white mt-5 mb-3">$1</h1>',
      )
      .replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-2 border-purple-500/40 pl-3 py-1 my-2 italic text-white/70">$1</blockquote>',
      )
      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong class="text-white font-semibold">$1</strong>',
      )
      .replace(/\*(.+?)\*/g, '<em class="text-white/85">$1</em>')
      .replace(/__(.+?)__/g, '<u class="underline">$1</u>')
      .replace(
        /`(.+?)`/g,
        '<code class="bg-white/[0.06] text-purple-200 px-1.5 py-0.5 rounded text-[12px] font-mono">$1</code>',
      )
      .replace(
        /!\[image\]\(([^)]+)\)/g,
        '<img src="$1" class="rounded-lg my-2 max-h-64" />',
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" class="text-purple-300 hover:text-purple-200 underline">$1</a>',
      )
      .replace(
        /^\* (.+)$/gm,
        '<li class="ml-4 list-disc text-white/80">$1</li>',
      )
      .replace(
        /^\d+\. (.+)$/gm,
        '<li class="ml-4 list-decimal text-white/80">$1</li>',
      )
      .replace(
        /\n\n/g,
        '</p><p class="text-[13.5px] leading-relaxed text-white/80 mb-2">',
      )
      .replace(/\n/g, "<br />");
    return (
      '<p class="text-[13.5px] leading-relaxed text-white/80 mb-2">' +
      html +
      "</p>"
    );
  };

  return (
    // 🎯 Fixed Backdrop with z-[100] & Proper Screen Centering
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      {/* 🎯 Modal Box with max-h-[88vh] for clean fit */}
      <div
        className="bg-[#0f0f18] border border-white/[0.12] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl relative my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-[#0f0f18]">
          <div className="flex items-center gap-2.5">
            <div
              className={
                "w-9 h-9 rounded-lg flex items-center justify-center " +
                selectedType.bg
              }
            >
              <SelectedIcon
                size={16}
                weight="regular"
                className={selectedType.tint}
              />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">
                Post an update
              </h2>
              <p className="text-[11.5px] text-white/45">
                Share what&apos;s happening with your venture
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* BODY (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* UPDATE TYPE GRID */}
          <div>
            <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-2">
              Update Type
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {UPDATE_TYPES.slice(0, 10).map((t) => {
                const Icon = t.icon;
                const active = type === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={
                      "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border transition-all cursor-pointer " +
                      (active
                        ? "bg-white/[0.08] border-white/[0.22] shadow-sm"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]")
                    }
                  >
                    <Icon
                      size={16}
                      weight="regular"
                      className={active ? t.tint : "text-white/55"}
                    />
                    <span
                      className={
                        "text-[10.5px] font-semibold text-center leading-tight " +
                        (active ? "text-white" : "text-white/60")
                      }
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TITLE */}
          <div>
            <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-2">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Crop Health Detection v2 is Live"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2] transition-colors"
              autoFocus
            />
          </div>

          {/* DESCRIPTION with rich editor */}
          <div>
            <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-2">
              Description
            </label>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-white/[0.2] transition-colors">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.01]">
                <div className="flex items-center gap-0.5">
                  <ToolBtn
                    onClick={() => insertFormat("**")}
                    icon={TextB}
                    title="Bold"
                  />
                  <ToolBtn
                    onClick={() => insertFormat("*")}
                    icon={TextItalic}
                    title="Italic"
                  />
                  <ToolBtn
                    onClick={() => insertFormat("__")}
                    icon={TextUnderline}
                    title="Underline"
                  />
                  <Divider />
                  <ToolBtn
                    onClick={() => insertLine("# ")}
                    icon={TextH}
                    title="Heading"
                  />
                  <ToolBtn
                    onClick={insertLinkInText}
                    icon={LinkIcon}
                    title="Link"
                  />
                  <Divider />
                  <ToolBtn
                    onClick={() => insertLine("* ")}
                    icon={ListBullets}
                    title="Bullet List"
                  />
                  <ToolBtn
                    onClick={() => insertLine("1. ")}
                    icon={ListNumbers}
                    title="Numbered List"
                  />
                  <ToolBtn
                    onClick={() => insertLine("> ")}
                    icon={Quotes}
                    title="Quote"
                  />
                  <ToolBtn
                    onClick={() => insertFormat("`")}
                    icon={CodeIcon}
                    title="Code"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPreview(false)}
                    className={
                      "flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold transition-colors cursor-pointer " +
                      (!preview
                        ? "bg-purple-500/20 text-purple-200"
                        : "text-white/50 hover:text-white")
                    }
                  >
                    <PencilSimple size={10} /> Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(true)}
                    className={
                      "flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold transition-colors cursor-pointer " +
                      (preview
                        ? "bg-purple-500/20 text-purple-200"
                        : "text-white/50 hover:text-white")
                    }
                  >
                    <Eye size={10} /> Preview
                  </button>
                </div>
              </div>

              {/* Editor / Preview */}
              {preview ? (
                <div className="min-h-[160px] px-4 py-3 prose prose-invert max-w-none">
                  {content ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(content),
                      }}
                    />
                  ) : (
                    <p className="text-[13px] text-white/30 italic">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  maxLength={10000}
                  placeholder={
                    "Share the details. Use **bold**, *italic*, [links](url), headings, lists..."
                  }
                  className="w-full bg-transparent px-4 py-3 text-[13.5px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none resize-y font-normal"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
                      e.preventDefault();
                      insertFormat("**");
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
                      e.preventDefault();
                      insertFormat("*");
                    }
                  }}
                />
              )}

              {/* Editor footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] text-[10.5px] text-white/40 bg-white/[0.01]">
                <span>
                  Supports **bold**, *italic*, [links](url), lists, code
                </span>
                <span>{content.length.toLocaleString()} / 10,000</span>
              </div>
            </div>
          </div>

          {/* ATTACHED MEDIA PREVIEW */}
          {(attachedImages.length > 0 ||
            attachedVideo ||
            attachedFiles.length > 0) && (
            <div className="space-y-2">
              <label className="block text-[10.5px] font-bold text-white/50 uppercase tracking-wider">
                Attachments
              </label>
              <div className="flex flex-wrap gap-2">
                {attachedImages.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/[0.08] group"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedImages(
                          attachedImages.filter((_, idx) => idx !== i),
                        )
                      }
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {attachedVideo && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/[0.08] bg-black group flex items-center justify-center">
                    <VideoCamera
                      size={20}
                      weight="fill"
                      className="text-white/70"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachedVideo(null)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                {attachedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="relative flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 group"
                  >
                    <Paperclip size={11} className="text-white/60" />
                    <span className="text-[11.5px] text-white/80 max-w-[140px] truncate">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFiles(
                          attachedFiles.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-white/40 hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADVANCED OPTIONS */}
          <div className="border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-[10.5px] font-bold text-white/60 uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
            >
              Advanced Options
              {showAdvanced ? <CaretUp size={11} /> : <CaretDown size={11} />}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Mark as milestone */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={markAsMilestone}
                    onChange={(e) => setMarkAsMilestone(e.target.checked)}
                    className="mt-0.5 rounded border-white/[0.15] bg-white/[0.04] text-purple-500 focus:ring-purple-500/30 flex-shrink-0"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-white flex items-center gap-1.5">
                      <Flag
                        size={12}
                        weight="regular"
                        className="text-orange-300"
                      />{" "}
                      Mark as milestone
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      Setting this will also update your venture stage
                      automatically and add it to your development history.
                    </p>
                  </div>
                </label>

                {/* Attach a link */}
                <div>
                  <label className="block text-[12px] font-semibold text-white mb-2 flex items-center gap-1.5">
                    <LinkIcon size={12} weight="regular" /> Attach a link
                    <span className="font-normal text-white/45">
                      (GitHub, Figma, Demo, Docs)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]"
                    />
                    <input
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Button label (optional)"
                      className="w-48 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[12px] font-semibold text-white mb-2 flex items-center gap-1.5">
                    <Tag size={12} weight="regular" /> Tags{" "}
                    <span className="font-normal text-white/45">
                      ({tags.length}/10)
                    </span>
                  </label>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Type a tag and press Enter"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]"
                    disabled={tags.length >= 10}
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter((x) => x !== t))}
                            className="text-white/40 hover:text-white ml-0.5 cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disable comments */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={disableComments}
                    onChange={(e) => setDisableComments(e.target.checked)}
                    className="mt-0.5 rounded border-white/[0.15] bg-white/[0.04] text-purple-500 focus:ring-purple-500/30 flex-shrink-0"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-white flex items-center gap-1.5">
                      <ChatText size={12} weight="regular" /> Disable comments
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      People won&apos;t be able to comment on this update.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-[#0f0f18]">
          <div className="flex items-center gap-1">
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) =>
                e.target.files?.[0] &&
                uploadAttachment(e.target.files[0], "image")
              }
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) =>
                e.target.files?.[0] &&
                uploadAttachment(e.target.files[0], "video")
              }
            />
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) =>
                e.target.files?.[0] &&
                uploadAttachment(e.target.files[0], "file")
              }
            />
            <IconBtn
              onClick={() => imgInputRef.current?.click()}
              icon={ImageSquare}
              title="Add image"
              disabled={uploading !== null}
            />
            <IconBtn
              onClick={() => videoInputRef.current?.click()}
              icon={VideoCamera}
              title="Add video"
              disabled={uploading !== null || !!attachedVideo}
            />
            <IconBtn
              onClick={() => fileInputRef.current?.click()}
              icon={Paperclip}
              title="Attach file"
              disabled={uploading !== null}
            />
            {uploading && (
              <span className="text-[11px] text-white/50 ml-2">
                Uploading {uploading}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-semibold text-white/60 hover:text-white px-4 h-9 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !title.trim() || uploading !== null}
              className="text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white hover:text-black border border-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed px-5 h-9 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <SelectedIcon
                size={14}
                weight="regular"
                className={selectedType.tint}
              />
              {saving ? "Posting..." : "Post " + selectedType.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  onClick,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  icon: any;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      title={title}
      className="w-7 h-7 rounded hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
    >
      <Icon size={12} weight="regular" />
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-white/[0.1] mx-1" />;
}

function IconBtn({
  onClick,
  icon: Icon,
  title,
  disabled,
}: {
  onClick: () => void;
  icon: any;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      title={title}
      disabled={disabled}
      className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/50 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      <Icon size={16} weight="regular" />
    </button>
  );
}
