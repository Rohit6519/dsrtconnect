"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { CircleNotch, PhoneDisconnect } from "@phosphor-icons/react";

interface VideoMeetingProps {
  chatId: string;
  username: string;
  onClose: () => void;
}

function ActiveMeetingControls({ onClose }: { onClose: () => void }) {
  const { localParticipant } = useLocalParticipant();

  // Force enable Camera and Mic when joined
  useEffect(() => {
    if (localParticipant) {
      localParticipant
        .setCameraEnabled(true)
        .catch((e) => console.log("Camera permission error:", e));
      localParticipant
        .setMicrophoneEnabled(true)
        .catch((e) => console.log("Mic permission error:", e));
    }
  }, [localParticipant]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
      <div className="bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 shadow-2xl">
        <ControlBar
          variation="minimal"
          controls={{
            camera: true,
            microphone: true,
            screenShare: true,
            leave: false,
            settings: false,
          }}
        />
      </div>

      <button
        onClick={onClose}
        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
        title="End Call"
      >
        <PhoneDisconnect size={26} weight="fill" />
      </button>
    </div>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "calc(100% - 80px)" }}
      className="w-full"
    >
      <ParticipantTile className="rounded-xl overflow-hidden" />
    </GridLayout>
  );
}

export default function VideoMeeting({
  chatId,
  username,
  onClose,
}: VideoMeetingProps) {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getToken() {
      try {
        const roomName = `open-mic-${chatId}`;
        const res = await fetch(
          `/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(username)}`,
        );

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            throw new Error(errData.error || `HTTP ${res.status}`);
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        }

        const data = await res.json();
        if (mounted) {
          if (data.token) {
            setToken(data.token);
          } else {
            throw new Error("No token returned from server");
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Connection failed");
        }
      }
    }

    getToken();
    return () => {
      mounted = false;
    };
  }, [chatId, username]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c] w-full h-full gap-4 p-6 text-center">
        <p className="text-red-400 font-mono text-xs max-w-lg bg-red-500/10 border border-red-500/20 p-4 rounded-xl leading-relaxed break-words">
          {error}
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          Close Meeting
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c] w-full h-full">
        <CircleNotch size={32} className="animate-spin text-[#38bdf8] mb-3" />
        <p className="text-white/50 text-sm font-medium animate-pulse">
          Connecting to meeting...
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0a0a0c] flex flex-col overflow-hidden">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={onClose}
        className="flex flex-col w-full h-full"
        data-lk-theme="default"
      >
        <div className="flex-1 min-h-0 relative">
          <MyVideoConference />
          <RoomAudioRenderer />
        </div>

        <ActiveMeetingControls onClose={onClose} />
      </LiveKitRoom>
    </div>
  );
}
