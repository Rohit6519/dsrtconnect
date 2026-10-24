"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  X,
  Trash2,
  Eye,
  Globe,
  Crown,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface DeleteMessageModalProps {
  message: any;
  currentUserId: string;
  isPlatformAdmin: boolean;
  isCommunityCreator: boolean;
  onClose: () => void;
  onDelete: (mode: "for_me" | "for_everyone" | "admin") => Promise<void>;
}

export function DeleteMessageModal({
  message,
  currentUserId,
  isPlatformAdmin,
  isCommunityCreator,
  onClose,
  onDelete,
}: DeleteMessageModalProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const isSender = message.user_id === currentUserId;
  const messageAge = Date.now() - new Date(message.created_at).getTime();
  const oneHour = 60 * 60 * 1000;
  const withinHour = messageAge < oneHour;

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const remaining =
        oneHour - (Date.now() - new Date(message.created_at).getTime());
      setTimeLeft(Math.max(0, remaining));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [message.created_at]);

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "Expired";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins} min left`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m left`;
  };

  const handleDelete = async (mode: "for_me" | "for_everyone" | "admin") => {
    setDeleting(mode);
    try {
      await onDelete(mode);
      onClose();
    } catch (e) {
      setDeleting(null);
    }
  };

  const getMediaIcon = () => {
    switch (message.media_type) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <VideoIcon className="w-4 h-4" />;
      case "audio":
        return <Mic className="w-4 h-4" />;
      case "file":
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMediaLabel = () => {
    switch (message.media_type) {
      case "image":
        return "Photo";
      case "video":
        return "Video";
      case "audio":
        return "Voice message";
      case "file":
        return "File";
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPlatformAdmin ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-base font-semibold">Platform Admin</h3>
                </>
              ) : isCommunityCreator && !isSender ? (
                <>
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-base font-semibold">Community Creator</h3>
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-semibold">Delete message?</h3>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message Preview */}
          <div className="px-5 py-3 bg-muted/30 border-b">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Message from {message.users?.full_name || "User"}
            </p>
            <div className="flex items-start gap-2">
              {message.media_type && (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {getMediaIcon()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {message.media_type && (
                  <p className="text-xs font-medium">{getMediaLabel()}</p>
                )}
                {message.content && (
                  <p className="text-sm line-clamp-2 mt-0.5">
                    {message.content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-4 space-y-2">
            {/* Platform Admin Option */}
            {isPlatformAdmin && !isSender && (
              <button
                onClick={() => handleDelete("admin")}
                disabled={!!deleting}
                className="w-full text-left p-4 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all group disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    {deleting === "admin" ? (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      Remove as Platform Admin
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deletes for all users
                      {message.media_url && " • Removes file from storage"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Community Creator Option */}
            {isCommunityCreator && !isPlatformAdmin && !isSender && (
              <button
                onClick={() => handleDelete("admin")}
                disabled={!!deleting}
                className="w-full text-left p-4 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500 transition-all disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    {deleting === "admin" ? (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                    ) : (
                      <Crown className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      Remove as Community Creator
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deletes for all members
                      {message.media_url && " • Removes file from storage"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Delete for Everyone (Sender within 1 hour) */}
            {isSender && (
              <button
                onClick={() => handleDelete("for_everyone")}
                disabled={!withinHour || !!deleting}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  withinHour && !deleting
                    ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500"
                    : "border-border bg-muted/30 opacity-60 cursor-not-allowed",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      withinHour ? "bg-red-500/20" : "bg-muted",
                    )}
                  >
                    {deleting === "for_everyone" ? (
                      <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                    ) : (
                      <Globe
                        className={cn(
                          "w-5 h-5",
                          withinHour ? "text-red-500" : "text-muted-foreground",
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          withinHour
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        Delete for everyone
                      </p>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span
                          className={cn(
                            "font-medium",
                            timeLeft > 0 ? "text-orange-500" : "text-red-500",
                          )}
                        >
                          {formatTimeLeft(timeLeft)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {withinHour
                        ? `Removes for all members${message.media_url ? " • Deletes file" : ""}`
                        : "Time limit expired (1 hour)"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Delete for Me (ALWAYS available) */}
            <button
              onClick={() => handleDelete("for_me")}
              disabled={!!deleting}
              className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {deleting === "for_me" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Eye className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Delete for me</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only you won&apos;t see it. Others still can.
                  </p>
                </div>
              </div>
            </button>

            {/* Warning for media */}
            {message.media_url &&
              (isPlatformAdmin ||
                isCommunityCreator ||
                (isSender && withinHour)) && (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-orange-700 dark:text-orange-400">
                    <strong>Warning:</strong> Deleting for everyone will
                    permanently remove the {getMediaLabel()?.toLowerCase()}{" "}
                    file. This cannot be undone.
                  </p>
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={!!deleting}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
