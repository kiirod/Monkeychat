"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  username: string;
  handle: string;
  pfp_url: string | null;
  verified?: boolean;
}

interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  other_user: Profile;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  image_url?: string | null;
  deleted?: boolean;
}

// ── SVGs ──────────────────────────────────────────────────────────────────────

const LoadingSpinner = ({ size = 36 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"
    style={{ animation: "spin 1.4s linear infinite", width: size, height: size }}>
    <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2" />
      <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z" />
    </g>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M14.2639 15.9375L12.5958 14.2834C11.7909 13.4851 11.3884 13.086 10.9266 12.9401C10.5204 12.8118 10.0838 12.8165 9.68048 12.9536C9.22188 13.1095 8.82814 13.5172 8.04068 14.3326L4.04409 18.2801M14.2639 15.9375L14.6053 15.599C15.4112 14.7998 15.8141 14.4002 16.2765 14.2543C16.6831 14.126 17.12 14.1311 17.5236 14.2687C17.9824 14.4251 18.3761 14.8339 19.1634 15.6514L20 16.4934M14.2639 15.9375L18.275 19.9565M18.275 19.9565C17.9176 20 17.4543 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.71569 19.5903 4.40973 19.2843 4.21799 18.908C4.12796 18.7313 4.07512 18.5321 4.04409 18.2801M18.275 19.9565C18.5293 19.9256 18.7301 19.8727 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V16.4934M4.04409 18.2801C4 17.9221 4 17.4575 4 16.8V7.2C4 6.0799 4 5.51984 4.21799 5.09202C4.40973 4.71569 4.71569 4.40973 5.09202 4.21799C5.51984 4 6.07989 4 7.2 4H16.8C17.9201 4 18.4802 4 18.908 4.21799C19.2843 4.40973 19.5903 4.71569 19.782 5.09202C20 5.51984 20 6.0799 20 7.2V16.4934M17 8.99989C17 10.1045 16.1046 10.9999 15 10.9999C13.8954 10.9999 13 10.1045 13 8.99989C13 7.89532 13.8954 6.99989 15 6.99989C16.1046 6.99989 17 7.89532 17 8.99989Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={14} height={14}>
    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.1168 19.1042C18.0504 20.1554 17.1886 21 16.135 21H7.86502C6.81138 21 5.94962 20.1554 5.88316 19.1042L5 6H19Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NewChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const OwnerBadge = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={13} height={13} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 3 }}>
    <path d="M12 3a3.6 3.6 0 00-3.05 1.68 3.6 3.6 0 00-.9-.1 3.6 3.6 0 00-2.42 1.06 3.6 3.6 0 00-.94 3.32A3.6 3.6 0 003 12a3.6 3.6 0 001.69 3.05 3.6 3.6 0 00.95 3.32 3.6 3.6 0 003.35.96A3.6 3.6 0 0012 21a3.6 3.6 0 003.04-1.67 3.6 3.6 0 004.3-4.3A3.6 3.6 0 0021 12a3.6 3.6 0 00-1.67-3.04v0a3.6 3.6 0 00-4.3-4.3A3.6 3.6 0 0012 3z"/>
    <path d="M15 10l-4 4"/><path d="M9 12l2 2"/>
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ url, username, size = 36 }: { url: string | null; username: string; size?: number }) {
  const initials = username?.slice(0, 2).toUpperCase() ?? "??";
  if (url) return <img src={url} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#646669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, color: "#fff" }}>
      {initials}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

async function stripImageMetadata(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], "image.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ── New Conversation Modal ────────────────────────────────────────────────────

function NewChatModal({
  currentUser,
  onClose,
  onOpen,
}: {
  currentUser: Profile;
  onClose: () => void;
  onOpen: (conv: Conversation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, handle, pfp_url, verified")
        .or(`username.ilike.%${query}%,handle.ilike.%${query}%`)
        .neq("id", currentUser.id)
        .limit(8);
      setResults((data as Profile[]) ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUser.id]);

  async function startConversation(other: Profile) {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(participant_a.eq.${currentUser.id},participant_b.eq.${other.id}),and(participant_a.eq.${other.id},participant_b.eq.${currentUser.id})`)
      .single();

    if (existing) {
      onOpen({ ...existing, other_user: other, unread_count: 0 });
      return;
    }

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ participant_a: currentUser.id, participant_b: other.id })
      .select()
      .single();

    if (newConv) onOpen({ ...newConv, other_user: other, unread_count: 0 });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#2c2e31", borderRadius: 14, padding: 24, width: "100%", maxWidth: 400, border: "1px solid #3a3d42", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ color: "#e2b714", fontSize: 17, fontWeight: 700, margin: 0 }}>New Message</h2>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or handle..."
          style={{ background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
        {loading && <div style={{ color: "#646669", fontSize: 13, textAlign: "center" }}>Searching...</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
          {results.map((u) => (
            <button key={u.id} onClick={() => startConversation(u)}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3d42")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <Avatar url={u.pfp_url} username={u.username} size={36} />
              <div>
                <div style={{ color: "#e2b714", fontSize: 14, fontWeight: 700 }}>
                  {u.username}{u.verified && <OwnerBadge />}
                </div>
                <div style={{ color: "#646669", fontSize: 12 }}>@{u.handle}</div>
              </div>
            </button>
          ))}
          {!loading && query && results.length === 0 && (
            <div style={{ color: "#646669", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat View ─────────────────────────────────────────────────────────────────

function ChatView({
  conversation,
  currentUser,
  onBack,
}: {
  conversation: Conversation;
  currentUser: Profile;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const other = conversation.other_user;

  // Load messages
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);

      // Mark all as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", currentUser.id);
    }
    load();
  }, [conversation.id, currentUser.id]);

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);
        // Mark as read if it's from the other person
        if (msg.sender_id !== currentUser.id) {
          supabase.from("messages").update({ read: true }).eq("id", msg.id);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === payload.new.id ? payload.new as Message : m));
      })
      .subscribe();

    // Typing indicator channel
    const typingChannel = supabase
      .channel(`typing-${conversation.id}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id !== currentUser.id) {
          setOtherTyping(true);
          setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversation.id, currentUser.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  function handleTyping() {
    supabase.channel(`typing-${conversation.id}`).send({
      type: "broadcast", event: "typing",
      payload: { user_id: currentUser.id },
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
  }

  async function sendMessage() {
    if ((!text.trim() && !imageFile) || sending) return;
    setSending(true);

    let image_url: string | null = null;
    if (imageFile) {
      const stripped = await stripImageMetadata(imageFile);
      const path = `dm_${Date.now()}.jpg`;
      const { data } = await supabase.storage.from("post-images").upload(path, stripped);
      if (data) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(data.path);
        image_url = urlData.publicUrl;
      }
    }

    const { data: msg } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      content: text.trim(),
      image_url,
      read: false,
    }).select().single();

    if (msg) {
      // Update conversation last message
      await supabase.from("conversations").update({
        last_message: text.trim() || "📷 Image",
        last_message_at: new Date().toISOString(),
        last_sender_id: currentUser.id,
      }).eq("id", conversation.id);
    }

    setText("");
    setImageFile(null);
    setImagePreview(null);
    setSending(false);
  }

  async function deleteMessage(msgId: string) {
    await supabase.from("messages").update({ deleted: true, content: "" }).eq("id", msgId);
  }

  // Group messages by date
  function groupByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of msgs) {
      const d = new Date(msg.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }

  const groups = groupByDate(messages);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 12, background: "#2c2e31", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#646669", padding: 0, display: "flex", marginRight: 4 }}>
          <BackIcon />
        </button>
        <a href={`https://post.mtgoals.cc/users/${other.handle}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
          <Avatar url={other.pfp_url} username={other.username} size={38} />
        </a>
        <div>
          <div style={{ color: "#e2b714", fontWeight: 700, fontSize: 15 }}>
            {other.username}{other.verified && <OwnerBadge />}
          </div>
          <div style={{ color: "#646669", fontSize: 12 }}>@{other.handle}</div>
        </div>
        <a href={`https://post.mtgoals.cc/users/${other.handle}`} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: "auto", color: "#646669", fontSize: 12, textDecoration: "none", opacity: 0.6 }}>
          View profile ↗
        </a>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
        {groups.length === 0 && (
          <div style={{ textAlign: "center", color: "#646669", marginTop: "auto", marginBottom: "auto", fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <div>Start a conversation with <span style={{ color: "#e2b714" }}>@{other.username}</span></div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
              <div style={{ flex: 1, height: 1, background: "#3a3d42" }} />
              <span style={{ color: "#646669", fontSize: 11, whiteSpace: "nowrap" }}>{group.date}</span>
              <div style={{ flex: 1, height: 1, background: "#3a3d42" }} />
            </div>

            {group.messages.map((msg, i) => {
              const isMe = msg.sender_id === currentUser.id;
              const prevMsg = group.messages[i - 1];
              const sameAsPrev = prevMsg?.sender_id === msg.sender_id;
              const showAvatar = !isMe && !sameAsPrev;

              return (
                <div key={msg.id}
                  style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: sameAsPrev ? 2 : 8 }}>
                  {/* Other user avatar — only on first message in a run */}
                  {!isMe && (
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {showAvatar && <Avatar url={other.pfp_url} username={other.username} size={28} />}
                    </div>
                  )}

                  <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {showAvatar && (
                      <span style={{ color: "#646669", fontSize: 11, marginBottom: 3, marginLeft: 4 }}>@{other.username}</span>
                    )}

                    <div style={{ position: "relative" }} className="msg-wrapper">
                      {msg.deleted ? (
                        <div style={{
                          background: "#3a3d42", borderRadius: 12, padding: "8px 14px",
                          color: "#646669", fontSize: 13, fontStyle: "italic",
                          borderBottomLeftRadius: isMe ? 12 : (sameAsPrev ? 12 : 4),
                          borderBottomRightRadius: isMe ? (sameAsPrev ? 12 : 4) : 12,
                        }}>
                          Message deleted
                        </div>
                      ) : (
                        <>
                          {msg.image_url && (
                            <img src={msg.image_url} alt="img"
                              style={{ maxWidth: "100%", borderRadius: 10, display: "block", marginBottom: msg.content ? 4 : 0, maxHeight: 280, objectFit: "cover" }} />
                          )}
                          {msg.content && (
                            <div style={{
                              background: isMe ? "#e2b714" : "#3a3d42",
                              color: isMe ? "#323437" : "#d1d0c5",
                              borderRadius: 12, padding: "8px 14px", fontSize: 14, lineHeight: 1.4,
                              wordBreak: "break-word",
                              borderBottomLeftRadius: isMe ? 12 : (sameAsPrev ? 12 : 4),
                              borderBottomRightRadius: isMe ? (sameAsPrev ? 12 : 4) : 12,
                            }}>
                              {msg.content}
                            </div>
                          )}
                        </>
                      )}

                      {/* Delete button on hover (own messages only) */}
                      {isMe && !msg.deleted && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          title="Delete message"
                          style={{
                            position: "absolute", top: "50%", right: "calc(100% + 6px)", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer", color: "#646669",
                            opacity: 0, transition: "opacity 0.15s", padding: 4,
                          }}
                          className="delete-btn">
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    <span style={{ color: "#646669", fontSize: 10, marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                      {formatMessageTime(msg.created_at)}
                      {isMe && msg.read && <span style={{ marginLeft: 4 }}>✓✓</span>}
                      {isMe && !msg.read && <span style={{ marginLeft: 4 }}>✓</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {otherTyping && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 4 }}>
            <Avatar url={other.pfp_url} username={other.username} size={28} />
            <div style={{ background: "#3a3d42", borderRadius: "12px 12px 12px 4px", padding: "10px 16px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#646669", animation: `bounce 1.2s ease ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div style={{ padding: "8px 20px", borderTop: "1px solid #3a3d42", background: "#2c2e31" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={imagePreview} alt="preview" style={{ maxHeight: 120, borderRadius: 8, objectFit: "cover" }} />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }}
              style={{ position: "absolute", top: -6, right: -6, background: "#ca4754", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #3a3d42", background: "#2c2e31", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <input ref={imageRef} type="file" accept=".jpeg,.jpg,.png,.webp,.avif" style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setImageFile(f);
            setImagePreview(URL.createObjectURL(f));
          }} />
        <button onClick={() => imageRef.current?.click()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#646669", padding: 4, display: "flex", flexShrink: 0, transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d0c5")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#646669")}>
          <ImageIcon />
        </button>
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={`Message @${other.username}...`}
          maxLength={2000}
          style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={sendMessage} disabled={sending || (!text.trim() && !imageFile)}
          style={{
            background: (sending || (!text.trim() && !imageFile)) ? "#3a3d42" : "#e2b714",
            color: (sending || (!text.trim() && !imageFile)) ? "#646669" : "#323437",
            border: "none", borderRadius: 10, width: 40, height: 40, cursor: (sending || (!text.trim() && !imageFile)) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s",
          }}>
          {sending ? <LoadingSpinner size={18} /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function ChatApp() {
  const [step, setStep] = useState<"loading" | "login" | "app">("loading");
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loginHandle, setLoginHandle] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // Restore session
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("id, username, handle, pfp_url, verified").eq("id", session.user.id).single();
        if (profile) {
          setCurrentUser(profile as Profile);
          setStep("app");
          return;
        }
      }
      setStep("login");
    }
    init();
  }, []);

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;
    loadConversations();
  }, [currentUser]);

  // Auto-open DM from ?dm=handle query param (set by /[username] redirect)
  const searchParams = useSearchParams();
  useEffect(() => {
    const dmHandle = searchParams.get("dm");
    if (!dmHandle || !currentUser || step !== "app") return;

    async function openDM() {
      const { data: other } = await supabase
        .from("profiles")
        .select("id, username, handle, pfp_url, verified")
        .eq("handle", dmHandle!.toLowerCase())
        .single();

      if (!other || other.id === currentUser!.id) return;

      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .or(`and(participant_a.eq.${currentUser!.id},participant_b.eq.${other.id}),and(participant_a.eq.${other.id},participant_b.eq.${currentUser!.id})`)
        .single();

      if (existing) {
        setActiveConv({ ...existing, other_user: other as Profile, unread_count: 0 });
      } else {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ participant_a: currentUser!.id, participant_b: other.id })
          .select()
          .single();
        if (newConv) setActiveConv({ ...newConv, other_user: other as Profile, unread_count: 0 });
      }

      // Clear the query param from the URL without re-navigating
      window.history.replaceState({}, "", "/");
    }

    openDM();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, step, searchParams]);

  async function loadConversations() {
    if (!currentUser) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_a.eq.${currentUser.id},participant_b.eq.${currentUser.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!data) return;

    // Fetch other user profiles
    const enriched = await Promise.all(data.map(async (conv) => {
      const otherId = conv.participant_a === currentUser.id ? conv.participant_b : conv.participant_a;
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("id, username, handle, pfp_url, verified")
        .eq("id", otherId)
        .single();

      // Count unread
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("read", false)
        .neq("sender_id", currentUser.id);

      return {
        ...conv,
        other_user: otherProfile as Profile,
        unread_count: count ?? 0,
      } as Conversation;
    }));

    setConversations(enriched);
    setTotalUnread(enriched.reduce((sum, c) => sum + c.unread_count, 0));
  }

  // Realtime: new messages update conversation list
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => {
        loadConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  async function handleLogin() {
    if (!loginHandle.trim() || !loginPassword) { setLoginError("Please fill in both fields."); return; }
    setLoggingIn(true);
    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${loginHandle.toLowerCase()}@monkeypost.local`,
      password: loginPassword,
    });
    if (error || !data.user) {
      setLoginError("Invalid handle or password.");
      setLoggingIn(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("id, username, handle, pfp_url, verified").eq("id", data.user.id).single();
    if (!profile) { setLoginError("Account not found."); setLoggingIn(false); return; }
    setCurrentUser(profile as Profile);
    setStep("app");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setConversations([]);
    setActiveConv(null);
    setStep("login");
  }

  // ── Login screen ──────────────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#323437" }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <LoadingSpinner />
      </div>
    );
  }

  if (step === "login") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace" }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "100%", maxWidth: 380, padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px" }}>monkeypost</div>
            <div style={{ color: "#646669", fontSize: 14, marginTop: 2 }}>chat</div>
          </div>
          <input
            value={loginHandle}
            onChange={(e) => setLoginHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16))}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Handle"
            style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none" }}
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none" }}
          />
          {loginError && <div style={{ color: "#ca4754", fontSize: 13 }}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loggingIn}
            style={{ background: loggingIn ? "#3a3d42" : "#e2b714", border: "none", borderRadius: 8, padding: "13px 0", color: loggingIn ? "#646669" : "#323437", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: loggingIn ? "not-allowed" : "pointer" }}>
            {loggingIn ? "Signing in..." : "Sign in"}
          </button>
          <div style={{ color: "#646669", fontSize: 12, textAlign: "center" }}>
            Use your <a href="https://post.mtgoals.cc" style={{ color: "#e2b714", textDecoration: "none" }}>Monkeypost</a> handle and password.
          </div>
        </div>
      </div>
    );
  }

  // ── App ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100vh", display: "flex", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        .msg-wrapper:hover .delete-btn { opacity: 1 !important; }
      `}</style>

      {showNewChat && currentUser && (
        <NewChatModal
          currentUser={currentUser}
          onClose={() => setShowNewChat(false)}
          onOpen={(conv) => {
            setActiveConv(conv);
            setShowNewChat(false);
            loadConversations();
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: activeConv ? 0 : "100%",
        maxWidth: 360, flexShrink: 0,
        borderRight: "1px solid #3a3d42",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.2s",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 10 }}>
          <a href="https://post.mtgoals.cc" style={{ fontSize: 18, fontWeight: 700, color: "#e2b714", textDecoration: "none", letterSpacing: "-0.5px", marginRight: "auto" }}>
            monkeypost <span style={{ color: "#646669", fontWeight: 400, fontSize: 14 }}>chat</span>
          </a>
          {totalUnread > 0 && (
            <span style={{ background: "#e2b714", color: "#323437", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "2px 7px" }}>
              {totalUnread}
            </span>
          )}
          <button onClick={() => setShowNewChat(true)} title="New message"
            style={{ background: "#3a3d42", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: "#d1d0c5", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#464a50")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3a3d42")}>
            <NewChatIcon />
          </button>
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#646669", fontSize: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              No conversations yet.<br />
              <span style={{ opacity: 0.6, fontSize: 13 }}>Press + to start one.</span>
            </div>
          )}
          {conversations.map((conv) => (
            <button key={conv.id}
              onClick={() => setActiveConv(conv)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px", background: activeConv?.id === conv.id ? "#2c2e31" : "none",
                border: "none", borderLeft: activeConv?.id === conv.id ? "2px solid #e2b714" : "2px solid transparent",
                cursor: "pointer", textAlign: "left", transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { if (activeConv?.id !== conv.id) (e.currentTarget as HTMLButtonElement).style.background = "#2c2e3166"; }}
              onMouseLeave={(e) => { if (activeConv?.id !== conv.id) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar url={conv.other_user?.pfp_url} username={conv.other_user?.username ?? "?"} size={44} />
                {conv.unread_count > 0 && (
                  <span style={{
                    position: "absolute", top: -2, right: -2, background: "#e2b714", color: "#323437",
                    borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #323437",
                  }}>
                    {conv.unread_count > 9 ? "9+" : conv.unread_count}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.other_user?.username}{conv.other_user?.verified && <OwnerBadge />}
                  </span>
                  {conv.last_message_at && (
                    <span style={{ color: "#646669", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                      {formatTime(conv.last_message_at)}
                    </span>
                  )}
                </div>
                <div style={{ color: conv.unread_count > 0 ? "#d1d0c5" : "#646669", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: conv.unread_count > 0 ? 600 : 400 }}>
                  {conv.last_sender_id === currentUser?.id && <span style={{ color: "#646669" }}>You: </span>}
                  {conv.last_message ?? <span style={{ fontStyle: "italic", opacity: 0.6 }}>No messages yet</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Current user footer */}
        {currentUser && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar url={currentUser.pfp_url} username={currentUser.username} size={32} />
            <span style={{ color: "#e2b714", fontSize: 13, fontWeight: 700, flex: 1 }}>@{currentUser.username}</span>
            <button onClick={handleLogout}
              style={{ background: "none", border: "none", color: "#646669", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", borderRadius: 6, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ca4754")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#646669")}>
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {activeConv && currentUser ? (
          <ChatView
            key={activeConv.id}
            conversation={activeConv}
            currentUser={currentUser}
            onBack={() => { setActiveConv(null); loadConversations(); }}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#646669" }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 16, color: "#d1d0c5" }}>Your messages</div>
            <div style={{ fontSize: 13 }}>Select a conversation or start a new one.</div>
            <button onClick={() => setShowNewChat(true)}
              style={{ marginTop: 8, background: "#e2b714", border: "none", borderRadius: 8, padding: "10px 20px", color: "#323437", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
              New Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ChatApp />
    </Suspense>
  );
}
