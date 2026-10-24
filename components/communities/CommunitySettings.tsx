"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  Crown,
  Gear,
  Users,
  Trash,
  Warning,
  PaintBrush,
  Tag,
  Globe,
  Lock,
  Check,
  X,
  Info,
  ShieldCheck,
  UserMinus,
  DotsThree,
  ChatCircle,
  Eye,
  Sparkle,
  SealCheck,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  "general",
  "technology",
  "entrepreneurship",
  "ai",
  "design",
  "research",
  "finance",
  "health",
  "education",
  "business",
];

const COLORS = [
  { name: "blue", bg: "bg-blue-500" },
  { name: "purple", bg: "bg-purple-500" },
  { name: "pink", bg: "bg-pink-500" },
  { name: "orange", bg: "bg-orange-500" },
  { name: "green", bg: "bg-green-500" },
  { name: "red", bg: "bg-red-500" },
  { name: "yellow", bg: "bg-yellow-500" },
  { name: "cyan", bg: "bg-cyan-500" },
];

const COLOR_MAP: Record<string, any> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    gradient: "from-blue-500/20 to-blue-600/10",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-600/10",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    gradient: "from-pink-500/20 to-pink-600/10",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    gradient: "from-orange-500/20 to-orange-600/10",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    gradient: "from-green-500/20 to-green-600/10",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    gradient: "from-red-500/20 to-red-600/10",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    gradient: "from-yellow-500/20 to-yellow-600/10",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    gradient: "from-cyan-500/20 to-cyan-600/10",
  },
  gray: {
    bg: "bg-gray-500/10",
    text: "text-gray-500",
    gradient: "from-gray-500/20 to-gray-600/10",
  },
};

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> =
  {
    owner: { label: "Owner", color: "yellow", icon: Crown },
    admin: { label: "Admin", color: "purple", icon: ShieldCheck },
    moderator: { label: "Moderator", color: "blue", icon: ShieldCheck },
    member: { label: "Member", color: "gray", icon: Users },
  };

interface Props {
  community: any;
  currentUser: any;
}

