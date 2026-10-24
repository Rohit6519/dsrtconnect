"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface VideoMeetingProps {
  chatId: string;
  username: string;
  onClose: () => void;
}

export const VideoMeeting = ({
  chatId,
  username,
  onClose,
}: VideoMeetingProps) => {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit-token?room=${chatId}&username=${encodeURIComponent(username)}`,
        );
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error("Error fetching token:", e);
      }
    })();
  }, [chatId, username]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/open-mic?channel=${chatId}&meet=true`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Meeting link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (token === "") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center bg-[#0A0D1A] min-h-[450px] h-full rounded-2xl border border-white/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38bdf8] mb-4" />
        <p className="text-xs text-white/50 font-mono">
          Connecting to meeting server...
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#0A0D1A] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
      {/* Top Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-50 flex items-center justify-between pointer-events-none">
        <button
          onClick={handleCopyLink}
          className="pointer-events-auto flex items-center gap-2 bg-black/80 hover:bg-black backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all border border-white/10 shadow-lg cursor-pointer"
        >
          {copied ? (
            <Check size={15} className="text-emerald-400" />
          ) : (
            <Copy size={15} />
          )}
          {copied ? "Copied!" : "Copy Meeting Link"}
        </button>

        <button
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-1.5 bg-red-500 hover:bg-red-600 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
          title="Leave Meeting"
        >
          <X size={16} />
          <span>Leave Call</span>
        </button>
      </div>

      {/* LiveKit Meeting Interface */}
      <div className="flex-1 w-full h-full relative lk-meeting-container">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          connect={true}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          style={{ height: "100%", width: "100%" }}
          onDisconnected={onClose}
        >
          <VideoConference
            controls={{
              camera: true,
              microphone: true,
              screenShare: true,
              chat: false,
              leave: false,
            }}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
};
