"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  X,
  Users,
  Sparkle,
  Lock,
  Globe,
  Tag,
  Palette,
  Check,
  Cpu,
  Rocket,
  Brain,
  PaintBrush,
  MagnifyingGlass,
  CurrencyDollar,
  Heartbeat,
  GraduationCap,
  Briefcase,
} from "@phosphor-icons/react";

const CATEGORIES = [
  { slug: "general", label: "General", icon: Users, color: "blue" },
  { slug: "technology", label: "Technology", icon: Cpu, color: "blue" },
  {
    slug: "entrepreneurship",
    label: "Entrepreneurship",
    icon: Rocket,
    color: "orange",
  },
  { slug: "ai", label: "AI / ML", icon: Brain, color: "purple" },
  { slug: "design", label: "Design", icon: PaintBrush, color: "pink" },
  {
    slug: "research",
    label: "Research",
    icon: MagnifyingGlass,
    color: "green",
  },
  { slug: "finance", label: "Finance", icon: CurrencyDollar, color: "yellow" },
  { slug: "health", label: "HealthTech", icon: Heartbeat, color: "red" },
  { slug: "education", label: "Education", icon: GraduationCap, color: "cyan" },
  { slug: "business", label: "Business", icon: Briefcase, color: "gray" },
];

const COLORS = [
  { name: "blue", bg: "bg-blue-500", ring: "ring-blue-500" },
  { name: "purple", bg: "bg-purple-500", ring: "ring-purple-500" },
  { name: "pink", bg: "bg-pink-500", ring: "ring-pink-500" },
  { name: "orange", bg: "bg-orange-500", ring: "ring-orange-500" },
  { name: "green", bg: "bg-green-500", ring: "ring-green-500" },
  { name: "red", bg: "bg-red-500", ring: "ring-red-500" },
  { name: "yellow", bg: "bg-yellow-500", ring: "ring-yellow-500" },
  { name: "cyan", bg: "bg-cyan-500", ring: "ring-cyan-500" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (community: any) => void;
}

export function CreateCommunityModal({ isOpen, onClose, onCreated }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [color, setColor] = useState("blue");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) {
      setSlug(slugify(v).slice(0, 50));
    }
  };

  const handleSlugChange = (v: string) => {
    setSlug(slugify(v).slice(0, 50));
    setSlugEdited(true);
  };

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (clean && !tags.includes(clean) && tags.length < 10) {
      setTags([...tags, clean]);
      setTagsInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagsInput);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleClose = () => {
    if (loading) return;
    // Reset form
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setCategory("general");
    setColor("blue");
    setTagsInput("");
    setTags([]);
    setIsPublic(true);
    setStep(1);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Name must be at least 3 characters");
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/communities/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug || undefined,
          description: description.trim() || undefined,
          category,
          tags,
          icon_color: color,
          is_public: isPublic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create community");
        setLoading(false);
        return;
      }

      toast.success("Community created successfully! 🎉");

      if (onCreated) onCreated(data.community);

      handleClose();

      // Redirect to new community
      router.push(data.redirect || `/community/${data.community.slug}`);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canProceed =
    step === 1 ? name.trim().length >= 3 : step === 2 ? true : true;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div
            className={cn(
              "p-5 border-b bg-gradient-to-br relative",
              `from-${color}-500/10 to-${color}-600/5`,
            )}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  `bg-${color}-500/20`,
                )}
              >
                <Sparkle
                  className={cn("w-6 h-6", `text-${color}-500`)}
                  weight="fill"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create Community</h2>
                <p className="text-xs text-muted-foreground">
                  Step {step} of 3
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    s <= step ? `bg-${color}-500` : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Community Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. AI Enthusiasts"
                    maxLength={60}
                    className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      Min 3, max 60 chars
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {name.length}/60
                    </p>
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    URL Slug
                  </label>
                  <div className="mt-1.5 flex items-center bg-muted/30 border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                    <span className="pl-3 text-xs text-muted-foreground">
                      /community/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="ai-enthusiasts"
                      maxLength={50}
                      className="flex-1 px-2 py-2.5 bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Auto-generated from name
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this community about?"
                    rows={3}
                    maxLength={500}
                    className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Category & Style */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.slug;
                      return (
                        <button
                          key={cat.slug}
                          onClick={() => setCategory(cat.slug)}
                          className={cn(
                            "flex items-center gap-2 p-2.5 border rounded-lg text-xs font-semibold transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          <Icon
                            className="w-4 h-4"
                            weight={isSelected ? "fill" : "regular"}
                          />
                          {cat.label}
                          {isSelected && (
                            <Check
                              className="w-3.5 h-3.5 ml-auto"
                              weight="bold"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setColor(c.name)}
                        className={cn(
                          "w-10 h-10 rounded-lg transition-all",
                          c.bg,
                          color === c.name
                            ? `ring-4 ring-offset-2 ring-offset-background ${c.ring}`
                            : "hover:scale-110",
                        )}
                      >
                        {color === c.name && (
                          <Check
                            className="w-4 h-4 text-white mx-auto"
                            weight="bold"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" weight="bold" /> Tags (max 10)
                  </label>
                  <div className="mt-1.5">
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => tagsInput && addTag(tagsInput)}
                      placeholder="Add tags (press Enter)"
                      className="w-full px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      disabled={tags.length >= 10}
                    />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] px-2 py-1 bg-primary/10 text-primary rounded-md font-semibold flex items-center gap-1"
                          >
                            #{tag}
                            <button onClick={() => removeTag(tag)}>
                              <X className="w-2.5 h-2.5" weight="bold" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Privacy & Review */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Privacy */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Privacy
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setIsPublic(true)}
                      className={cn(
                        "p-3 border rounded-lg text-left transition-all",
                        isPublic
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/40",
                      )}
                    >
                      <Globe
                        className={cn(
                          "w-5 h-5 mb-1",
                          isPublic ? "text-primary" : "text-muted-foreground",
                        )}
                        weight="fill"
                      />
                      <p className="text-sm font-bold">Public</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Anyone can find & join
                      </p>
                    </button>
                    <button
                      onClick={() => setIsPublic(false)}
                      className={cn(
                        "p-3 border rounded-lg text-left transition-all",
                        !isPublic
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/40",
                      )}
                    >
                      <Lock
                        className={cn(
                          "w-5 h-5 mb-1",
                          !isPublic ? "text-primary" : "text-muted-foreground",
                        )}
                        weight="fill"
                      />
                      <p className="text-sm font-bold">Private</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Invite only
                      </p>
                    </button>
                  </div>
                </div>

                {/* Review Card */}
                <div className="bg-muted/30 border rounded-xl p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                    Preview
                  </p>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                        `bg-${color}-500/20`,
                      )}
                    >
                      <span
                        className={cn(
                          "text-2xl font-bold",
                          `text-${color}-500`,
                        )}
                      >
                        {name[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        {name || "Community Name"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        /community/{slug || "slug"}
                      </p>
                      {description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {description}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.slice(0, 5).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-semibold"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="min-w-[120px]"
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    <Sparkle className="w-4 h-4 mr-1" weight="fill" />
                    Create
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
