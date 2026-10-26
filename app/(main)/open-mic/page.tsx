"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker, { Theme } from "emoji-picker-react";
import dynamic from "next/dynamic";
import {
  Chats,
  Users,
  CaretDown,
  Plus,
  CircleNotch,
  Compass,
  PaperPlaneRight,
  X,
  Smiley,
  ImageSquare,
  Link as LinkIcon,
  UserPlus,
  Copy,
  Check,
  Microphone,
  MagnifyingGlass as SearchIcon,
  Trash,
  FileText,
  DownloadSimple,
  VideoCamera,
  Radio,
  LockKey,
  DotsThree,
  PencilSimple,
} from "@phosphor-icons/react";
import { DsrtAvatar } from "@/components/dsrt";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const VideoMeeting = dynamic(() => import("./components/video-meeting"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c] rounded-2xl w-full h-full">
      <CircleNotch size={32} className="animate-spin text-[#38bdf8] mb-3" />
      <p className="text-white/50 text-sm font-medium animate-pulse">
        Initializing Video Call...
      </p>
    </div>
  ),
});

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
}

interface Channel {
  id: string;
  server_id?: string | null;
  name: string;
  description?: string | null;
  type: "text" | "voice";
  category: string;
  logo_url?: string | null;
  created_by?: string | null;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: any;
}

interface MicUser {
  user_id: string;
  name: string;
  avatar: string | null;
  channel_id: string;
  is_muted: boolean;
  is_deafened: boolean;
}

