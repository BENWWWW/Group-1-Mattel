"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email: string;
  avatar_url?: string;
  department?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function ChatWidget() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Draggable states
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContactRef = useRef<Profile | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragActive = useRef(false);

  // Sync ref to avoid stale closures in realtime events
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile && !error) {
            setCurrentUser(profile);
          }
        }
      } catch (err) {
        console.error("Error fetching user in ChatWidget:", err);
      }
    };
    fetchUser();
  }, []);

  // Fetch unread messages
  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("receiver_id", currentUser.id)
          .eq("is_read", false);

        if (data && !error) {
          setUnreadMessages(data);
        }
      } catch (err) {
        console.error("Error fetching unread messages:", err);
      }
    };

    fetchUnreadMessages();
  }, [currentUser]);

  // Fetch contacts based on role
  useEffect(() => {
    if (!currentUser) return;

    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        let query = supabase.from("profiles").select("*").eq("is_active", true);

        if (currentUser.role === "vendor") {
          query = query.in("role", ["supervisor", "admin"]);
        } else if (currentUser.role === "supervisor") {
          query = query.in("role", ["admin", "vendor"]);
        } else if (currentUser.role === "admin") {
          query = query.in("role", ["supervisor", "vendor"]);
        }

        const { data, error } = await query;
        if (data && !error) {
          setContacts(
            data.filter(
              (u) => u.id !== currentUser.id && u.full_name !== "Admin Mattel"
            )
          );
        }
      } catch (err) {
        console.error("Error fetching contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [currentUser]);

  // Fetch messages between currentUser and selectedContact
  useEffect(() => {
    if (!currentUser || !selectedContact) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`
          )
          .order("created_at", { ascending: true });

        if (data && !error) {
          setMessages(data);

          const hasUnread = data.some(
            (m) =>
              m.sender_id === selectedContact.id &&
              m.receiver_id === currentUser.id &&
              !m.is_read
          );
          if (hasUnread) {
            await markMessagesAsRead(selectedContact.id);
          }
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime messages in thread
    const channel = supabase
      .channel(`chat_${currentUser.id}_${selectedContact.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUser.id &&
              newMsg.receiver_id === selectedContact.id) ||
            (newMsg.sender_id === selectedContact.id &&
              newMsg.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (newMsg.receiver_id === currentUser.id) {
              await markMessagesAsRead(selectedContact.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedContact]);

  // Subscribe to all incoming messages globally
  useEffect(() => {
    if (!currentUser) return;

    const globalChannel = supabase
      .channel(`global_unread_${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.receiver_id === currentUser.id) {
            if (isOpen && selectedContactRef.current?.id === newMsg.sender_id) {
              await supabase
                .from("chat_messages")
                .update({ is_read: true })
                .eq("id", newMsg.id);
            } else {
              setUnreadMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (updatedMsg.receiver_id === currentUser.id && updatedMsg.is_read) {
            setUnreadMessages((prev) =>
              prev.filter((m) => m.id !== updatedMsg.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [currentUser, isOpen]);

  // Mark messages as read when opening panel
  useEffect(() => {
    if (isOpen && selectedContact) {
      markMessagesAsRead(selectedContact.id);
    }
  }, [isOpen, selectedContact]);

  const markMessagesAsRead = async (senderId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("receiver_id", currentUser.id)
        .eq("is_read", false);

      if (!error) {
        setUnreadMessages((prev) =>
          prev.filter((m) => m.sender_id !== senderId)
        );
      }
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedContact || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: currentUser.id,
          receiver_id: selectedContact.id,
          message: messageText,
        })
        .select()
        .single();

      if (data && !error) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleSelectContact = async (contact: Profile) => {
    setSelectedContact(contact);
    await markMessagesAsRead(contact.id);
  };

  // Drag handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Left click only

    const buttonElement = e.currentTarget;
    const container = buttonElement.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
    };
    dragActive.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (
        Math.abs(moveEvent.clientX - dragStart.current.x) > 5 ||
        Math.abs(moveEvent.clientY - dragStart.current.y) > 5
      ) {
        dragActive.current = true;
        setIsDragging(true);
      }

      let newX = moveEvent.clientX - dragOffset.current.x;
      let newY = moveEvent.clientY - dragOffset.current.y;

      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      newX = Math.max(8, Math.min(newX, maxX - 8));
      newY = Math.max(8, Math.min(newY, maxY - 8));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Delayed reset of isDragging to allow click handler to see it
      setTimeout(() => setIsDragging(false), 50);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Drag handlers (Touch/Mobile)
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    const buttonElement = e.currentTarget;
    const container = buttonElement.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragOffset.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    dragActive.current = false;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      if (
        Math.abs(moveTouch.clientX - dragStart.current.x) > 5 ||
        Math.abs(moveTouch.clientY - dragStart.current.y) > 5
      ) {
        dragActive.current = true;
        setIsDragging(true);
      }

      let newX = moveTouch.clientX - dragOffset.current.x;
      let newY = moveTouch.clientY - dragOffset.current.y;

      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      newX = Math.max(8, Math.min(newX, maxX - 8));
      newY = Math.max(8, Math.min(newY, maxY - 8));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      setTimeout(() => setIsDragging(false), 50);
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleButtonClick = () => {
    if (dragActive.current) {
      dragActive.current = false;
      return;
    }
    setIsOpen(!isOpen);
  };

  // Only render if a user is logged in
  if (!currentUser) return null;

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic positioning style
  const containerStyle: React.CSSProperties =
    position.x !== -1
      ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
        }
      : {
          right: "32px",
          bottom: "120px", // 120px places it cleanly above the 40px + 64px = 104px FAB add-asset button
        };

  // Dynamic panel orientation based on position on screen
  const isLeftHalf =
    position.x !== -1 &&
    position.x < (typeof window !== "undefined" ? window.innerWidth / 2 : 500);
  const panelAlignmentClass = isLeftHalf ? "left-0" : "right-0";

  const isTopHalf =
    position.y !== -1 &&
    position.y < (typeof window !== "undefined" ? window.innerHeight / 2 : 400);
  const panelVerticalClass = isTopHalf ? "top-20" : "bottom-20";

  return (
    <div
      style={containerStyle}
      className="fixed z-[9999] transition-shadow duration-150"
    >
      {/* Floating Toggle Button */}
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleButtonClick}
        className={`w-16 h-16 bg-[#D32F2F] text-white rounded-full border-2 border-[#1A1A1A] flex items-center justify-center transition-all cursor-grab active:cursor-grabbing shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 border-none select-none ${
          isDragging ? "opacity-90 scale-105" : ""
        }`}
        title="Hubungi Supervisor / Vendor (Drag untuk memindahkan)"
      >
        <span className="material-symbols-outlined text-3xl text-white pointer-events-none">
          {isOpen ? "close" : "forum"}
        </span>
        {!isOpen && unreadMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1.5 bg-[#D32F2F] border-2 border-[#1A1A1A] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-md pointer-events-none">
            {unreadMessages.length}
          </span>
        )}
      </button>

      {/* Floating Chat Box Panel */}
      {isOpen && (
        <aside
          className={`absolute ${panelVerticalClass} ${panelAlignmentClass} w-80 h-[480px] bg-white border-4 border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-[9999] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300`}
        >
          {/* Header */}
          <header className="bg-[#1A1A1A] text-white px-4 py-3.5 border-b-2 border-black flex items-center gap-3 shrink-0">
            {selectedContact ? (
              <>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer text-white"
                >
                  <span className="material-symbols-outlined text-lg">
                    arrow_back
                  </span>
                </button>
                <div className="overflow-hidden flex-1">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider truncate text-white leading-none mb-1">
                    {selectedContact.full_name}
                  </h4>
                  <p className="text-[9px] text-[#D32F2F] font-bold uppercase tracking-widest leading-none">
                    {selectedContact.role}{" "}
                    {selectedContact.department &&
                      `• ${selectedContact.department}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl text-[#D32F2F]">
                  forum
                </span>
                <div className="overflow-hidden flex-1">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider truncate text-white leading-none">
                    Komunikasi Portal
                  </h4>
                  <p className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider leading-none mt-0.5">
                    Hubungkan Vendor & Supervisor
                  </p>
                </div>
              </>
            )}
          </header>

          {/* Body Content */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
            {selectedContact ? (
              /* ACTIVE CONVERSATION FLOW */
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 scroll-container flex flex-col min-h-0">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="w-5 h-5 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Memuat Obrolan...
                      </span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">
                        forum
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        Belum Ada Pesan
                      </span>
                      <p className="text-[9px] text-gray-400 mt-1 max-w-[180px] font-medium leading-relaxed">
                        Ketik pesan di bawah untuk memulai percakapan aman.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[85%] rounded-[16px] p-3 text-xs leading-normal font-semibold shadow-sm ${
                            isMe
                              ? "bg-[#1A1A1A] text-white ml-auto rounded-tr-none"
                              : "bg-white text-black border-2 border-black mr-auto rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                          <span
                            className={`block text-[8px] mt-1.5 text-right uppercase tracking-tight ${
                              isMe ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Field */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t-2 border-black bg-white flex gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tulis pesan..."
                    className="flex-1 border border-black/20 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D32F2F] placeholder-gray-400 bg-white text-black"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#D32F2F] text-white border border-black rounded-lg px-3.5 flex items-center justify-center hover:bg-[#1A1A1A] transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm text-white">
                      send
                    </span>
                  </button>
                </form>
              </>
            ) : (
              /* CONTACT SELECTOR VIEW */
              <>
                {/* Search Contacts Bar */}
                <div className="p-3 bg-white border-b border-black/10 shrink-0">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kontak..."
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-black/10 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#D32F2F] focus:bg-white text-black"
                    />
                  </div>
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scroll-container min-h-0">
                  {loadingContacts ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="w-5 h-5 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Memuat Kontak...
                      </span>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">
                        person_off
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        Kontak Tidak Ditemukan
                      </span>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const contactUnread = unreadMessages.filter(
                        (m) => m.sender_id === contact.id
                      ).length;

                      return (
                        <button
                          key={contact.id}
                          onClick={() => handleSelectContact(contact)}
                          className="w-full flex items-center gap-3 bg-white hover:bg-gray-100 border-2 border-black/10 rounded-xl p-3 text-left transition-all hover:border-black cursor-pointer bg-transparent"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/5 border border-black flex items-center justify-center font-bold text-xs uppercase shrink-0 text-black">
                            {contact.full_name.substring(0, 2)}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="font-extrabold text-xs text-black uppercase leading-none mb-1 truncate flex items-center gap-2">
                              {contact.full_name}
                              {contactUnread > 0 && (
                                <span
                                  className="inline-block w-2.5 h-2.5 bg-[#D32F2F] rounded-full animate-pulse"
                                  title={`${contactUnread} pesan baru`}
                                />
                              )}
                            </p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-none">
                              {contact.role}{" "}
                              {contact.department &&
                                `• ${contact.department}`}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-gray-400 text-sm">
                            chevron_right
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
