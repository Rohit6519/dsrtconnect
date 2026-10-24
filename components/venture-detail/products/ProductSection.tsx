"use client";

import { useState, useEffect, useRef } from "react";
import {
  PencilSimple,
  Check,
  X,
  Trash,
  ArrowUp,
  ArrowDown,
  ImageSquare,
  VideoCamera,
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  CornersOut,
  CaretLeft,
  CaretRight,
  DotsThree,
  TextAa,
  TextB,
  TextItalic,
  TextUnderline,
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  Eye,
  Tag,
  CaretDown,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const MAX_IMAGES = 3;
const MAX_VIDEOS = 3;
const SLIDESHOW_INTERVAL = 5000;

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  position: number;
}

interface Props {
  section: any;
  slug: string;
  isOwner: boolean;
  sectionNumber: number;
  onUpdate: (patch: any) => Promise<void>;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const TEXT_SIZES = [
  {
    key: "small",
    label: "Small",
    md: "`SMALL`",
    size: "12px",
    desc: "Fine print, captions",
  },
  {
    key: "normal",
    label: "Normal",
    md: "",
    size: "14px",
    desc: "Default body text",
  },
  { key: "medium", label: "Medium", md: "**", size: "15px", desc: "Emphasis" },
  {
    key: "large",
    label: "Large",
    md: "### ",
    size: "18px",
    desc: "Sub-heading",
  },
  {
    key: "xlarge",
    label: "X-Large",
    md: "## ",
    size: "22px",
    desc: "Section heading",
  },
  { key: "title", label: "Title", md: "# ", size: "28px", desc: "Main title" },
];

export function ProductSection({
  section,
  slug,
  isOwner,
  sectionNumber,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.name || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(section.description || "");
  const [preview, setPreview] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagsDraft, setTagsDraft] = useState(
    (section.tech_stack || []).join(", "),
  );
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [uploading, setUploading] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [hoverTip, setHoverTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync drafts with prop changes
  useEffect(() => {
    if (!editingTitle) setTitleDraft(section.name || "");
    if (!editingDesc) setDescDraft(section.description || "");
    if (!editingTags) setTagsDraft((section.tech_stack || []).join(", "));
  }, [section, editingTitle, editingDesc, editingTags]);

  useEffect(() => {
    const screenshots = (section.screenshots || []).map(
      (url: string, i: number) => ({
        id: "img_" + i,
        type: "image" as const,
        url,
        position: i,
      }),
    );
    const vids = section.video_url
      ? [
          {
            id: "vid_0",
            type: "video" as const,
            url: section.video_url,
            position: screenshots.length,
          },
        ]
      : [];
    const demoVid = section.demo_url
      ? [
          {
            id: "vid_1",
            type: "video" as const,
            url: section.demo_url,
            position: screenshots.length + 1,
          },
        ]
      : [];
    setMedia([...screenshots, ...vids, ...demoVid]);
  }, [section]);

  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");
  const activeMedia = media[activeMediaIdx];

  useEffect(() => {
    if (media.length <= 1) return;
    slideshowRef.current = setInterval(() => {
      setActiveMediaIdx((prev) => {
        const next = prev + 1;
        if (next >= media.length) return 0;
        if (media[next].type === "video") return prev;
        return next;
      });
    }, SLIDESHOW_INTERVAL);
    return () => {
      if (slideshowRef.current) clearInterval(slideshowRef.current);
    };
  }, [media.length]);

  useEffect(() => {
    if (playing && slideshowRef.current) {
      clearInterval(slideshowRef.current);
      slideshowRef.current = null;
    }
  }, [playing]);

  const goTo = (idx: number) => {
    setActiveMediaIdx(idx);
    setPlaying(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const goPrev = () =>
    goTo(activeMediaIdx > 0 ? activeMediaIdx - 1 : media.length - 1);
  const goNext = () =>
    goTo(activeMediaIdx < media.length - 1 ? activeMediaIdx + 1 : 0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  // 🎯 SAFE UPLOAD FUNCTION FOR BOTH IMAGE & VIDEO
  const uploadMedia = async (file: File, kind: "image" | "video") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("file_name", file.name);
      fd.append(
        "mime_type",
        file.type || (kind === "image" ? "image/png" : "video/mp4"),
      );
      fd.append("file_size", String(file.size));
      fd.append("kind", kind === "image" ? "gallery" : "video");

      const res = await fetch(`/api/ventures/${slug}/media/upload`, {
        method: "POST",
        body: fd,
      });
      const j = await res.json();

      if (!res.ok) throw new Error(j.error || "Upload failed");

      if (kind === "image") {
        const screenshots = [
          ...(section.screenshots || []),
          j.url || j.public_url,
        ];
        await onUpdate({ screenshots });
      } else {
        await onUpdate({ video_url: j.url || j.public_url });
      }

      toast.success(
        `${kind === "image" ? "Image" : "Video"} added successfully`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const removeMedia = async (idx: number) => {
    const item = media[idx];
    if (item.type === "image") {
      const imgIdx = parseInt(item.id.split("_")[1]);
      const screenshots = (section.screenshots || []).filter(
        (_: string, i: number) => i !== imgIdx,
      );
      await onUpdate({ screenshots });
    } else {
      await onUpdate({ video_url: null });
    }
    if (activeMediaIdx >= media.length - 1)
      setActiveMediaIdx(Math.max(0, activeMediaIdx - 1));
  };

  // Rich text helpers
  const insertFormat = (before: string, after: string = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = descDraft.slice(start, end);
    const newText =
      descDraft.slice(0, start) +
      before +
      (selected || "text") +
      after +
      descDraft.slice(end);
    setDescDraft(newText);
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
    const beforeCursor = descDraft.slice(0, start);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    const newText =
      descDraft.slice(0, lineStart) + prefix + descDraft.slice(lineStart);
    setDescDraft(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) insertFormat("[", "](" + url + ")");
  };

  const applyTextSize = (sizeKey: string) => {
    const size = TEXT_SIZES.find((s) => s.key === sizeKey);
    if (!size) return;
    setShowSizeMenu(false);
    if (size.key === "normal") return;
    if (size.md.endsWith(" ")) {
      insertLine(size.md);
    } else if (size.md) {
      insertFormat(size.md);
    }
  };

  const renderMarkdown = (md: string) => {
    if (!md) return "";
    return md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /^### (.*$)/gim,
        '<h3 data-size="Large" class="dsrt-size text-[18px] font-semibold text-white mt-3 mb-1.5">$1</h3>',
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 data-size="X-Large" class="dsrt-size text-[22px] font-bold text-white mt-4 mb-2">$1</h2>',
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 data-size="Title" class="dsrt-size text-[28px] font-bold text-white mt-5 mb-2">$1</h1>',
      )
      .replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-2 border-white/25 pl-3 py-1 my-2 text-white/70 italic">$1</blockquote>',
      )
      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong data-size="Medium" class="dsrt-size text-white font-semibold text-[15px]">$1</strong>',
      )
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/__(.+?)__/g, "<u>$1</u>")
      .replace(
        /`SMALL`([^`]+)/g,
        '<span data-size="Small" class="dsrt-size text-[12px] text-white/70">$1</span>',
      )
      .replace(
        /`(.+?)`/g,
        '<code class="bg-white/[0.06] text-white/90 px-1 rounded text-[12px] font-mono">$1</code>',
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" class="text-white underline hover:opacity-80">$1</a>',
      )
      .replace(
        /^\* (.+)$/gm,
        '<li class="ml-4 list-disc text-white/85 my-0.5">$1</li>',
      )
      .replace(
        /^\d+\. (.+)$/gm,
        '<li class="ml-4 list-decimal text-white/85 my-0.5">$1</li>',
      )
      .replace(
        /\n\n/g,
        '</p><p data-size="Normal" class="dsrt-size text-[14px] leading-[1.75] text-white/85 mb-2">',
      )
      .replace(/\n/g, "<br />");
  };

  const saveDesc = async () => {
    await onUpdate({ description: descDraft });
    setEditingDesc(false);
    setPreview(false);
    toast.success("Description saved");
  };

  const saveTags = async () => {
    const arr = tagsDraft
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await onUpdate({ tech_stack: arr });
    setEditingTags(false);
    toast.success("Tags updated");
  };

  const saveTitle = async () => {
    await onUpdate({ name: titleDraft.trim() || null });
    setEditingTitle(false);
  };

  const displayTitle = section.name || (isOwner ? "" : "Untitled Section");
  const hasTitle = !!section.name;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden group/section">
      {/* Section header */}
      {isOwner && (
        <div className="px-5 py-2.5 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2">
            {onMoveUp && (
              <button
                onClick={onMoveUp}
                className="w-6 h-6 rounded hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center cursor-pointer"
                title="Move up"
              >
                <ArrowUp size={11} />
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={onMoveDown}
                className="w-6 h-6 rounded hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center cursor-pointer"
                title="Move down"
              >
                <ArrowDown size={11} />
              </button>
            )}
            <span className="text-[10.5px] text-white/40 font-mono uppercase tracking-wider">
              Section {sectionNumber}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-6 h-6 rounded hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center cursor-pointer"
              title="More options"
            >
              <DotsThree size={13} weight="bold" />
            </button>
            <button
              onClick={onDelete}
              className="w-6 h-6 rounded hover:bg-red-500/20 text-white/40 hover:text-red-300 flex items-center justify-center cursor-pointer"
              title="Delete section"
            >
              <Trash size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Section title */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        {editingTitle && isOwner ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveTitle();
                }
                if (e.key === "Escape") {
                  setTitleDraft(section.name || "");
                  setEditingTitle(false);
                }
              }}
              placeholder="Give this section a heading..."
              className="flex-1 bg-white/[0.05] border border-white/[0.15] rounded-lg px-3 py-1.5 text-[18px] font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.3]"
            />
            <button
              onClick={saveTitle}
              className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center cursor-pointer"
            >
              <Check size={14} weight="bold" />
            </button>
            <button
              onClick={() => {
                setTitleDraft(section.name || "");
                setEditingTitle(false);
              }}
              className="w-8 h-8 rounded-md text-white/50 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <h3
            onClick={() => isOwner && setEditingTitle(true)}
            className={
              "text-[18px] font-bold leading-tight " +
              (hasTitle
                ? "text-white " +
                  (isOwner ? "cursor-pointer hover:opacity-80" : "")
                : "text-white/30 italic " +
                  (isOwner ? "cursor-pointer hover:text-white/50" : ""))
            }
          >
            {hasTitle
              ? displayTitle
              : isOwner
                ? 'Click to write your heading (e.g. "What is DSRT COCO?")'
                : "Untitled Section"}
          </h3>
        )}
      </div>

      {/* 50/50 split: Media | Content */}
      <div className="flex flex-col lg:flex-row">
        {/* LEFT — Media Gallery (50%) */}
        <div className="lg:w-1/2 border-r border-white/[0.04]">
          <div className="relative aspect-[16/10] bg-black overflow-hidden">
            {media.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.02] text-center px-6">
                <ImageSquare size={32} className="text-white/30 mb-2" />
                <p className="text-[12.5px] text-white/40">
                  {isOwner
                    ? "Add images and videos to showcase this product."
                    : "No media added yet."}
                </p>
                {isOwner && (
                  <div className="flex gap-2 mt-3">
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadMedia(e.target.files[0], "image")
                      }
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadMedia(e.target.files[0], "video")
                      }
                    />
                    <button
                      onClick={() => imgInputRef.current?.click()}
                      disabled={uploading !== null}
                      className="text-[11px] font-semibold text-white bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] px-2.5 h-7 rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <ImageSquare size={11} />{" "}
                      {uploading === "image" ? "Uploading..." : "Image"}
                    </button>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading !== null}
                      className="text-[11px] font-semibold text-white bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] px-2.5 h-7 rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <VideoCamera size={11} />{" "}
                      {uploading === "video" ? "Uploading..." : "Video"}
                    </button>
                  </div>
                )}
              </div>
            ) : activeMedia?.type === "image" ? (
              <img
                src={activeMedia.url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : activeMedia?.type === "video" ? (
              <>
                <video
                  ref={videoRef}
                  src={activeMedia.url}
                  className="w-full h-full object-cover"
                  muted={muted}
                  loop
                  onClick={togglePlay}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
                {!playing && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    onClick={togglePlay}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                      <Play
                        size={24}
                        weight="fill"
                        className="text-black ml-1"
                      />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-8">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-white/80 cursor-pointer"
                    >
                      {playing ? (
                        <Pause size={16} weight="fill" />
                      ) : (
                        <Play size={16} weight="fill" />
                      )}
                    </button>
                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/80 rounded-full"
                        style={{ width: "35%" }}
                      />
                    </div>
                    <button
                      onClick={() => setMuted(!muted)}
                      className="text-white/70 hover:text-white cursor-pointer"
                    >
                      {muted ? (
                        <SpeakerSlash size={14} />
                      ) : (
                        <SpeakerHigh size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => videoRef.current?.requestFullscreen()}
                      className="text-white/70 hover:text-white cursor-pointer"
                    >
                      <CornersOut size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {media.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/80 text-white flex items-center justify-center z-10 cursor-pointer"
                >
                  <CaretLeft size={13} weight="bold" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/80 text-white flex items-center justify-center z-10 cursor-pointer"
                >
                  <CaretRight size={13} weight="bold" />
                </button>
              </>
            )}

            {isOwner && media.length > 0 && (
              <button
                onClick={() => removeMedia(activeMediaIdx)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/20 hover:bg-red-500/80 text-white flex items-center justify-center z-10 opacity-0 group-hover/section:opacity-100 transition-opacity cursor-pointer"
                title="Remove this media"
              >
                <Trash size={11} />
              </button>
            )}
          </div>

          <div className="px-3 py-2.5 flex items-center gap-2 border-t border-white/[0.04] bg-white/[0.01] overflow-x-auto scrollbar-hide">
            {media.map((m, i) => (
              <button
                key={m.id}
                onClick={() => goTo(i)}
                className={
                  "relative flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer " +
                  (activeMediaIdx === i
                    ? "border-white/60 scale-105 shadow-lg"
                    : "border-white/[0.08] opacity-60 hover:opacity-80")
                }
              >
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <Play size={10} weight="fill" className="text-white/80" />
                  </div>
                )}
              </button>
            ))}

            {isOwner && (
              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    uploadMedia(e.target.files[0], "image")
                  }
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    uploadMedia(e.target.files[0], "video")
                  }
                />
                {images.length < MAX_IMAGES && (
                  <button
                    onClick={() => imgInputRef.current?.click()}
                    disabled={uploading !== null}
                    className="w-10 h-10 rounded-md border border-dashed border-white/[0.15] hover:border-white/[0.3] text-white/40 hover:text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 cursor-pointer"
                    title={
                      "Add image (" + images.length + "/" + MAX_IMAGES + ")"
                    }
                  >
                    <ImageSquare size={12} />
                  </button>
                )}
                {videos.length < MAX_VIDEOS && (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploading !== null}
                    className="w-10 h-10 rounded-md border border-dashed border-white/[0.15] hover:border-white/[0.3] text-white/40 hover:text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 cursor-pointer"
                    title={
                      "Add video (" + videos.length + "/" + MAX_VIDEOS + ")"
                    }
                  >
                    <VideoCamera size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Content (50%) */}
        <div className="lg:w-1/2 flex flex-col">
          {editingDesc && isOwner ? (
            <div className="flex flex-col h-full">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.01] flex-wrap gap-2">
                <div className="flex items-center gap-0.5">
                  {/* Text size dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSizeMenu(!showSizeMenu)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded px-2 py-1 transition-colors cursor-pointer"
                      title="Text size"
                    >
                      <TextAa size={11} weight="regular" />
                      Size
                      <CaretDown size={9} />
                    </button>
                    {showSizeMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowSizeMenu(false)}
                        />
                        <div className="absolute top-full mt-1 left-0 z-50 min-w-[200px] bg-[#12121a] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden">
                          {TEXT_SIZES.map((s) => (
                            <button
                              key={s.key}
                              onClick={() => applyTextSize(s.key)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.05] text-left transition-colors group cursor-pointer"
                            >
                              <div>
                                <span
                                  className="text-white font-medium block"
                                  style={{ fontSize: s.size }}
                                >
                                  {s.label}
                                </span>
                                <span className="text-[10.5px] text-white/40">
                                  {s.desc}
                                </span>
                              </div>
                              <span className="text-[10px] text-white/30 font-mono">
                                {s.size}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <Divider />
                  <ToolBtn
                    onClick={() => insertFormat("**")}
                    icon={TextB}
                    title="Bold (Ctrl+B)"
                  />
                  <ToolBtn
                    onClick={() => insertFormat("*")}
                    icon={TextItalic}
                    title="Italic (Ctrl+I)"
                  />
                  <ToolBtn
                    onClick={() => insertFormat("__")}
                    icon={TextUnderline}
                    title="Underline"
                  />
                  <Divider />
                  <ToolBtn
                    onClick={insertLink}
                    icon={LinkIcon}
                    title="Insert Link"
                  />
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
                    icon={Code}
                    title="Code"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setPreview(false)}
                    className={
                      "flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold transition-colors cursor-pointer " +
                      (!preview
                        ? "bg-white/[0.1] text-white"
                        : "text-white/50 hover:text-white")
                    }
                  >
                    <PencilSimple size={10} /> Write
                  </button>
                  <button
                    onClick={() => setPreview(true)}
                    className={
                      "flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold transition-colors cursor-pointer " +
                      (preview
                        ? "bg-white/[0.1] text-white"
                        : "text-white/50 hover:text-white")
                    }
                  >
                    <Eye size={10} /> Preview
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[320px]">
                {preview ? (
                  <div
                    className="p-5 h-full overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html:
                        '<p data-size="Normal" class="dsrt-size text-[14px] leading-[1.75] text-white/85 mb-2">' +
                        renderMarkdown(descDraft) +
                        "</p>",
                    }}
                  />
                ) : (
                  <textarea
                    ref={textareaRef}
                    autoFocus
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    maxLength={10000}
                    placeholder="Describe this product in detail. What does it do? How does it work? What makes it special?"
                    className="w-full h-full min-h-[320px] bg-transparent px-5 py-4 text-[13.5px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none resize-none"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
                        e.preventDefault();
                        insertFormat("**");
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
                        e.preventDefault();
                        insertFormat("*");
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                        e.preventDefault();
                        saveDesc();
                      }
                    }}
                  />
                )}
              </div>

              <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <span className="text-[10.5px] text-white/40">
                  {descDraft.length.toLocaleString()} / 10,000 · Markdown
                  supported
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDescDraft(section.description || "");
                      setEditingDesc(false);
                      setPreview(false);
                    }}
                    className="text-[12px] font-semibold text-white/60 hover:text-white px-3 h-8 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDesc}
                    className="text-[12px] font-semibold text-black bg-white hover:bg-white/90 px-4 h-8 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={12} weight="bold" /> Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div
                ref={previewRef}
                className="flex-1 p-5 md:p-6 overflow-y-auto relative"
              >
                {isOwner && !section.description && (
                  <div className="flex items-center justify-end mb-3">
                    <button
                      onClick={() => {
                        setDescDraft(section.description || "");
                        setEditingDesc(true);
                      }}
                      className="text-[11.5px] font-semibold text-white/60 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] px-2.5 h-7 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PencilSimple size={11} /> Write
                    </button>
                  </div>
                )}

                {section.description ? (
                  <div className="relative group/content">
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          '<p data-size="Normal" class="dsrt-size text-[14px] leading-[1.75] text-white/85 mb-2">' +
                          renderMarkdown(section.description) +
                          "</p>",
                      }}
                    />
                    {isOwner && (
                      <button
                        onClick={() => {
                          setDescDraft(section.description || "");
                          setEditingDesc(true);
                        }}
                        className="absolute top-0 right-0 text-white/40 hover:text-white opacity-0 group-hover/content:opacity-100 transition-opacity cursor-pointer bg-black/60 p-1.5 rounded-lg border border-white/10"
                        title="Edit"
                      >
                        <PencilSimple size={13} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <p className="text-[13px] text-white/40 mb-2">
                      {isOwner
                        ? "Write about this product."
                        : "No description yet."}
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => setEditingDesc(true)}
                        className="text-[12px] font-semibold text-white/70 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <PencilSimple size={11} /> Start writing
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                {editingTags && isOwner ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={tagsDraft}
                      onChange={(e) => setTagsDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTags();
                      }}
                      placeholder="Intelligent, Autonomous, Adaptive..."
                      className="flex-1 bg-white/[0.05] border border-white/[0.15] rounded px-2.5 py-1 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.3]"
                    />
                    <button
                      onClick={saveTags}
                      className="w-6 h-6 rounded bg-white text-black flex items-center justify-center cursor-pointer"
                    >
                      <Check size={11} weight="bold" />
                    </button>
                    <button
                      onClick={() => {
                        setTagsDraft((section.tech_stack || []).join(", "));
                        setEditingTags(false);
                      }}
                      className="w-6 h-6 rounded text-white/50 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (section.tech_stack || []).length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(section.tech_stack || []).map((t: string) => (
                      <span
                        key={t}
                        className="text-[11px] font-semibold text-white/80 bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                    {isOwner && (
                      <button
                        onClick={() => setEditingTags(true)}
                        className="text-[10px] text-white/40 hover:text-white ml-1 cursor-pointer"
                        title="Edit tags"
                      >
                        <PencilSimple size={10} />
                      </button>
                    )}
                  </div>
                ) : isOwner ? (
                  <button
                    onClick={() => setEditingTags(true)}
                    className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Tag size={10} weight="regular" /> Add feature tags
                  </button>
                ) : null}
              </div>
            </div>
          )}
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
  return <span className="w-px h-4 bg-white/[0.1] mx-0.5" />;
}