export default function OpenMicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteChannelId = searchParams.get("channel");
  const inviteServerId = searchParams.get("server");
  const joinMeet = searchParams.get("meet") === "true";

  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeTextChannel, setActiveTextChannel] = useState<Channel | null>(
    null,
  );
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<Channel | null>(
    null,
  );

  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<Message | null>(
    null,
  );
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const [messageInput, setMessageInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl?: string;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showMembers, setShowMembers] = useState(true);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showServerCreateModal, setShowServerCreateModal] = useState(false);
  const [showServerBrowser, setShowServerBrowser] = useState(false);
  const [serverSearchQuery, setServerSearchQuery] = useState("");

  const [joinInputCode, setJoinInputCode] = useState("");

  const [newServerName, setNewServerName] = useState("");
  const [newServerIcon, setNewServerIcon] = useState<File | null>(null);
  const [serverIconPreview, setServerIconPreview] = useState<string | null>(
    null,
  );
  const [creatingServer, setCreatingServer] = useState(false);

  const [newChanName, setNewChanName] = useState("");
  const [newChanSlogan, setNewChanSlogan] = useState("");
  const [newChanType, setNewChanType] = useState<"text" | "voice">("text");
  const [newChanLogo, setNewChanLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [creatingChan, setCreatingChan] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isEditingSlogan, setIsEditingSlogan] = useState(false);
  const [editSloganText, setEditSloganText] = useState("");
  const [updatingSlogan, setUpdatingSlogan] = useState(false);

  const [dsrtUsers, setDsrtUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<MicUser[]>([]);
  const channelRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const serverIconInputRef = useRef<HTMLInputElement>(null);

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(serverSearchQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const raw = localStorage.getItem(`openmic_hidden_${currentUser.id}`);
      if (raw) setHiddenMessageIds(new Set(JSON.parse(raw)));
    } catch {}
  }, [currentUser?.id]);

  const persistHidden = (next: Set<string>) => {
    setHiddenMessageIds(next);
    if (currentUser?.id) {
      try {
        localStorage.setItem(
          `openmic_hidden_${currentUser.id}`,
          JSON.stringify([...next]),
        );
      } catch {}
    }
  };

  const getPlainMessageText = (msg: Message) => {
    let text = msg.content || "";
    if (text.includes("[VOICE_MESSAGE](")) return "Voice message";
    if (text.includes("[FILE_ATTACHMENT](")) {
      const match = text.match(/\[FILE_ATTACHMENT\]\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split("|");
        const name = parts[1] || "File";
        text = text.replace(match[0], "").trim();
        return text ? `${text}\n${name}` : name;
      }
    }
    return text;
  };

  const handleCopyMessage = async (msg: Message) => {
    const text = getPlainMessageText(msg);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy");
    } finally {
      setMessageMenuId(null);
    }
  };

  const handleDeleteForMe = (msgId: string) => {
    const next = new Set(hiddenMessageIds);
    next.add(msgId);
    persistHidden(next);
    setDeleteConfirmMsg(null);
    setMessageMenuId(null);
    toast.success("Message deleted for you");
  };

  const handleDeleteForEveryone = async (msg: Message) => {
    if (!currentUser || msg.user_id !== currentUser.id) {
      toast.error("You can only delete your own messages for everyone");
      return;
    }
    setDeletingMsgId(msg.id);
    try {
      const { error } = await supabase
        .from("open_mic_messages")
        .delete()
        .eq("id", msg.id)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      setDeleteConfirmMsg(null);
      setMessageMenuId(null);
      toast.success("Message deleted for everyone");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeletingMsgId(null);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewChanLogo(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectServer = (srv: Server) => {
    setActiveServer(srv);
    const ch = channels.find((c) => c.server_id === srv.id);
    if (ch) setActiveTextChannel(ch);
    else {
      const anyChan = channels.find(
        (c) => !c.server_id || c.server_id === srv.id,
      );
      if (anyChan) setActiveTextChannel(anyChan);
    }
    setShowServerBrowser(false);
    setServerSearchQuery("");
    toast.success(`Joined ${srv.name}`);
  };

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("id, full_name, username, avatar_url")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile || user);

      await fetchServersAndChannels(profile || user);
      setIsLoading(false);
    }
    init();
  }, [supabase, router]);

  const fetchServersAndChannels = async (usr: any) => {
    const { data: serverList } = await supabase
      .from("open_mic_servers")
      .select("*")
      .order("created_at", { ascending: true });

    let currentSrv: Server | null = null;
    if (serverList && serverList.length > 0) {
      setServers(serverList);
      currentSrv = serverList[0];
      setActiveServer(serverList[0]);
    } else {
      const defaultSrv: Server = {
        id: "dsrt-main",
        name: "DSRT Community",
        icon_url: null,
        owner_id: usr.id,
      };
      setServers([defaultSrv]);
      currentSrv = defaultSrv;
      setActiveServer(defaultSrv);
    }

    const { data: chanList } = await supabase
      .from("open_mic_channels")
      .select("*")
      .order("created_at", { ascending: true });

    if (chanList) {
      setChannels(chanList);

      if (inviteServerId && serverList) {
        const targetSrv = serverList.find(
          (s: Server) => s.id === inviteServerId,
        );
        if (targetSrv) {
          setActiveServer(targetSrv);
          const targetChan =
            chanList.find(
              (c: Channel) => c.server_id === targetSrv.id && c.type === "text",
            ) || chanList[0];
          if (targetChan) setActiveTextChannel(targetChan);
          toast.success(`Joined ${targetSrv.name}!`);
        }
      } else if (inviteChannelId) {
        const target = chanList.find((c: Channel) => c.id === inviteChannelId);
        if (target) {
          if (target.type === "voice") setActiveVoiceChannel(target);
          else setActiveTextChannel(target);
          if (target.server_id) {
            const srv = (serverList || []).find(
              (s: Server) => s.id === target.server_id,
            );
            if (srv) setActiveServer(srv);
          }
          toast.success(`Joined ${target.name}!`);
        }
      } else {
        const matchingChan = chanList.find(
          (c: Channel) => c.server_id === currentSrv?.id || !c.server_id,
        );
        if (matchingChan) setActiveTextChannel(matchingChan);
      }
    }
  };

  const currentServerChannels = channels.filter(
    (c) => !c.server_id || c.server_id === activeServer?.id,
  );
  const textChans = currentServerChannels.filter(
    (c) =>
      c.type === "text" &&
      c.name.toLowerCase().includes(channelSearchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (!currentUser) return;
    const room = supabase.channel("dsrt_open_mic_presence");
    channelRef.current = room;

    room.on("presence", { event: "sync" }, () => {
      const newState = room.presenceState();
      const users: MicUser[] = [];
      for (const id in newState) {
        const pArr = newState[id] as any[];
        if (pArr.length > 0) users.push(pArr[0] as MicUser);
      }
      setOnlineUsers(users);
    });

    room.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await room.track({
          user_id: currentUser.id,
          name: currentUser.full_name || currentUser.username,
          avatar: currentUser.avatar_url || null,
          channel_id: "lobby",
          is_muted: isMuted,
          is_deafened: isDeafened,
        });
      }
    });

    return () => {
      supabase.removeChannel(room);
    };
  }, [currentUser, supabase]);

  useEffect(() => {
    if (channelRef.current && currentUser) {
      channelRef.current
        .track({
          user_id: currentUser.id,
          name: currentUser.full_name || currentUser.username,
          avatar: currentUser.avatar_url || null,
          channel_id: activeVoiceChannel?.id || "lobby",
          is_muted: isMuted,
          is_deafened: isDeafened,
        })
        .catch(() => {});
    }
  }, [activeVoiceChannel, isMuted, isDeafened, currentUser]);

  useEffect(() => {
    if (!activeTextChannel) return;
    setIsVideoCall(false);
    setMessageMenuId(null);
    setDeleteConfirmMsg(null);
    setIsEditingSlogan(false);

    if (joinMeet) {
      setIsVideoCall(true);
    }

    const loadMessages = async () => {
      const { data } = await supabase
        .from("open_mic_messages")
        .select("*, user:users(id, full_name, username, avatar_url)")
        .eq("channel_id", activeTextChannel.id)
        .order("created_at", { ascending: true })
        .limit(150);
      setMessages(data || []);
      scrollToBottom();
    };
    loadMessages();

    const msgSub = supabase
      .channel(`chat:${activeTextChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "open_mic_messages",
          filter: `channel_id=eq.${activeTextChannel.id}`,
        },
        async (payload) => {
          const { data: sender } = await supabase
            .from("users")
            .select("id, full_name, username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();
          setMessages((prev) => [
            ...prev,
            { ...payload.new, user: sender } as Message,
          ]);
          scrollToBottom();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "open_mic_messages",
          filter: `channel_id=eq.${activeTextChannel.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
    };
  }, [activeTextChannel, supabase, joinMeet]);

  const scrollToBottom = () => {
    setTimeout(
      () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  };

  const handleStartVideoCall = async () => {
    if (!activeTextChannel || !currentUser) return;

    setIsVideoCall(true);

    try {
      const meetingLink = `${window.location.origin}/open-mic?channel=${activeTextChannel.id}&meet=true`;

      await supabase.from("open_mic_messages").insert({
        channel_id: activeTextChannel.id,
        user_id: currentUser.id,
        content: `🎥 **Started a Video Meeting!** \n\nClick the Video icon at the top right, or click this link to join: \n${meetingLink}`,
      });
    } catch (error) {
      console.error("Failed to send meeting notification");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;
    setPendingAttachment({ file, previewUrl });
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      (!messageInput.trim() && !pendingAttachment) ||
      !activeTextChannel ||
      sendingMsg
    )
      return;

    setSendingMsg(true);
    const currentText = messageInput.trim();
    setMessageInput("");
    setShowEmojiPicker(false);

    try {
      let finalContent = currentText;

      if (pendingAttachment) {
        const file = pendingAttachment.file;
        let publicUrl = "";
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `open_mic/attachments/${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("community-assets")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || "application/octet-stream",
          });

        if (!uploadErr && uploadData) {
          const { data: pubData } = supabase.storage
            .from("community-assets")
            .getPublicUrl(uploadData.path);
          publicUrl = pubData.publicUrl;
        } else {
          publicUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        const fileMeta = `${publicUrl}|${file.name}|${(file.size / 1024 / 1024).toFixed(1)}MB`;
        const fileTag = `[FILE_ATTACHMENT](${fileMeta})`;

        finalContent = finalContent ? `${fileTag}\n\n${finalContent}` : fileTag;
      }

      await supabase.from("open_mic_messages").insert({
        channel_id: activeTextChannel.id,
        user_id: currentUser.id,
        content: finalContent,
      });

      setPendingAttachment(null);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleEmojiSelect = (emojiObject: any) => {
    setMessageInput((prev) => prev + emojiObject.emoji);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Microphone is not supported.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        await uploadAndSendAudio(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(
        () => setRecordingDuration((p) => p + 1),
        1000,
      );
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Microphone blocked! Allow access via browser URL bar.");
      } else {
        toast.error("Microphone error.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const uploadAndSendAudio = async (blob: Blob) => {
    setSendingMsg(true);
    try {
      const fileName = `voice_${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from("community-assets")
        .upload(`open_mic/audio/${fileName}`, blob, {
          contentType: "audio/webm",
        });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("community-assets").getPublicUrl(data.path);

      const rawMsg = `[VOICE_MESSAGE](${publicUrl})`;

      await supabase.from("open_mic_messages").insert({
        channel_id: activeTextChannel!.id,
        user_id: currentUser.id,
        content: rawMsg,
      });
    } catch {
      toast.error("Failed to send voice message");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateServer = async () => {
    if (!newServerName.trim()) return;
    setCreatingServer(true);
    try {
      let iconUrl = null;
      if (newServerIcon) {
        try {
          const ext = newServerIcon.name.split(".").pop() || "png";
          const filePath = `servers/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const { data: upData, error: upErr } = await supabase.storage
            .from("community-assets")
            .upload(filePath, newServerIcon, { upsert: true });

          if (!upErr && upData) {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("community-assets")
              .getPublicUrl(upData.path);
            iconUrl = publicUrl;
          } else {
            iconUrl = serverIconPreview;
          }
        } catch {
          iconUrl = serverIconPreview;
        }
      }

      const { data: newSrv, error: srvErr } = await supabase
        .from("open_mic_servers")
        .insert({
          name: newServerName.trim(),
          icon_url: iconUrl,
          owner_id: currentUser.id,
        })
        .select()
        .single();
      if (srvErr) throw srvErr;

      const { data: newChan } = await supabase
        .from("open_mic_channels")
        .insert({
          server_id: newSrv.id,
          name: "general",
          type: "text",
          category: "Text Channels",
          created_by: currentUser.id,
        })
        .select()
        .single();

      toast.success("Server created successfully!");
      setShowServerCreateModal(false);
      setNewServerName("");
      setNewServerIcon(null);
      setServerIconPreview(null);

      const { data: updatedServers } = await supabase
        .from("open_mic_servers")
        .select("*")
        .order("created_at", { ascending: true });
      if (updatedServers) setServers(updatedServers);
      setActiveServer(newSrv);
      if (newChan) {
        setChannels((prev) => [...prev, newChan]);
        setActiveTextChannel(newChan);
      }
    } catch {
      toast.error("Failed to create server");
    } finally {
      setCreatingServer(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChanName.trim() || !activeServer) return;
    setCreatingChan(true);
    try {
      let finalLogoUrl = null;

      if (newChanLogo) {
        try {
          const ext = newChanLogo.name.split(".").pop() || "png";
          const filePath = `open_mic/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

          const { data: uploadData, error: upErr } = await supabase.storage
            .from("community-assets")
            .upload(filePath, newChanLogo, { upsert: true });

          if (!upErr && uploadData) {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("community-assets")
              .getPublicUrl(uploadData.path);
            finalLogoUrl = publicUrl;
          } else {
            finalLogoUrl = logoPreview;
          }
        } catch {
          finalLogoUrl = logoPreview;
        }
      }

      const slug = newChanName.trim().toLowerCase().replace(/\s+/g, "-");
      const { data, error } = await supabase
        .from("open_mic_channels")
        .insert({
          server_id: activeServer.id,
          name: slug,
          description: newChanSlogan.trim() || null,
          type: newChanType,
          category: newChanType === "text" ? "Text Channels" : "Voice Channels",
          logo_url: finalLogoUrl,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Channel created successfully!");

      setShowCreateModal(false);
      setNewChanName("");
      setNewChanSlogan("");
      setNewChanLogo(null);
      setLogoPreview(null);

      setChannels((prev) => [...prev, data]);
      setActiveTextChannel(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create channel");
    } finally {
      setCreatingChan(false);
    }
  };

  const handleUpdateSlogan = async () => {
    if (!activeTextChannel) return;
    setUpdatingSlogan(true);
    try {
      const updatedSlogan = editSloganText.trim();
      const { error } = await supabase
        .from("open_mic_channels")
        .update({ description: updatedSlogan || null })
        .eq("id", activeTextChannel.id);

      if (error) throw error;
      toast.success("Channel slogan updated!");

      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeTextChannel.id
            ? { ...c, description: updatedSlogan }
            : c,
        ),
      );
      setActiveTextChannel((prev) =>
        prev ? { ...prev, description: updatedSlogan } : null,
      );
      setIsEditingSlogan(false);
    } catch (err) {
      toast.error("Failed to update channel slogan");
    } finally {
      setUpdatingSlogan(false);
    }
  };

  const handleDeleteChannel = async (
    channelId: string,
    channelName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete #${channelName}? This cannot be undone.`,
      )
    )
      return;

    try {
      await supabase.from("open_mic_channels").delete().eq("id", channelId);
      toast.success(`Channel #${channelName} deleted`);
      const remainingChans = channels.filter((c) => c.id !== channelId);
      setChannels(remainingChans);

      if (activeTextChannel?.id === channelId) {
        const nextText = remainingChans.find(
          (c) =>
            c.type === "text" &&
            (!c.server_id || c.server_id === activeServer?.id),
        );
        setActiveTextChannel(nextText || null);
      }
    } catch {
      toast.error("Failed to delete channel");
    }
  };

  const handleJoinByCode = () => {
    if (!joinInputCode.trim()) return;
    let code = joinInputCode.trim();

    if (code.includes("server=")) {
      const srvId = code.split("server=")[1]?.split("&")[0];
      const targetSrv = servers.find((s) => s.id === srvId);
      if (targetSrv) {
        handleSelectServer(targetSrv);
        setShowJoinModal(false);
        setJoinInputCode("");
        return;
      }
    }

    if (code.includes("channel=")) {
      code = code.split("channel=")[1]?.split("&")[0] || code;
    }

    const target = channels.find(
      (c) => c.id === code || c.name.toLowerCase() === code.toLowerCase(),
    );
    if (target) {
      if (target.type === "voice") setActiveVoiceChannel(target);
      else setActiveTextChannel(target);
      if (target.server_id) {
        const srv = servers.find((s) => s.id === target.server_id);
        if (srv) setActiveServer(srv);
      }
      toast.success(`Joined ${target.name}!`);
      setShowJoinModal(false);
      setJoinInputCode("");
    } else {
      toast.error("Invalid link or code");
    }
  };

  const copyInviteLink = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const url = `${window.location.origin}/open-mic?channel=${channelId}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast.success("Channel invite link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const copyServerInvite = async () => {
    const activeId = activeServer?.id || servers[0]?.id || "";
    const url = `${window.location.origin}/open-mic?server=${activeId}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      toast.success("Server invite link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  useEffect(() => {
    if (!showInviteModal || !currentUser) return;

    async function loadDsrtUsers() {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, username, avatar_url")
          .neq("id", currentUser.id)
          .order("full_name", { ascending: true })
          .limit(100);

        if (error) throw error;
        setDsrtUsers(data || []);
      } catch {
        toast.error("Failed to load DSRT users");
        setDsrtUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }

    loadDsrtUsers();
  }, [showInviteModal, currentUser, supabase]);

  const filteredDsrtUsers = dsrtUsers.filter((u) => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  });

  const handleInviteUser = async (user: any) => {
    const channelId = activeTextChannel?.id || channels[0]?.id || "";
    if (!channelId) {
      toast.error("No channel selected");
      return;
    }

    setInvitingUserId(user.id);
    const inviteFullUrl = `${window.location.origin}/open-mic?channel=${channelId}`;

    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        sender_id: currentUser.id,
        type: "open_mic_invite",
        title: "Open Mic Channel Invite",
        message: `${currentUser.full_name || currentUser.username || "Someone"} invited you to join #${activeTextChannel?.name || "general"}. Click link to join!`,
        link: inviteFullUrl,
        is_read: false,
      });

      if (error) {
        await navigator.clipboard.writeText(inviteFullUrl);
        toast.info(
          `Invite link copied to clipboard! (Run SQL query in Supabase to send directly to inbox)`,
        );
      } else {
        toast.success(
          `Invite request sent to ${user.full_name || user.username}'s inbox!`,
        );
      }
    } catch {
      await navigator.clipboard.writeText(inviteFullUrl);
      toast.success(
        `Invite link copied to clipboard for ${user.full_name || user.username}!`,
      );
    } finally {
      setInvitingUserId(null);
    }
  };

  const visibleMessages = messages.filter((m) => !hiddenMessageIds.has(m.id));
  const canEditSlogan =
    activeTextChannel?.created_by === currentUser?.id ||
    activeServer?.owner_id === currentUser?.id;

  if (isLoading || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--dsrt-nav-h))] bg-[#000000] text-white">
        <CircleNotch size={36} className="animate-spin text-[#38bdf8] mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-white/50">
          Connecting to DSRT Open Mic...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--dsrt-nav-h))] w-full bg-[#000000] text-white font-sans overflow-hidden antialiased select-none p-2 gap-2">
      {messageMenuId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMessageMenuId(null)}
        />
      )}

      {/* 1. SERVER RAIL */}
      <div className="w-[72px] bg-gradient-to-b from-[#111116] to-[#050505] border border-white/[0.05] rounded-2xl flex flex-col items-center py-4 gap-3 flex-shrink-0 z-20 overflow-y-auto scrollbar-hide shadow-2xl">
        {servers.map((srv) => {
          const isActive = activeServer?.id === srv.id;
          return (
            <div
              key={srv.id}
              onClick={() => {
                setActiveServer(srv);
                const ch = channels.find((c) => c.server_id === srv.id);
                if (ch) setActiveTextChannel(ch);
              }}
              className="relative group cursor-pointer w-full flex justify-center py-0.5"
              title={srv.name}
            >
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] bg-[#38bdf8] rounded-r-full transition-all duration-300 ${isActive ? "h-10" : "h-0 group-hover:h-4"}`}
              />
              <div
                className={`w-12 h-12 flex items-center justify-center text-white transition-all duration-300 overflow-hidden shadow-sm ${isActive ? "bg-[#38bdf8] text-black font-bold rounded-2xl shadow-[0_0_15px_rgba(56,189,248,0.3)]" : "bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-[#38bdf8] hover:rounded-2xl rounded-full"}`}
              >
                {srv.icon_url ? (
                  <img
                    src={srv.icon_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-[15px]">
                    {(srv.name || "D").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div className="w-8 h-px bg-white/[0.08] my-1.5" />

        <div
          onClick={() => setShowServerCreateModal(true)}
          className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-[#23a559] hover:border-[#23a559] hover:rounded-2xl flex items-center justify-center text-[#23a559] hover:text-white transition-all duration-300 cursor-pointer"
          title="Create Server"
        >
          <Plus size={22} weight="bold" />
        </div>

        <div
          onClick={() => setShowServerBrowser(true)}
          className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-[#38bdf8] hover:border-[#38bdf8] hover:rounded-2xl flex items-center justify-center text-[#38bdf8] hover:text-black transition-all duration-300 cursor-pointer"
          title="Explore Servers"
        >
          <Compass size={22} weight="bold" />
        </div>
      </div>

      {/* 2. CHANNEL SIDEBAR */}
      <div className="w-64 bg-gradient-to-br from-[#12121a] to-[#08080a] border border-white/[0.05] rounded-2xl flex flex-col flex-shrink-0 z-10 relative overflow-hidden shadow-2xl">
        <div
          onClick={() => setShowServerMenu(!showServerMenu)}
          className="h-14 px-4 flex items-center justify-between hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-white/[0.05] relative shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Radio
              size={18}
              className="text-[#38bdf8] shrink-0"
              weight="bold"
            />
            <h1 className="font-bold text-[15px] text-white tracking-tight truncate">
              {activeServer?.name || "DSRT Community"}
            </h1>
          </div>
          <CaretDown
            size={14}
            className={`text-white/60 transition-transform ${showServerMenu ? "rotate-180" : ""}`}
          />
        </div>

        {showServerMenu && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowServerMenu(false)}
            />
            <div className="absolute top-16 left-3 right-3 z-40 bg-[#12121a] border border-white/10 rounded-xl p-2 shadow-2xl space-y-1 backdrop-blur-xl animate-in fade-in duration-150">
              <button
                onClick={() => {
                  setShowServerMenu(false);
                  setShowInviteModal(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold text-[#38bdf8] hover:bg-[#38bdf8]/10 rounded-lg transition-colors cursor-pointer"
              >
                <span>Invite People</span>
                <UserPlus size={16} weight="bold" />
              </button>
              <button
                onClick={() => {
                  setShowServerMenu(false);
                  copyServerInvite();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <span>Copy Server Link</span>
                <LinkIcon size={16} weight="bold" />
              </button>
              <button
                onClick={() => {
                  setShowServerMenu(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <span>Create Channel</span>
                <Plus size={16} weight="bold" />
              </button>
              <button
                onClick={() => {
                  setShowServerMenu(false);
                  setShowServerBrowser(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <span>Explore Servers</span>
                <Compass size={16} weight="bold" />
              </button>
            </div>
          </>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col p-3">
          <div className="mb-4">
            <div className="bg-[#000000]/40 border border-white/[0.08] rounded-xl px-3 py-1.5 flex items-center gap-2 focus-within:border-[#38bdf8]/50 transition-colors shadow-sm">
              <SearchIcon size={14} className="text-white/40" />
              <input
                type="text"
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="bg-transparent border-none outline-none text-[12.5px] text-white placeholder:text-white/30 w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10.5px] font-mono font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors cursor-default">
                  Channels
                </span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>
              <div className="space-y-1">
                {textChans.map((ch) => {
                  const isActive = activeTextChannel?.id === ch.id;
                  const canDelete =
                    ch.created_by === currentUser.id ||
                    activeServer?.owner_id === currentUser.id;

                  return (
                    <div
                      key={ch.id}
                      onClick={() => setActiveTextChannel(ch)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all group/chan ${isActive ? "bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-white font-semibold shadow-inner" : "text-white/60 hover:bg-white/[0.04] hover:text-white"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {ch.logo_url ? (
                          <img
                            src={ch.logo_url}
                            className="w-5 h-5 rounded-md object-cover"
                            alt=""
                          />
                        ) : (
                          <Chats
                            size={16}
                            className={
                              isActive ? "text-[#38bdf8]" : "text-white/40"
                            }
                            weight={isActive ? "fill" : "regular"}
                          />
                        )}
                        <span className="text-[13.5px] truncate">
                          {ch.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => copyInviteLink(ch.id, e)}
                          className="opacity-0 group-hover/chan:opacity-100 text-white/40 hover:text-[#38bdf8] transition-all p-1 hover:bg-white/10 rounded cursor-pointer"
                          title="Copy Invite Link"
                        >
                          <LinkIcon size={13} weight="bold" />
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDeleteChannel(ch.id, ch.name, e)
                            }
                            className="opacity-0 group-hover/chan:opacity-100 text-white/30 hover:text-red-400 transition-all p-1 hover:bg-red-500/10 rounded cursor-pointer"
                            title="Delete Channel"
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="h-[60px] bg-[#000000]/20 border-t border-white/[0.05] px-3 flex items-center justify-between shrink-0 shadow-lg z-20">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 p-1.5 hover:bg-white/[0.04] rounded-lg cursor-pointer transition-colors">
            <div className="relative shrink-0">
              <DsrtAvatar
                src={currentUser.avatar_url}
                name={currentUser.full_name}
                size="sm"
                className="w-9 h-9 rounded-xl border border-white/10 shadow-sm"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#23a559] border-2 border-[#08080a] rounded-full" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-white truncate leading-tight">
                {currentUser.full_name?.split(" ")[0]}
              </span>
              <span className="text-[10.5px] text-[#93c5fd] font-mono truncate mt-0.5">
                @{currentUser.username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-[#0c0c12] via-[#050505] to-[#000000] border border-white/[0.05] rounded-2xl relative shadow-2xl overflow-hidden">
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/[0.05] flex-shrink-0 z-10 bg-white/[0.01] backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTextChannel?.logo_url ? (
              <img
                src={activeTextChannel.logo_url}
                className="w-6 h-6 rounded-md object-cover shadow-sm"
                alt=""
              />
            ) : (
              <Chats
                size={24}
                className="text-[#38bdf8] shrink-0"
                weight="fill"
              />
            )}
            <h2 className="font-bold text-[16px] text-white tracking-tight truncate">
              {activeTextChannel?.name || "general"}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md ml-2 shadow-sm">
              <LockKey size={12} weight="fill" /> E2E Encrypted
            </span>
          </div>
          <div className="flex items-center gap-3 text-white/50">
            <button
              onClick={handleStartVideoCall}
              className={`p-2 rounded-xl hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer shadow-sm ${isVideoCall ? "text-[#38bdf8] bg-[#38bdf8]/10" : ""}`}
              title="Start Video Meeting"
            >
              <VideoCamera
                size={20}
                weight={isVideoCall ? "fill" : "regular"}
              />
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-xl hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer shadow-sm ${showMembers ? "text-white bg-white/[0.08]" : ""}`}
            >
              <Users size={18} weight="bold" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between p-6 min-h-0 relative">
          {isVideoCall ? (
            <div className="flex-1 flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl border border-white/[0.05]">
              <VideoMeeting
                chatId={activeTextChannel?.id || "general"}
                username={
                  currentUser?.full_name || currentUser?.username || "Guest"
                }
                onClose={() => setIsVideoCall(false)}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                <div className="mb-8 pt-6 border-b border-white/[0.05] pb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#38bdf8]/20 to-[#2563eb]/10 border border-[#38bdf8]/30 rounded-[20px] flex items-center justify-center mb-4 text-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.15)] overflow-hidden">
                    {activeTextChannel?.logo_url ? (
                      <img
                        src={activeTextChannel.logo_url}
                        className="w-full h-full object-cover rounded-[20px]"
                        alt=""
                      />
                    ) : (
                      <Chats size={36} weight="duotone" />
                    )}
                  </div>
                  <h1 className="text-[28px] font-extrabold text-white mb-2 tracking-tight">
                    Welcome to #{activeTextChannel?.name}!
                  </h1>

                  {isEditingSlogan ? (
                    <div className="mt-3 flex items-center gap-2 max-w-lg">
                      <input
                        value={editSloganText}
                        onChange={(e) => setEditSloganText(e.target.value)}
                        placeholder="Set a catchy slogan for this channel..."
                        className="flex-1 bg-[#000000]/40 border border-[#38bdf8]/50 rounded-lg px-3 py-1.5 outline-none text-[13.5px] text-white shadow-inner"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateSlogan();
                          if (e.key === "Escape") setIsEditingSlogan(false);
                        }}
                      />
                      <button
                        onClick={handleUpdateSlogan}
                        disabled={updatingSlogan}
                        className="bg-[#38bdf8] hover:bg-[#2ab0ec] text-black px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors disabled:opacity-50"
                      >
                        {updatingSlogan ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditingSlogan(false)}
                        className="text-white/50 hover:text-white px-2 text-[13px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1 group">
                      <p className="text-[14px] text-white/50 leading-relaxed">
                        {activeTextChannel?.description
                          ? activeTextChannel.description
                          : `This is the start of the #${activeTextChannel?.name || "channel"} channel on DSRT Open Mic. All messages are E2E encrypted.`}
                      </p>
                      {canEditSlogan && (
                        <button
                          onClick={() => {
                            setEditSloganText(
                              activeTextChannel?.description || "",
                            );
                            setIsEditingSlogan(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-[#38bdf8] transition-all p-1.5 hover:bg-white/5 rounded-md cursor-pointer"
                          title="Edit Channel Slogan"
                        >
                          <PencilSimple size={15} weight="bold" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {visibleMessages.map((msg) => {
                  const isAudio = msg.content.includes("[VOICE_MESSAGE](");
                  const isFile = msg.content.includes("[FILE_ATTACHMENT](");
                  const isMine = msg.user_id === currentUser.id;

                  let fileMetaStr = "";
                  let textBody = msg.content;

                  if (isFile) {
                    const match = msg.content.match(
                      /\[FILE_ATTACHMENT\]\(([^)]+)\)/,
                    );
                    if (match) {
                      fileMetaStr = match[1];
                      textBody = msg.content.replace(match[0], "").trim();
                    }
                  }

                  let fileUrl = "",
                    fileName = "Attached File",
                    fileSize = "";
                  if (fileMetaStr) {
                    const parts = fileMetaStr.split("|");
                    fileUrl = parts[0] || "";
                    fileName = parts[1] || "File";
                    fileSize = parts[2] || "";
                  }

                  const isImage =
                    isFile && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
                  const isVideo =
                    isFile && /\.(mp4|webm|mov|mkv)$/i.test(fileName);

                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-4 hover:bg-white/[0.02] -mx-4 px-4 py-2 rounded-2xl group transition-colors relative"
                    >
                      <DsrtAvatar
                        src={msg.user?.avatar_url}
                        name={msg.user?.full_name || "User"}
                        size="md"
                        className="w-10 h-10 rounded-xl mt-0.5 shrink-0 cursor-pointer shadow-sm border border-white/5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[14.5px] font-bold text-white hover:underline cursor-pointer tracking-tight">
                            {msg.user?.full_name ||
                              msg.user?.username ||
                              "User"}
                          </span>
                          <span className="text-[11px] text-white/40 font-mono">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {isAudio && (
                          <div className="mt-2 bg-[#000000]/60 w-fit rounded-full pr-4 p-1.5 flex items-center gap-2 border border-white/10 shadow-sm backdrop-blur-md">
                            <audio
                              controls
                              src={msg.content.slice(16, -1)}
                              className="h-10 outline-none max-w-[250px] custom-audio"
                            />
                          </div>
                        )}

                        {isFile && (
                          <div className="mt-2 max-w-md">
                            {isImage ? (
                              <div className="rounded-2xl overflow-hidden border border-white/10 max-h-80 bg-black/40 shadow-sm">
                                <img
                                  src={fileUrl}
                                  alt={fileName}
                                  className="w-full h-full object-cover max-h-80"
                                />
                              </div>
                            ) : isVideo ? (
                              <div className="rounded-2xl overflow-hidden border border-white/10 max-h-80 bg-black shadow-sm">
                                <video
                                  controls
                                  src={fileUrl}
                                  className="w-full max-h-80"
                                />
                              </div>
                            ) : (
                              <a
                                href={fileUrl}
                                target="_blank"
                                download={fileName}
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all group/file shadow-sm backdrop-blur-sm"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] shrink-0">
                                    <FileText size={20} weight="bold" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13.5px] font-semibold text-white truncate group-hover/file:text-[#38bdf8] transition-colors">
                                      {fileName}
                                    </p>
                                    <p className="text-[11px] text-white/40 font-mono mt-0.5">
                                      {fileSize}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 group-hover/file:bg-white group-hover/file:text-black transition-colors shadow-sm">
                                  <DownloadSimple size={16} weight="bold" />
                                </div>
                              </a>
                            )}
                          </div>
                        )}

                        {textBody && (
                          <p className="text-[14.5px] text-white/80 leading-[1.6] break-words mt-1 font-sans select-text whitespace-pre-wrap">
                            {textBody}
                          </p>
                        )}
                      </div>

                      {/* 3-dot menu: Copy + Delete */}
                      <div className="relative shrink-0 self-start mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMessageMenuId(
                              messageMenuId === msg.id ? null : msg.id,
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          title="Message options"
                        >
                          <DotsThree size={18} weight="bold" />
                        </button>

                        {messageMenuId === msg.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer text-left"
                            >
                              <Copy size={15} />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMessageMenuId(null);
                                setDeleteConfirmMsg(msg);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left border-t border-white/[0.06]"
                            >
                              <Trash size={15} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {showEmojiPicker && (
                <div className="absolute bottom-20 right-6 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-2 fade-in">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={handleEmojiSelect}
                    lazyLoadEmojis={true}
                    searchPlaceHolder="Search emoji..."
                  />
                </div>
              )}

              <div className="pt-3 relative">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <form
                  onSubmit={handleSendMessage}
                  className="bg-[#000000]/60 backdrop-blur-xl border border-white/[0.08] focus-within:border-[#38bdf8]/50 rounded-2xl p-3.5 flex flex-col gap-3 transition-all shadow-2xl"
                >
                  {pendingAttachment && (
                    <div className="p-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        {pendingAttachment.previewUrl ? (
                          <img
                            src={pendingAttachment.previewUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] shrink-0 shadow-sm">
                            <FileText size={20} weight="bold" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-white truncate">
                            {pendingAttachment.file.name}
                          </p>
                          <p className="text-[11px] text-white/40 font-mono">
                            {(
                              pendingAttachment.file.size /
                              1024 /
                              1024
                            ).toFixed(1)}{" "}
                            MB · Ready to send
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Remove attachment"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="text-white/40 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] p-2 rounded-xl shrink-0 cursor-pointer disabled:opacity-40 shadow-sm"
                      title="Attach file"
                    >
                      {uploadingFile ? (
                        <CircleNotch
                          size={16}
                          className="animate-spin text-[#38bdf8]"
                        />
                      ) : (
                        <Plus size={18} weight="bold" />
                      )}
                    </button>

                    {isRecording ? (
                      <div className="flex-1 flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg animate-pulse shadow-sm border border-red-500/20">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <span className="font-semibold text-[13.5px]">
                          Recording Voice Note... {recordingDuration}s
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={`Message #${activeTextChannel?.name || "channel"}`}
                        className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 text-[14.5px] min-w-0"
                      />
                    )}

                    <div className="flex items-center gap-2 text-white/40 shrink-0">
                      {!isRecording && (
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2 transition-colors cursor-pointer rounded-xl ${showEmojiPicker ? "bg-white/10 text-[#38bdf8]" : "hover:bg-white/5 hover:text-white"}`}
                        >
                          <Smiley
                            size={22}
                            weight={showEmojiPicker ? "fill" : "regular"}
                          />
                        </button>
                      )}

                      {isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="text-red-400 hover:text-red-300 p-2 bg-red-500/20 rounded-xl transition-colors cursor-pointer shadow-md"
                        >
                          <PaperPlaneRight size={18} weight="fill" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="hover:text-white p-2 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                          title="Send Voice Note"
                        >
                          <Microphone size={20} weight="bold" />
                        </button>
                      )}

                      {!isRecording &&
                        (messageInput.trim().length > 0 ||
                          pendingAttachment !== null) && (
                          <button
                            type="submit"
                            disabled={sendingMsg}
                            className="text-[#38bdf8] hover:text-white transition-colors cursor-pointer p-1"
                          >
                            {sendingMsg ? (
                              <CircleNotch size={20} className="animate-spin" />
                            ) : (
                              <PaperPlaneRight size={24} weight="fill" />
                            )}
                          </button>
                        )}
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. RIGHT MEMBER LIST */}
      {showMembers && (
        <div className="w-60 bg-gradient-to-bl from-[#12121a] to-[#08080a] border border-white/[0.05] rounded-2xl hidden lg:flex flex-col flex-shrink-0 shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide py-5 px-3">
            <h3 className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 font-bold mb-3 px-2">
              Online — {onlineUsers.length}
            </h3>
            <div className="space-y-1">
              {onlineUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.03] cursor-pointer group transition-colors"
                >
                  <div className="relative shrink-0">
                    <DsrtAvatar
                      src={u.avatar}
                      name={u.name}
                      size="sm"
                      className="w-8 h-8 rounded-xl border border-white/10 shadow-sm"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#12121a] rounded-full" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13.5px] font-semibold text-white/80 group-hover:text-white truncate leading-tight transition-colors">
                      {u.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM POPUP - TRANSPARENT BLURRY PROFESSIONAL GLASS LOOK */}
      {deleteConfirmMsg && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteConfirmMsg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl p-6 overflow-hidden
              bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02]
              backdrop-blur-2xl
              border border-white/[0.12]
              shadow-[0_20px_70px_-10px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)_inset]
              ring-1 ring-white/5
              animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Ambient glow effects */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#38bdf8]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Subtle top highlight */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            <div className="relative">
              <button
                onClick={() => setDeleteConfirmMsg(null)}
                className="absolute -top-1 -right-1 w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer backdrop-blur-sm"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-3 mb-2 pr-8">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500/25 to-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10 backdrop-blur-sm shrink-0">
                  <Trash size={20} weight="bold" />
                </div>
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  Delete message?
                </h2>
              </div>

              <p className="text-[13px] text-white/60 mb-5 leading-relaxed pl-1">
                Choose how you want to remove this message.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleDeleteForMe(deleteConfirmMsg.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                    bg-white/[0.04] hover:bg-white/[0.08]
                    border border-white/[0.08] hover:border-white/[0.15]
                    backdrop-blur-md
                    text-white text-[13.5px] font-semibold
                    transition-all duration-150 cursor-pointer
                    active:scale-[0.98]
                    shadow-sm hover:shadow-md"
                >
                  <Trash size={16} />
                  Delete for me
                </button>

                {deleteConfirmMsg.user_id === currentUser.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteForEveryone(deleteConfirmMsg)}
                    disabled={deletingMsgId === deleteConfirmMsg.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                      bg-gradient-to-r from-red-600 to-red-500
                      hover:from-red-500 hover:to-red-400
                      border border-red-400/30
                      text-white text-[13.5px] font-semibold
                      shadow-lg shadow-red-500/30
                      transition-all duration-150 cursor-pointer
                      active:scale-[0.98]
                      disabled:opacity-50"
                  >
                    {deletingMsgId === deleteConfirmMsg.id ? (
                      <CircleNotch size={16} className="animate-spin" />
                    ) : (
                      <Trash size={16} weight="bold" />
                    )}
                    Delete for everyone
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDeleteConfirmMsg(null)}
                  className="w-full px-4 py-2.5 text-[13px] text-white/50 hover:text-white transition-colors cursor-pointer font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}
      {showServerBrowser && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08080a] border border-white/[0.1] w-full max-w-md rounded-3xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setShowServerBrowser(false);
                setServerSearchQuery("");
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer z-10"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Compass size={22} className="text-[#38bdf8]" weight="bold" />
              <h2 className="text-xl font-bold text-white">Explore Servers</h2>
            </div>
            <p className="text-[13px] text-white/50 mb-4">
              Search and join any server on DSRT Open Mic.
            </p>

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 flex items-center gap-2 mb-4 focus-within:border-[#38bdf8]/50 transition-colors shadow-inner">
              <SearchIcon size={16} className="text-white/40 shrink-0" />
              <input
                type="text"
                value={serverSearchQuery}
                onChange={(e) => setServerSearchQuery(e.target.value)}
                placeholder="Search servers by name..."
                className="bg-transparent border-none outline-none text-[13.5px] text-white placeholder:text-white/30 w-full"
                autoFocus
              />
              {serverSearchQuery && (
                <button
                  type="button"
                  onClick={() => setServerSearchQuery("")}
                  className="text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[360px] space-y-1.5 scrollbar-hide pr-1">
              {filteredServers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <Compass size={32} className="mb-3 opacity-40" />
                  <span className="text-[13px]">
                    {serverSearchQuery.trim()
                      ? "No servers found"
                      : "No servers available"}
                  </span>
                </div>
              ) : (
                filteredServers.map((srv) => {
                  const isActive = activeServer?.id === srv.id;
                  const chanCount = channels.filter(
                    (c) => c.server_id === srv.id,
                  ).length;
                  return (
                    <button
                      key={srv.id}
                      onClick={() => handleSelectServer(srv)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-left group ${
                        isActive
                          ? "bg-[#38bdf8]/15 border border-[#38bdf8]/30 shadow-inner"
                          : "hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm ${
                          isActive
                            ? "bg-[#38bdf8] text-black"
                            : "bg-white/[0.06] border border-white/10 text-white/70"
                        }`}
                      >
                        {srv.icon_url ? (
                          <img
                            src={srv.icon_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-[14px]">
                            {(srv.name || "D").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[14px] font-bold truncate ${isActive ? "text-white" : "text-white/90 group-hover:text-white"}`}
                        >
                          {srv.name}
                        </p>
                        <p className="text-[11px] text-white/40 font-mono mt-0.5">
                          {chanCount} channel{chanCount !== 1 ? "s" : ""}
                          {isActive ? " · Current" : ""}
                        </p>
                      </div>
                      {isActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-1 rounded-md">
                          Active
                        </span>
                      ) : (
                        <span className="text-[12px] font-semibold text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity">
                          Join →
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/[0.05] pt-4 mt-3 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowServerBrowser(false);
                  setShowJoinModal(true);
                }}
                className="text-[13px] text-[#38bdf8] hover:underline font-medium cursor-pointer"
              >
                Join with invite link
              </button>
              <button
                onClick={() => {
                  setShowServerBrowser(false);
                  setShowServerCreateModal(true);
                }}
                className="bg-white text-black hover:bg-zinc-200 text-[13px] font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
              >
                Create Server
              </button>
            </div>
          </div>
        </div>
      )}

      {showServerCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08080a] border border-white/[0.1] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center relative p-6">
            <button
              onClick={() => setShowServerCreateModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">
              Create a Server
            </h2>
            <p className="text-[13px] text-white/50 mb-6">
              Your server is where you and your community hang out.
            </p>

            <div className="flex flex-col items-center mb-6">
              <div
                onClick={() => serverIconInputRef.current?.click()}
                className="w-20 h-20 bg-white/[0.03] border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center cursor-pointer hover:border-[#38bdf8] transition-colors overflow-hidden relative group shadow-md"
              >
                {serverIconPreview ? (
                  <img
                    src={serverIconPreview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageSquare
                    size={28}
                    className="text-white/40 group-hover:text-[#38bdf8]"
                  />
                )}
              </div>
              <input
                ref={serverIconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setNewServerIcon(f);
                    const r = new FileReader();
                    r.onload = () => setServerIconPreview(r.result as string);
                    r.readAsDataURL(f);
                  }
                }}
              />
            </div>

            <div className="text-left mb-6">
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 font-bold block mb-2">
                SERVER NAME
              </label>
              <input
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder={`${currentUser?.full_name}'s Server`}
                className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl px-4 py-3 outline-none focus:border-[#38bdf8] text-[14px] text-white shadow-inner"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/[0.05]">
              <button
                onClick={() => {
                  setShowServerCreateModal(false);
                  setShowJoinModal(true);
                }}
                className="text-[13px] text-[#38bdf8] hover:underline font-medium cursor-pointer"
              >
                Join a Server
              </button>
              <button
                onClick={handleCreateServer}
                disabled={!newServerName.trim() || creatingServer}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-[13.5px] font-bold px-6 py-2.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                {creatingServer && (
                  <CircleNotch className="animate-spin" size={16} />
                )}
                Create Server
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08080a] border border-white/[0.1] w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-4 tracking-tight">
              Create Channel
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 font-bold block mb-2">
                  CHANNEL NAME
                </label>
                <div className="relative">
                  <Chats
                    size={16}
                    className="absolute left-3 top-3.5 text-white/40"
                    weight="fill"
                  />
                  <input
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    placeholder="new-channel"
                    className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#38bdf8] text-[14px] text-white shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 font-bold block mb-2">
                  CHANNEL SLOGAN (OPTIONAL)
                </label>
                <div className="relative">
                  <PencilSimple
                    size={16}
                    className="absolute left-3 top-3.5 text-white/40"
                  />
                  <input
                    value={newChanSlogan}
                    onChange={(e) => setNewChanSlogan(e.target.value)}
                    placeholder="Brief description or topic..."
                    className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-[#38bdf8] text-[14px] text-white shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 font-bold block mb-2">
                  CHANNEL LOGO (OPTIONAL)
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 bg-white/[0.03] border border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#38bdf8] transition-colors overflow-hidden shadow-sm"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageSquare size={22} className="text-white/40" />
                    )}
                  </div>
                  <span className="text-[12px] text-white/40">
                    Upload custom icon
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.05]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[13px] font-medium text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChanName.trim() || creatingChan}
                className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-[13.5px] font-bold px-5 py-2 rounded-full transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                {creatingChan && (
                  <CircleNotch className="animate-spin" size={16} />
                )}
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08080a] border border-white/[0.1] w-full max-w-md rounded-3xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setShowInviteModal(false);
                setUserSearchQuery("");
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer z-10"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Invite People</h2>
            <p className="text-[13px] text-white/50 mb-4">
              Search DSRT members or share an invite link for #
              {activeTextChannel?.name || "channel"}.
            </p>

            <div className="bg-[#000000]/40 border border-white/[0.08] rounded-xl px-3 py-2 flex items-center gap-2 mb-3 focus-within:border-[#38bdf8]/50 transition-colors shadow-inner">
              <SearchIcon size={16} className="text-white/40 shrink-0" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search DSRT people..."
                className="bg-transparent border-none outline-none text-[13.5px] text-white placeholder:text-white/30 w-full"
                autoFocus
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery("")}
                  className="text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[280px] mb-4 space-y-1 scrollbar-hide pr-1">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 text-white/40">
                  <CircleNotch
                    size={24}
                    className="animate-spin text-[#38bdf8] mb-2"
                  />
                  <span className="text-[12px] font-mono">
                    Loading DSRT members...
                  </span>
                </div>
              ) : filteredDsrtUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-white/40">
                  <Users size={28} className="mb-2 opacity-50" />
                  <span className="text-[13px]">
                    {userSearchQuery.trim()
                      ? "No users found"
                      : "No DSRT members found"}
                  </span>
                </div>
              ) : (
                filteredDsrtUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <DsrtAvatar
                        src={u.avatar_url}
                        name={u.full_name || u.username || "User"}
                        size="sm"
                        className="w-9 h-9 rounded-xl border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-white truncate leading-tight">
                          {u.full_name || "User"}
                        </p>
                        <p className="text-[11px] text-[#93c5fd] font-mono truncate">
                          @{u.username || "user"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInviteUser(u)}
                      disabled={invitingUserId === u.id}
                      className="shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8] hover:text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {invitingUserId === u.id ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <UserPlus size={14} weight="bold" />
                      )}
                      Invite
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 font-bold mb-2">
                Or share invite link
              </p>
              <div className="flex items-center bg-[#000000]/40 border border-white/[0.1] rounded-xl p-1.5 pl-3 shadow-inner">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/open-mic?channel=${activeTextChannel?.id || ""}`}
                  className="bg-transparent flex-1 text-[12px] text-white/70 outline-none font-mono truncate min-w-0"
                />
                <button
                  onClick={() => copyServerInvite()}
                  className="bg-white text-black hover:bg-zinc-200 text-[13px] font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  {copiedLink ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#08080a] border border-white/[0.1] w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-1">Join a Server</h2>
            <p className="text-[13px] text-white/50 mb-5">
              Enter an invite link or code below to join.
            </p>

            <div className="mb-6">
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 font-bold block mb-2">
                INVITE LINK OR ID
              </label>
              <input
                value={joinInputCode}
                onChange={(e) => setJoinInputCode(e.target.value)}
                placeholder="e.g. http://localhost:3000/open-mic?server=xyz"
                className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl px-4 py-3 outline-none focus:border-[#38bdf8] text-[14px] text-white shadow-inner"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/[0.05]">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setShowServerCreateModal(true);
                }}
                className="text-[13px] text-[#38bdf8] hover:underline font-medium cursor-pointer"
              >
                Create a Server instead
              </button>
              <button
                onClick={handleJoinByCode}
                disabled={!joinInputCode.trim()}
                className="bg-white text-black hover:bg-zinc-200 text-[13.5px] font-bold px-6 py-2.5 rounded-full transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                Join Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