export function CommunitySettings({ community, currentUser }: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "general" | "appearance" | "members" | "privacy" | "verification" | "danger"
  >("general");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Form state
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || "");
  const [category, setCategory] = useState(community.category || "general");
  const [color, setColor] = useState(community.icon_color || "blue");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>(community.tags || []);
  const [isPublic, setIsPublic] = useState(community.is_public !== false);
  const [coverUrl, setCoverUrl] = useState(community.cover_url || "");

  // Members
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // 🎯 NEW: Verification state
  const [checkingVerification, setCheckingVerification] = useState(false);

  const colors = COLOR_MAP[color] || COLOR_MAP.blue;
  const isCreator = community.created_by === currentUser.id;

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "members") {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const addTag = () => {
    const clean = tagsInput.trim().toLowerCase();
    if (clean && !tags.includes(clean) && tags.length < 10) {
      setTags([...tags, clean]);
      setTagsInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Name must be at least 3 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          tags,
          icon_color: color,
          cover_url: coverUrl || null,
          is_public: isPublic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update");
      } else {
        toast.success("Community updated successfully!");
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== community.name) {
      toast.error("Community name does not match");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/delete`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        setDeleting(false);
      } else {
        toast.success("Community deleted permanently");
        router.push("/my-communities");
      }
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from community?`)) return;

    try {
      const res = await fetch(
        `/api/communities/${community.id}/members?member_id=${memberId}`,
        { method: "DELETE" },
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to remove");
      } else {
        toast.success(`${memberName} removed`);
        loadMembers();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/communities/${community.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed");
      } else {
        toast.success("Role updated");
        loadMembers();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // 🎯 NEW: Handle verification request
  const handleRequestVerification = async () => {
    setCheckingVerification(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/verify`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.verified) {
        toast.success(
          data.message || "Congratulations! Your community is verified! ✓",
        );
        router.refresh();
      } else if (data.missing) {
        toast.error(`Missing: ${data.missing.join(", ")}`, { duration: 5000 });
      } else {
        toast.error(data.error || data.message || "Not eligible yet");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCheckingVerification(false);
    }
  };

  // 🎯 NEW: 6 tabs (added Verification)
  const tabs = [
    { id: "general", label: "General", icon: Gear },
    { id: "appearance", label: "Appearance", icon: PaintBrush },
    { id: "members", label: "Members", icon: Users },
    { id: "verification", label: "Verification", icon: SealCheck },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "danger", label: "Danger Zone", icon: Warning },
  ];

  // Calculate verification progress
  const memberOk = (community.member_count || 0) >= 100;
  const postOk = (community.post_count || 0) >= 20;
  const viewOk = (community.view_count || 0) >= 500;
  const allMet = memberOk && postOk && viewOk;
  const criteriaCount = [memberOk, postOk, viewOk].filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Link href={`/community/${community.slug}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" weight="bold" />
            Back to Community
          </Button>
        </Link>
        <Link href="/my-communities">
          <Button variant="ghost" size="sm">
            My Communities
          </Button>
        </Link>
      </div>

      {/* Hero */}
      <div
        className={cn(
          "bg-gradient-to-br border rounded-2xl p-6 relative overflow-hidden",
          colors.gradient,
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg",
            )}
          >
            <Crown className="w-8 h-8 text-white" weight="fill" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{community.name}</h1>
              {community.is_verified && (
                <span className="text-blue-500" title="Verified Community">
                  <SealCheck className="w-6 h-6" weight="fill" />
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your community settings
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{community.member_count || 0}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? t.id === "danger"
                    ? "border-red-500 text-red-500"
                    : t.id === "verification"
                      ? "border-blue-500 text-blue-500"
                      : "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className="w-4 h-4"
                weight={isActive ? "fill" : "regular"}
              />
              {t.label}
              {t.id === "verification" && community.is_verified && (
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-full font-bold">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        {/* ==================== GENERAL ==================== */}
        {activeTab === "general" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Community Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {name.length}/60 characters
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Slug (URL)
              </label>
              <div className="mt-1.5 flex items-center bg-muted/30 border rounded-lg overflow-hidden">
                <span className="pl-3 text-xs text-muted-foreground">
                  /community/
                </span>
                <input
                  type="text"
                  value={community.slug}
                  disabled
                  className="flex-1 px-2 py-2.5 bg-transparent text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Slug cannot be changed
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1">
                {description.length}/500
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" weight="bold" /> Tags (max 10)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  placeholder="Add tag and press Enter"
                  disabled={tags.length >= 10}
                  className="flex-1 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button onClick={addTag} disabled={tags.length >= 10}>
                  Add
                </Button>
              </div>
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

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </motion.div>
        )}

        {/* ==================== APPEARANCE ==================== */}
        {activeTab === "appearance" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
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
                      "w-12 h-12 rounded-lg transition-all",
                      c.bg,
                      color === c.name
                        ? "ring-4 ring-offset-2 ring-offset-background ring-primary scale-110"
                        : "hover:scale-105",
                    )}
                  >
                    {color === c.name && (
                      <Check
                        className="w-5 h-5 text-white mx-auto"
                        weight="bold"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full mt-1.5 px-3 py-2.5 bg-muted/30 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {coverUrl && (
                <div className="mt-2 h-32 rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => toast.error("Invalid image URL")}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </motion.div>
        )}

        {/* ==================== MEMBERS ==================== */}
        {activeTab === "members" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Community Members</h3>
                <p className="text-xs text-muted-foreground">
                  {members.length} total members
                </p>
              </div>
            </div>

            {loadingMembers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted/30 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users
                  className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2"
                  weight="duotone"
                />
                <p className="text-sm text-muted-foreground">No members yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {members.map((m: any) => {
                  const roleBadge = ROLE_LABELS[m.role] || ROLE_LABELS.member;
                  const badgeColors = COLOR_MAP[roleBadge.color];
                  const isThisMemberCreator =
                    m.user?.id === community.created_by;
                  const canManage =
                    isCreator &&
                    !isThisMemberCreator &&
                    m.user?.id !== currentUser.id;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 bg-muted/20 hover:bg-muted/30 rounded-lg transition-colors"
                    >
                      <Link href={`/profile/${m.user?.username}`}>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={m.user?.avatar_url} />
                          <AvatarFallback>
                            {m.user?.full_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/profile/${m.user?.username}`}
                          className="text-sm font-bold hover:underline block truncate"
                        >
                          {m.user?.full_name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {m.user?.tagline || "Builder"} · Joined{" "}
                          {formatDistanceToNow(new Date(m.joined_at), {
                            addSuffix: false,
                          })}{" "}
                          ago
                        </p>
                      </div>

                      <span
                        className={cn(
                          "text-[9px] px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1",
                          badgeColors.bg,
                          badgeColors.text,
                        )}
                      >
                        <roleBadge.icon className="w-2.5 h-2.5" weight="fill" />
                        {roleBadge.label}
                      </span>

                      {canManage && (
                        <div className="flex gap-1">
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleChangeRole(m.id, e.target.value)
                            }
                            className="text-xs px-2 py-1 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleRemoveMember(m.id, m.user?.full_name)
                            }
                          >
                            <UserMinus className="w-3.5 h-3.5" weight="bold" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== 🎯 NEW: VERIFICATION ==================== */}
        {activeTab === "verification" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {community.is_verified ? (
              // ✅ Already Verified
              <div className="border-2 border-blue-500/30 rounded-lg p-6 bg-blue-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <SealCheck className="w-8 h-8 text-white" weight="fill" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-500">
                      ✓ Verified Community
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your community is officially verified and trusted!
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-500/20 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-500">
                      <Users className="w-4 h-4" weight="fill" />
                      <p className="text-lg font-bold">
                        {community.member_count}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-500">
                      <ChatCircle className="w-4 h-4" weight="fill" />
                      <p className="text-lg font-bold">
                        {community.post_count}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-500">
                      <Eye className="w-4 h-4" weight="fill" />
                      <p className="text-lg font-bold">
                        {community.view_count}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Views</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/5 rounded-lg text-xs text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Info
                      className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
                      weight="fill"
                    />
                    <span>
                      Verified communities appear at the top of Discover, get
                      more visibility, and are trusted by users. Keep growing to
                      maintain your verified status!
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              // ❌ Not Verified Yet
              <>
                {/* Header */}
                <div
                  className={cn(
                    "border-2 rounded-lg p-5",
                    allMet
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-yellow-500/30 bg-yellow-500/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        allMet ? "bg-green-500/20" : "bg-yellow-500/20",
                      )}
                    >
                      <Sparkle
                        className={cn(
                          "w-6 h-6",
                          allMet ? "text-green-500" : "text-yellow-500",
                        )}
                        weight="fill"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold">
                        {allMet ? "🎉 Ready for Verification!" : "Get Verified"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {allMet
                          ? "Your community meets all criteria. Request verification now!"
                          : `Progress: ${criteriaCount}/3 criteria met`}
                      </p>
                    </div>
                    {allMet && (
                      <Button
                        onClick={handleRequestVerification}
                        disabled={checkingVerification}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {checkingVerification ? (
                          "Verifying..."
                        ) : (
                          <>
                            <SealCheck className="w-4 h-4 mr-1" weight="fill" />
                            Get Verified
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Criteria Progress */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Verification Criteria (ALL 3 required)
                  </h4>

                  {/* Rule 1: Members */}
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            memberOk ? "bg-green-500/20" : "bg-blue-500/10",
                          )}
                        >
                          {memberOk ? (
                            <Check
                              className="w-4 h-4 text-green-500"
                              weight="bold"
                            />
                          ) : (
                            <Users
                              className="w-4 h-4 text-blue-500"
                              weight="fill"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold">100+ Members</p>
                          <p className="text-[10px] text-muted-foreground">
                            {community.member_count || 0} / 100
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          memberOk ? "text-green-500" : "text-muted-foreground",
                        )}
                      >
                        {memberOk
                          ? "✓ Met"
                          : `${100 - (community.member_count || 0)} to go`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          memberOk ? "bg-green-500" : "bg-blue-500",
                        )}
                        style={{
                          width: `${Math.min(100, ((community.member_count || 0) / 100) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Rule 2: Posts */}
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            postOk ? "bg-green-500/20" : "bg-pink-500/10",
                          )}
                        >
                          {postOk ? (
                            <Check
                              className="w-4 h-4 text-green-500"
                              weight="bold"
                            />
                          ) : (
                            <ChatCircle
                              className="w-4 h-4 text-pink-500"
                              weight="fill"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold">20+ Posts</p>
                          <p className="text-[10px] text-muted-foreground">
                            {community.post_count || 0} / 20
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          postOk ? "text-green-500" : "text-muted-foreground",
                        )}
                      >
                        {postOk
                          ? "✓ Met"
                          : `${20 - (community.post_count || 0)} to go`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          postOk ? "bg-green-500" : "bg-pink-500",
                        )}
                        style={{
                          width: `${Math.min(100, ((community.post_count || 0) / 20) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Rule 3: Views */}
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            viewOk ? "bg-green-500/20" : "bg-orange-500/10",
                          )}
                        >
                          {viewOk ? (
                            <Check
                              className="w-4 h-4 text-green-500"
                              weight="bold"
                            />
                          ) : (
                            <Eye
                              className="w-4 h-4 text-orange-500"
                              weight="fill"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold">500+ Unique Views</p>
                          <p className="text-[10px] text-muted-foreground">
                            {community.view_count || 0} / 500
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          viewOk ? "text-green-500" : "text-muted-foreground",
                        )}
                      >
                        {viewOk
                          ? "✓ Met"
                          : `${500 - (community.view_count || 0)} to go`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          viewOk ? "bg-green-500" : "bg-orange-500",
                        )}
                        style={{
                          width: `${Math.min(100, ((community.view_count || 0) / 500) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info
                      className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                      weight="fill"
                    />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">Why get verified?</p>
                      <ul className="text-muted-foreground space-y-0.5 ml-4">
                        <li>• ✓ Blue checkmark badge</li>
                        <li>• 📈 Higher ranking in Discover</li>
                        <li>• 👀 More visibility to users</li>
                        <li>• 🎯 Trust signal to potential members</li>
                        <li>• ⭐ Featured in recommendations</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Check Button (if not all met but close) */}
                {!allMet && criteriaCount > 0 && (
                  <Button
                    onClick={handleRequestVerification}
                    disabled={checkingVerification}
                    variant="outline"
                    className="w-full"
                  >
                    {checkingVerification
                      ? "Checking..."
                      : "Recheck Eligibility"}
                  </Button>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ==================== PRIVACY ==================== */}
        {activeTab === "privacy" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Privacy
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setIsPublic(true)}
                  className={cn(
                    "p-4 border rounded-lg text-left transition-all",
                    isPublic
                      ? "border-primary bg-primary/10"
                      : "hover:border-primary/40",
                  )}
                >
                  <Globe
                    className={cn(
                      "w-6 h-6 mb-2",
                      isPublic ? "text-primary" : "text-muted-foreground",
                    )}
                    weight="fill"
                  />
                  <p className="text-sm font-bold">Public</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Anyone can find and join
                  </p>
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  className={cn(
                    "p-4 border rounded-lg text-left transition-all",
                    !isPublic
                      ? "border-primary bg-primary/10"
                      : "hover:border-primary/40",
                  )}
                >
                  <Lock
                    className={cn(
                      "w-6 h-6 mb-2",
                      !isPublic ? "text-primary" : "text-muted-foreground",
                    )}
                    weight="fill"
                  />
                  <p className="text-sm font-bold">Private</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invite-only community
                  </p>
                </button>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex gap-3">
              <Info
                className="w-5 h-5 text-blue-500 flex-shrink-0"
                weight="fill"
              />
              <div className="text-xs">
                <p className="font-semibold">Privacy Change Impact</p>
                <p className="text-muted-foreground mt-1">
                  {isPublic
                    ? "Public communities appear in Discover and can be joined by anyone."
                    : "Private communities are only accessible via direct invite. Existing members remain."}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </motion.div>
        )}

        {/* ==================== DANGER ZONE ==================== */}
        {activeTab === "danger" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="border-2 border-red-500/30 rounded-lg p-5 bg-red-500/5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Warning className="w-6 h-6 text-red-500" weight="fill" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-red-500">
                    Delete Community
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    This will permanently delete{" "}
                    <span className="font-bold text-foreground">
                      {community.name}
                    </span>{" "}
                    and remove ALL associated data:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-0.5 ml-4">
                    <li>• All {community.member_count || 0} members</li>
                    <li>
                      • All {community.post_count || 0} posts and comments
                    </li>
                    <li>• All events and discussions</li>
                    <li>• All bookmarks and settings</li>
                    <li>• The community URL will be lost forever</li>
                  </ul>

                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="mt-4"
                      disabled={!isCreator}
                    >
                      <Trash className="w-4 h-4 mr-1" weight="bold" />
                      Delete Community
                    </Button>
                  ) : (
                    <div className="mt-4 space-y-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-sm font-bold text-red-500">
                        ⚠️ Final Warning: This cannot be undone!
                      </p>
                      <div>
                        <label className="text-xs font-semibold">
                          Type{" "}
                          <span className="font-mono bg-muted px-1 rounded">
                            {community.name}
                          </span>{" "}
                          to confirm:
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={community.name}
                          className="w-full mt-1 px-3 py-2 bg-background border-2 border-red-500/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={
                            deleting || deleteConfirmText !== community.name
                          }
                          className="flex-1"
                        >
                          {deleting ? "Deleting..." : "Yes, Delete Forever"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isCreator && (
                    <p className="text-xs text-orange-500 mt-3">
                      ⚠️ Only the community creator can delete this community
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
