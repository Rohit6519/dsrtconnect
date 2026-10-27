"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  Users,
  CircleNotch,
  SpeakerHigh,
  WarningCircle,
} from "@phosphor-icons/react";

type Participant = {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  stream?: MediaStream;
};

type Signal = {
  from: string;
  to?: string;
  kind: "join" | "offer" | "answer" | "ice" | "leave";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  username?: string;
  avatarUrl?: string | null;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function VoiceChannelSession({
  channelId,
  channelName,
  username,
  userId,
  avatarUrl,
  onLeave,
}: {
  channelId: string;
  channelName: string;
  username: string;
  userId: string;
  avatarUrl?: string | null;
  onLeave?: () => void;
}) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const roomRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const disposedRef = useRef(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [connectionState, setConnectionState] = useState("Connecting");

  const sendSignal = useCallback(async (payload: Signal) => {
    const room = roomRef.current;
    if (!room) return;
    const result = await room.send({
      type: "broadcast",
      event: "signal",
      payload,
    });
    if (result && result !== "ok" && result !== "timed out") {
      console.warn("Supabase voice signal status:", result);
    }
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    peersRef.current.delete(peerId);
    pendingIceRef.current.delete(peerId);
    audioRefs.current.delete(peerId);
    setParticipants((prev) => prev.filter((p) => p.userId !== peerId));
  }, []);

  const createPeer = useCallback(
    (peerId: string, peerName: string, peerAvatar: string | null) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(peerId, pc);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal({
            from: userId,
            to: peerId,
            kind: "ice",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (!stream) return;
        setParticipants((prev) => {
          const found = prev.find((p) => p.userId === peerId);
          const person: Participant = {
            userId: peerId,
            username: peerName,
            avatarUrl: peerAvatar,
            stream,
          };
          return found
            ? prev.map((p) => (p.userId === peerId ? { ...p, ...person } : p))
            : [...prev, person];
        });
        const audio = audioRefs.current.get(peerId);
        if (audio && audio.srcObject !== stream) {
          audio.srcObject = stream;
          void audio
            .play()
            .then(() => setAudioBlocked(false))
            .catch(() => setAudioBlocked(true));
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") setConnectionState("Connected");
        if (state === "connecting") setConnectionState("Connecting");
        if (state === "failed") {
          setConnectionState("Connection failed");
          setError(
            "A voice connection failed. Some networks require a TURN server; try rejoining.",
          );
        }
        if (state === "disconnected") setConnectionState("Reconnecting");
        if (state === "closed") closePeer(peerId);
      };

      setParticipants((prev) =>
        prev.some((p) => p.userId === peerId)
          ? prev
          : [
              ...prev,
              { userId: peerId, username: peerName, avatarUrl: peerAvatar },
            ],
      );

      return pc;
    },
    [closePeer, sendSignal, userId],
  );

  const flushPendingIce = useCallback(
    async (peerId: string, pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current.get(peerId) || [];
      pendingIceRef.current.delete(peerId);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Could not apply queued ICE candidate:", e);
        }
      }
    },
    [],
  );

  const handleSignal = useCallback(
    async (payload: Signal) => {
      if (
        !payload ||
        payload.from === userId ||
        (payload.to && payload.to !== userId)
      )
        return;

      if (payload.kind === "leave") {
        closePeer(payload.from);
        return;
      }

      if (payload.kind === "join") {
        // Only one side creates the offer, avoiding duplicate offers.
        if (userId.localeCompare(payload.from) < 0) {
          const pc = createPeer(
            payload.from,
            payload.username || "Member",
            payload.avatarUrl || null,
          );
          if (pc.signalingState === "stable" && !pc.localDescription) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendSignal({
                from: userId,
                to: payload.from,
                kind: "offer",
                sdp: offer,
              });
            } catch (e) {
              console.error("Voice offer creation failed:", e);
            }
          }
        }
        return;
      }

      const pc =
        peersRef.current.get(payload.from) ||
        createPeer(
          payload.from,
          payload.username || "Member",
          payload.avatarUrl || null,
        );

      try {
        if (payload.kind === "offer" && payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushPendingIce(payload.from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal({
            from: userId,
            to: payload.from,
            kind: "answer",
            sdp: answer,
          });
        } else if (payload.kind === "answer" && payload.sdp) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload.sdp),
            );
            await flushPendingIce(payload.from, pc);
          }
        } else if (payload.kind === "ice" && payload.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            const queue = pendingIceRef.current.get(payload.from) || [];
            queue.push(payload.candidate);
            pendingIceRef.current.set(payload.from, queue);
          }
        }
      } catch (e) {
        console.warn("Voice signaling step failed:", e);
      }
    },
    [closePeer, createPeer, flushPendingIce, sendSignal, userId],
  );

  useEffect(() => {
    let disposed = false;
    disposedRef.current = false;
    let room: any;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Microphone access requires HTTPS or localhost. Open the site securely and try again.",
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setParticipants([{ userId, username, avatarUrl }]);

        room = supabase.channel(`voice-room-${channelId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: userId },
          },
        });
        roomRef.current = room;

        room.on(
          "broadcast",
          { event: "signal" },
          ({ payload }: { payload: Signal }) => {
            void handleSignal(payload);
          },
        );

        room.on("presence", { event: "sync" }, () => {
          const state = room.presenceState() as Record<string, any[]>;
          const present: Participant[] = Object.entries(state).flatMap(
            ([id, metas]) => {
              if (id === userId) return [];
              const meta = metas?.[0] || {};
              return [
                {
                  userId: id,
                  username: meta.username || "Member",
                  avatarUrl: meta.avatarUrl || null,
                },
              ];
            },
          );
          setParticipants((prev) => {
            const streamPeers = prev.filter(
              (p) => p.userId !== userId && p.stream,
            );
            const byId = new Map<string, Participant>();
            present.forEach((p) => byId.set(p.userId, p));
            streamPeers.forEach((p) =>
              byId.set(p.userId, { ...byId.get(p.userId), ...p }),
            );
            byId.set(userId, { userId, username, avatarUrl });
            return [...byId.values()];
          });
        });

        room.subscribe(async (status: string) => {
          if (status === "SUBSCRIBED" && !disposed) {
            await room.track({
              username,
              avatarUrl,
              joinedAt: new Date().toISOString(),
            });
            setConnecting(false);
            setConnectionState("Waiting for members");
            await sendSignal({
              from: userId,
              kind: "join",
              username,
              avatarUrl,
            });

            // Re-negotiate with users already in the room; deterministic initiator avoids glare.
            const state = room.presenceState() as Record<string, any[]>;
            for (const [id, metas] of Object.entries(state)) {
              if (id !== userId && userId.localeCompare(id) < 0) {
                const meta = metas?.[0] || {};
                const pc = createPeer(
                  id,
                  meta.username || "Member",
                  meta.avatarUrl || null,
                );
                if (!pc.localDescription && pc.signalingState === "stable") {
                  try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await sendSignal({
                      from: userId,
                      to: id,
                      kind: "offer",
                      sdp: offer,
                    });
                  } catch (e) {
                    console.error("Voice offer creation failed:", e);
                  }
                }
              }
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setError(
              "Could not connect to the voice room. Check Supabase Realtime is enabled and try again.",
            );
            setConnecting(false);
            setConnectionState("Disconnected");
          }
        });
      } catch (e: any) {
        setError(
          e?.message ||
            "Could not access your microphone. Check browser permission and try again.",
        );
        setConnecting(false);
        setConnectionState("Disconnected");
      }
    };

    void start();

    return () => {
      disposed = true;
      disposedRef.current = true;
      if (roomRef.current) {
        void sendSignal({ from: userId, kind: "leave" });
        void supabase.removeChannel(roomRef.current);
        roomRef.current = null;
      }
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      pendingIceRef.current.clear();
      audioRefs.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [
    channelId,
    userId,
    username,
    avatarUrl,
    supabase,
    sendSignal,
    createPeer,
    handleSignal,
  ]);

  // Explicitly tear down the voice session before leaving the screen.
  // This also works when microphone permission was denied and no stream exists.
  const leavingRef = useRef(false);
  const handleLeave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    disposedRef.current = true;

    // Close the UI immediately; network cleanup must not block Disconnect.
    onLeave?.();

    const localStream = localStreamRef.current;
    localStreamRef.current = null;
    localStream?.getTracks().forEach((track) => {
      track.enabled = false;
      track.stop();
    });

    peersRef.current.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });
    peersRef.current.clear();
    pendingIceRef.current.clear();

    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioRefs.current.clear();

    const room = roomRef.current;
    roomRef.current = null;

    // Fire-and-forget cleanup: never wait on realtime before disconnecting.
    if (room) {
      try {
        void room
          .send({
            type: "broadcast",
            event: "signal",
            payload: { from: userId, kind: "leave" },
          })
          .catch((e: unknown) =>
            console.warn("Could not send voice leave signal:", e),
          );
      } catch (e) {
        console.warn("Could not send voice leave signal:", e);
      }
      try {
        void supabase
          .removeChannel(room)
          .catch((e: unknown) =>
            console.warn("Could not remove voice channel:", e),
          );
      } catch (e) {
        console.warn("Could not remove voice channel:", e);
      }
    }

    setParticipants([]);
    setMuted(false);
    setConnecting(false);
    setConnectionState("Disconnected");
  }, [onLeave, supabase, userId]);

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  };

  const enableAudio = async () => {
    const elements = Array.from(audioRefs.current.values());
    try {
      await Promise.all(elements.map((el) => el.play()));
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(true);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#08080b] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-400">
            Voice channel
          </p>
          <h2 className="mt-1 text-lg font-bold">{channelName}</h2>
          <p className="text-xs text-white/45">
            {connectionState} • {participants.length} participant
            {participants.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={handleLeave}
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
        >
          <PhoneDisconnect className="mr-2 inline" size={17} />
          Leave
        </button>
      </header>

      {connecting && (
        <div className="flex items-center gap-2 px-5 py-3 text-sm text-white/60">
          <CircleNotch className="animate-spin" /> Requesting microphone and
          joining voice room…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="m-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <WarningCircle className="mr-2 inline" size={18} />
          {error}
          <p className="mt-2 text-xs text-red-100/70">
            Allow microphone access. Use HTTPS or localhost. Other participants
            must join this same voice channel. If users are on different
            networks, a TURN server may be required.
          </p>
        </div>
      )}

      {audioBlocked && (
        <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <span>Browser blocked incoming audio playback.</span>
          <button
            onClick={enableAudio}
            className="shrink-0 rounded-lg bg-amber-400/20 px-3 py-2"
          >
            <SpeakerHigh className="mr-1 inline" /> Enable audio
          </button>
        </div>
      )}

      <div className="grid flex-1 content-start grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((person) => (
          <div
            key={person.userId}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/15 font-bold text-emerald-200">
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                person.username.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {person.username}
                {person.userId === userId ? " (You)" : ""}
              </p>
              <p className="text-xs text-white/45">
                {person.userId === userId
                  ? muted
                    ? "Microphone muted"
                    : "Microphone connected"
                  : "Voice participant"}
              </p>
            </div>
            {person.userId !== userId && (
              <audio
                autoPlay
                playsInline
                ref={(el) => {
                  if (!el) {
                    audioRefs.current.delete(person.userId);
                    return;
                  }
                  audioRefs.current.set(person.userId, el);
                  if (person.stream && el.srcObject !== person.stream) {
                    el.srcObject = person.stream;
                    void el
                      .play()
                      .then(() => setAudioBlocked(false))
                      .catch(() => setAudioBlocked(true));
                  }
                }}
                className="hidden"
              />
            )}
          </div>
        ))}
        {participants.length === 1 && !error && (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/45 sm:col-span-2 lg:col-span-3">
            <Users className="mb-2" size={22} />
            You are in the channel. Other members can join by selecting this
            same voice channel.
          </div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 p-4">
        <button
          onClick={toggleMute}
          disabled={!!error || connecting}
          className={`rounded-xl px-5 py-3 text-sm font-semibold ${muted ? "bg-red-500/20 text-red-200" : "bg-white/10 hover:bg-white/15"}`}
        >
          {muted ? (
            <MicrophoneSlash className="mr-2 inline" size={18} />
          ) : (
            <Microphone className="mr-2 inline" size={18} />
          )}
          {muted ? "Unmute" : "Mute microphone"}
        </button>
        <button
          onClick={handleLeave}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500"
        >
          <PhoneDisconnect className="mr-2 inline" size={18} />
          Disconnect
        </button>
      </footer>
    </div>
  );
}
