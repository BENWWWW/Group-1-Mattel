"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
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

interface ParsedMessage {
  taskMention: {
    id?: string;
    code: string;
    title: string;
    type: "task" | "report";
  } | null;
  cleanText: string;
  isFile: boolean;
  fileUrl?: string;
  fileName?: string;
}

const parseMessageContent = (rawMessage: string): ParsedMessage => {
  let text = rawMessage;
  let taskMention: ParsedMessage["taskMention"] = null;

  // 1. Check for the new explicit tag format
  if (text.startsWith("[TASK_MENTION:")) {
    const match = text.match(/^\[TASK_MENTION:(.*?)\|code:(.*?)\|title:(.*?)\|type:(.*?)\]([\s\S]*)/);
    if (match) {
      taskMention = {
        id: match[1],
        code: match[2],
        title: match[3],
        type: match[4] as "task" | "report"
      };
      text = match[5]; // Remaining body
    }
  }

  // 2. Check for the user-facing text prefix (either as fallback for old messages or if prepended)
  // Example pattern: 📌 Regarding Task [TASK-2026-2112 - TEST]:
  const textPattern = /^📌 Regarding (Task|Report) \[(.*?) - (.*?)\]:?\s*\n?([\s\S]*)/i;
  const textMatch = text.match(textPattern);
  if (textMatch) {
    if (!taskMention) {
      taskMention = {
        code: textMatch[2].trim(),
        title: textMatch[3].trim(),
        type: textMatch[1].toLowerCase() === "report" ? "report" : "task"
      };
    }
    text = textMatch[4]; // Extract only the actual chat text body
  }

  // 3. Check if the remaining text is a file format
  const isFile = text.startsWith("[FILE:");
  if (isFile) {
    const fileMatch = text.match(/^\[FILE:(.*?)\|name:(.*?)\]/);
    if (fileMatch) {
      return {
        taskMention,
        cleanText: text,
        isFile: true,
        fileUrl: fileMatch[1],
        fileName: fileMatch[2]
      };
    }
  }

  return {
    taskMention,
    cleanText: text,
    isFile: false
  };
};

export default function ChatWidget() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
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

  // Task mention states
  const [mentionedTask, setMentionedTask] = useState<{ id: string; code: string; title: string; type?: "task" | "report" } | null>(null);
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(null);

  // File Upload states & ref
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);  // Attachment Viewer modal states
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerOriginalUrl, setViewerOriginalUrl] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [viewerTextContent, setViewerTextContent] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  // Voice-to-Text (Speech-to-Text) states & ref
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<"id-ID" | "en-US">("id-ID");

  useEffect(() => {
    if (speechError) {
      const timer = setTimeout(() => {
        setSpeechError(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  const startListening = () => {
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setNewMessage((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === "network") {
          const isNotSecure = window.location.protocol !== "https:" && 
                              !["localhost", "127.0.0.1"].includes(window.location.hostname);
          if (isNotSecure) {
            setSpeechError("Microphone requires HTTPS or localhost connection.");
          } else {
            setSpeechError(
              speechLang === "id-ID"
                ? "Indonesian voice servers unreachable. Try toggling to EN or check adblocker."
                : "Google Speech servers unreachable. Try toggling to ID or check adblocker."
            );
          }
        } else if (event.error === "not-allowed") {
          setSpeechError("Microphone permission denied. Enable it in settings.");
        } else {
          setSpeechError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition initialization failed:", err);
      setIsRecording(false);
      setSpeechError("Failed to start speech recognition.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
  };

  // Listen for task chat mentions
  useEffect(() => {
    const handleOpenTaskChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { taskCode, taskTitle, taskId, supervisorId, type } = customEvent.detail;
      
      setIsOpen(true);
      setMentionedTask({
        id: taskId,
        code: taskCode,
        title: taskTitle,
        type: type || "task"
      });

      if (supervisorId) {
        setPendingRecipientId(supervisorId);
      } else {
        // Fallback: If no matched supervisor, select the first supervisor or admin in contacts
        const firstSubOrAdmin = contacts.find(c => c.role === "supervisor" || c.role === "admin");
        if (firstSubOrAdmin) {
          setSelectedContact(firstSubOrAdmin);
        }
      }
    };

    window.addEventListener("open-task-chat", handleOpenTaskChat);
    return () => {
      window.removeEventListener("open-task-chat", handleOpenTaskChat);
    };
  }, [contacts]);

  // Resolve pending supervisor/recipient when contacts are loaded/updated
  useEffect(() => {
    if (pendingRecipientId && contacts.length > 0) {
      const found = contacts.find(c => c.id === pendingRecipientId);
      if (found) {
        setSelectedContact(found);
      } else {
        const firstSubOrAdmin = contacts.find(c => c.role === "supervisor" || c.role === "admin");
        if (firstSubOrAdmin) {
          setSelectedContact(firstSubOrAdmin);
        }
      }
      setPendingRecipientId(null);
    }
  }, [contacts, pendingRecipientId]);

  // Draggable states
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContactRef = useRef<Profile | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragActive = useRef(false);

  // Sync ref to avoid stale closures in realtime events
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Mount flag for portal safety (must be client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Fetch current user on mount, auth state changes, or navigation
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
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Error fetching user in ChatWidget:", err);
        setCurrentUser(null);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, supabase]);

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

  const handleViewAttachment = async (fileUrl: string, fileName: string) => {
    setIsViewerLoading(true);
    setViewerName(fileName);
    setViewerOriginalUrl(fileUrl);
    setViewerTextContent(null);
    setViewerUrl(null);

    const lowerName = fileName.toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(lowerName);
    const isPdf = /\.pdf$/i.test(lowerName);
    const isText = /\.(txt|csv|log|json|sql|md)$/i.test(lowerName);

    try {
      if (isImage || isPdf) {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Network response was not ok");
        const blob = await res.blob();
        
        let mimeType = blob.type;
        if (lowerName.endsWith(".pdf")) {
          mimeType = "application/pdf";
        } else if (lowerName.endsWith(".png")) {
          mimeType = "image/png";
        } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
          mimeType = "image/jpeg";
        } else if (lowerName.endsWith(".gif")) {
          mimeType = "image/gif";
        } else if (lowerName.endsWith(".svg")) {
          mimeType = "image/svg+xml";
        }
        
        const typedBlob = new Blob([blob], { type: mimeType });
        const localUrl = URL.createObjectURL(typedBlob);
        setViewerUrl(localUrl);
      } else if (isText) {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Network response was not ok");
        const text = await res.text();
        setViewerTextContent(text);
        setViewerUrl(fileUrl); // Set truthy to trigger modal
      } else {
        // Office documents or unsupported files - skip raw fetch blob to prevent auto-download prompts
        setViewerUrl(fileUrl);
      }
    } catch (err) {
      console.error("Failed to fetch attachment for preview, falling back to direct url:", err);
      setViewerUrl(fileUrl);
    } finally {
      setIsViewerLoading(false);
    }
  };

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch file for download");
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error("Failed to download file programmatically, opening in new tab:", err);
      window.open(url, "_blank");
    }
  };

  const handleTaskMentionClick = async (mention: { id?: string; code: string; title: string; type: "task" | "report" }) => {
    let taskId = "";

    try {
      if (mention.id) {
        if (mention.type === "report") {
          // Fetch the task_id from the report
          const { data, error } = await supabase
            .from("pm_reports")
            .select("task_id")
            .eq("id", mention.id)
            .maybeSingle();
          if (data?.task_id) {
            taskId = data.task_id;
          } else {
            // Fallback: search by code
            const { data: taskData } = await supabase
              .from("pm_tasks")
              .select("id")
              .eq("task_code", mention.code)
              .maybeSingle();
            if (taskData?.id) {
              taskId = taskData.id;
            }
          }
        } else {
          taskId = mention.id;
        }
      } else {
        // Fallback dynamic database lookup by task_code
        const { data, error } = await supabase
          .from("pm_tasks")
          .select("id")
          .eq("task_code", mention.code)
          .maybeSingle();

        if (data?.id) {
          taskId = data.id;
        }
      }

      if (!taskId) {
        alert(`Could not find task details for code: ${mention.code}`);
        return;
      }

      // Route based on user role
      const role = (currentUser?.role || "vendor").toLowerCase();
      const targetPath = role === "supervisor" || role === "admin"
        ? `/supervisor/tasks?taskId=${taskId}`
        : `/vendor/tasks?taskId=${taskId}`;

      window.location.href = targetPath;
    } catch (err) {
      console.error("Failed to route mention:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedContact) return;
    if (!newMessage.trim() && !pendingFile && !mentionedTask) return;

    let attachedFileSent = false;
    let fileMessageData: any = null;
    let currentMention = mentionedTask;

    if (pendingFile) {
      setIsUploading(true);
      try {
        const file = pendingFile;
        const fileExt = file.name.split(".").pop();
        const filePath = `chat_attachments/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("pm_evidence")
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("pm_evidence")
          .getPublicUrl(filePath);

        let fileMessageText = `[FILE:${publicUrl}|name:${file.name}]`;
        if (currentMention) {
          fileMessageText = `[TASK_MENTION:${currentMention.id}|code:${currentMention.code}|title:${currentMention.title}|type:${currentMention.type || "task"}]` + fileMessageText;
          currentMention = null;
          setMentionedTask(null);
        }
        
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            sender_id: currentUser.id,
            receiver_id: selectedContact.id,
            message: fileMessageText,
          })
          .select()
          .single();

        if (data && !error) {
          fileMessageData = data;
          attachedFileSent = true;
        }
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error("Failed to upload/send file:", err);
        alert("Failed to upload file. Please try again.");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Now send the text message if any, or if a mention was selected but no file was uploaded
    let messageText = newMessage.trim();
    if (messageText || currentMention) {
      if (currentMention) {
        const typeLabel = currentMention.type === "report" ? "Report" : "Task";
        messageText = `[TASK_MENTION:${currentMention.id}|code:${currentMention.code}|title:${currentMention.title}|type:${currentMention.type || "task"}]📌 Regarding ${typeLabel} [${currentMention.code} - ${currentMention.title}]:\n${messageText}`;
        setMentionedTask(null);
      }
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
            const list = attachedFileSent 
              ? (prev.some((m) => m.id === fileMessageData.id) ? prev : [...prev, fileMessageData])
              : prev;
            if (list.some((m) => m.id === data.id)) return list;
            return [...list, data];
          });
        } else if (attachedFileSent) {
          setMessages((prev) => prev.some((m) => m.id === fileMessageData.id) ? prev : [...prev, fileMessageData]);
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    } else if (attachedFileSent) {
      setMessages((prev) => prev.some((m) => m.id === fileMessageData.id) ? prev : [...prev, fileMessageData]);
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

  // Only render if a user is logged in and not on the login page
  if (pathname === "/" || !currentUser) return null;

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
    <>
    <div
      style={containerStyle}
      className="fixed z-[9999] transition-shadow duration-150"
    >
      {/* Floating Toggle Button */}
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleButtonClick}
        className={`w-16 h-16 bg-[#D32F2F] text-white rounded-full border border-gray-200 flex items-center justify-center transition-all cursor-grab active:cursor-grabbing shadow-lg hover:scale-105 active:scale-95 border-none select-none ${
          isDragging ? "opacity-90 scale-105" : ""
        }`}
        title="Contact Supervisor / Vendor (Drag to move)"
      >
        <span className="material-symbols-outlined text-3xl text-white pointer-events-none">
          {isOpen ? "close" : "forum"}
        </span>
        {!isOpen && unreadMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1.5 bg-[#D32F2F] border border-gray-200 text-white font-semibold text-[10px] rounded-full flex items-center justify-center pointer-events-none">
            {unreadMessages.length}
          </span>
        )}
      </button>

      {/* Desktop Chat Panel removed — panel is always via portal below */}
    </div>

    {/* Chat Panel — always via createPortal into document.body.
         On mobile: full-width bottom sheet above bottom nav.
         On desktop: fixed panel at bottom-right corner. */}
    {mounted && isOpen && createPortal(
      <div
        className="fixed z-[99999] animate-in slide-in-from-bottom-5 duration-300 bg-white border border-gray-200 rounded-[24px] shadow-lg flex flex-col overflow-hidden bottom-[90px] left-2 right-2 h-[70vh] max-h-[520px] md:bottom-8 md:right-8 md:left-auto md:w-80 md:h-[480px]"
        style={{ zIndex: 99999 }}
      >
        {/* Header */}
        <header className="bg-[#1A1A1A] text-white px-4 py-3.5 border-b border-gray-200 flex items-center gap-3 shrink-0">
          {selectedContact ? (
            <>
              <button
                onClick={() => setSelectedContact(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer text-white"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
              <div className="overflow-hidden flex-1">
                <h4 className="font-semibold text-xs uppercase tracking-wider truncate text-white leading-none mb-1">
                  {selectedContact.full_name}
                </h4>
                <p className="text-[9px] text-[#D32F2F] font-medium uppercase tracking-widest leading-none">
                  {selectedContact.role}{" "}
                  {selectedContact.department && `• ${selectedContact.department}`}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl text-gray-400">forum</span>
              <div className="overflow-hidden flex-1">
                <h4 className="font-semibold text-xs uppercase tracking-wider truncate text-white leading-none">
                  Communication Portal
                </h4>
                <p className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider leading-none mt-0.5">
                  Connect Vendor & Supervisor
                </p>
              </div>
            </>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer text-white ml-auto"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        {/* Body Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {selectedContact ? (
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scroll-container flex flex-col min-h-0">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className="w-5 h-5 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-medium text-gray-400 uppercase">Loading Chat...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">forum</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">No Messages Yet</span>
                    <p className="text-[9px] text-gray-400 mt-1 max-w-[180px] font-medium leading-relaxed">
                      Type a message below to start a conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser!.id;
                    const parsed = parseMessageContent(msg.message);
                    const isFile = parsed.isFile;
                    const fileUrl = parsed.fileUrl || "";
                    const fileName = parsed.fileName || "";
                    const isImage = isFile && /\.(png|jpe?g|gif|webp|svg)/i.test(fileName);

                    return (
                      <div
                        key={msg.id}
                        className={`max-w-[85%] rounded-[16px] p-3 text-xs leading-normal font-semibold shadow-sm ${
                          isMe
                            ? "bg-[#1A1A1A] text-white ml-auto rounded-tr-none"
                            : "bg-white text-black border border-gray-200 mr-auto rounded-tl-none"
                        }`}
                      >
                        {parsed.taskMention && (
                          <button
                            type="button"
                            onClick={() => handleTaskMentionClick(parsed.taskMention!)}
                            className={`mb-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[8px] text-[10px] font-semibold uppercase text-left transition-all cursor-pointer border ${
                              isMe
                                ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                : "bg-[#D32F2F] hover:bg-[#b71c1c] text-white border-gray-200"
                            }`}
                            title={`Click to open report preview for ${parsed.taskMention.code}`}
                          >
                            <span className="material-symbols-outlined text-[11px] font-medium shrink-0">open_in_new</span>
                            <span className="truncate flex-1">
                              Regarding {parsed.taskMention.type === "report" ? "Report" : "Task"} [{parsed.taskMention.code}]
                            </span>
                          </button>
                        )}

                        {isFile ? (
                          isImage ? (
                            <div className="space-y-1">
                              <p className={`text-[9px] font-medium uppercase truncate max-w-[150px] mb-1 ${isMe ? "text-gray-400" : "text-gray-500"}`}>
                                {fileName}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleViewAttachment(fileUrl, fileName)}
                                className="block rounded-lg overflow-hidden border border-black/10 hover:opacity-90 transition-opacity cursor-pointer border-none bg-transparent p-0 text-left w-full animate-in fade-in duration-200"
                                title="Click to preview image inline"
                              >
                                <img
                                  src={fileUrl}
                                  alt={fileName}
                                  className="w-full max-h-48 object-cover rounded"
                                />
                              </button>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-2 p-2 rounded-[12px] ${
                              isMe
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-black border border-black/10"
                            }`}>
                              <button
                                type="button"
                                onClick={() => handleViewAttachment(fileUrl, fileName)}
                                className={`flex items-center gap-2 flex-grow min-w-0 no-underline hover:underline cursor-pointer text-left border-none bg-transparent p-0 ${
                                  isMe ? "text-white font-semibold" : "text-black font-semibold"
                                }`}
                                title="Click to preview file inline"
                              >
                                <span className="material-symbols-outlined text-base shrink-0">description</span>
                                <span className="text-[10px] font-semibold truncate max-w-[130px]">{fileName}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(fileUrl, fileName)}
                                className={`p-1 rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors border-none bg-transparent ${
                                  isMe ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-black hover:bg-black/5"
                                }`}
                                title="Download file"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                              </button>
                            </div>
                          )
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{parsed.cleanText}</p>
                        )}
                        <span className={`block text-[8px] mt-1.5 text-right uppercase tracking-tight ${
                          isMe ? "text-gray-400" : "text-gray-500"
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {mentionedTask && (
                <div className="mx-3 my-1.5 p-2 bg-red-50 border border-gray-200 rounded-[12px] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-sm text-gray-400">
                      {mentionedTask.type === "report" ? "assessment" : "assignment"}
                    </span>
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-semibold text-[#D32F2F] uppercase leading-none tracking-wider">
                        Mentioned {mentionedTask.type === "report" ? "Report" : "Task"}
                      </p>
                      <p className="text-[10px] text-black font-semibold uppercase truncate mt-0.5 leading-none">
                        {mentionedTask.code} - {mentionedTask.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMentionedTask(null)}
                    className="p-0.5 text-gray-400 hover:text-black border-none bg-transparent cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              {pendingFile && (
                <div className="mx-3 my-1.5 p-2 bg-gray-100 border border-gray-200 rounded-[12px] flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className="material-symbols-outlined text-sm text-gray-500 shrink-0">attach_file</span>
                    <div className="overflow-hidden flex-1">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase leading-none tracking-wider">Ready to Send Attachment</p>
                      <button
                        type="button"
                        onClick={() => {
                          const fileUrl = URL.createObjectURL(pendingFile);
                          window.open(fileUrl, "_blank");
                        }}
                        className="text-[10px] text-[#D32F2F] hover:underline font-semibold truncate mt-0.5 leading-none block border-none bg-transparent p-0 cursor-pointer text-left w-full"
                        title="Click to view file in a new tab"
                      >
                        {pendingFile.name} ({Math.round(pendingFile.size / 1024)} KB)
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-0.5 text-gray-400 hover:text-black border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              {speechError && (
                <div className="mx-3 my-1.5 p-2 bg-red-50 border border-red-500/30 text-[10px] text-red-600 font-semibold rounded-[12px] flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                    <span className="material-symbols-outlined text-sm text-red-500 shrink-0">error</span>
                    <span className="truncate">{speechError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpeechError(null)}
                    className="p-0.5 text-red-400 hover:text-red-800 border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-gray-200 bg-white flex gap-2 items-center shrink-0 w-full"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex-1 flex items-center gap-1 bg-gray-50 border border-black/20 rounded-lg px-2 py-1 min-w-0">
                  {/* File Pick button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1 hover:bg-gray-200 rounded flex items-center justify-center shrink-0 cursor-pointer text-gray-500 hover:text-black transition-colors disabled:opacity-50 border-none bg-transparent"
                    title="Choose image or file"
                  >
                    {isUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">attach_file</span>
                    )}
                  </button>

                  {/* Speech Recording Button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-1 rounded flex items-center justify-center shrink-0 cursor-pointer transition-all border-none ${
                      isRecording 
                        ? "bg-red-600 text-white animate-pulse" 
                        : "hover:bg-gray-200 text-gray-500 hover:text-black bg-transparent"
                    }`}
                    title={isRecording ? "Stop voice-to-text" : "Start voice-to-text"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isRecording ? "mic_off" : "mic"}
                    </span>
                  </button>

                  {/* Language switch badge (ID/EN) */}
                  <button
                    type="button"
                    onClick={() => setSpeechLang((prev) => (prev === "id-ID" ? "en-US" : "id-ID"))}
                    className="text-[8px] font-semibold border border-black/20 rounded px-1 py-0.5 bg-white text-gray-500 hover:text-black shrink-0 hover:border-gray-400 transition-colors cursor-pointer"
                    title={`Voice recognition language: ${speechLang === "id-ID" ? "Indonesian" : "English"}. Click to toggle.`}
                  >
                    {speechLang === "id-ID" ? "ID" : "EN"}
                  </button>

                  {/* Divider line inside input pill */}
                  <div className="w-[1px] h-4 bg-black/10 mx-1 shrink-0" />

                  {/* Message Input text field */}
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isRecording ? "🎙️ Listening... speak clearly" : "Type a message..."}
                    className="flex-grow bg-transparent border-none outline-none focus:ring-0 p-1 text-xs font-semibold min-w-0 text-black placeholder-gray-400 focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!newMessage.trim() && !pendingFile}
                  className="bg-[#D32F2F] text-white border-none rounded-lg p-2.5 flex items-center justify-center hover:bg-[#1A1A1A] transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm text-white">send</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="p-3 bg-white border-b border-black/10 shrink-0">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-black/10 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#D32F2F] focus:bg-white text-black"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scroll-container min-h-0">
                {loadingContacts ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className="w-5 h-5 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-medium text-gray-400 uppercase">Loading Contacts...</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <span className="material-symbols-outlined text-3xl text-gray-300 mb-2">person_off</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contact Not Found</span>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const contactUnread = unreadMessages.filter((m) => m.sender_id === contact.id).length;
                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="w-full flex items-center gap-3 bg-white hover:bg-gray-100 border border-black/10 rounded-xl p-3 text-left transition-all hover:border-gray-400 cursor-pointer bg-transparent"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/5 border border-gray-200 flex items-center justify-center font-medium text-xs uppercase shrink-0 text-black">
                          {contact.full_name.substring(0, 2)}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="font-semibold text-xs text-black uppercase leading-none mb-1 truncate flex items-center gap-2">
                            {contact.full_name}
                            {contactUnread > 0 && (
                              <span className="inline-block w-2.5 h-2.5 bg-[#D32F2F] rounded-full animate-pulse" title={`${contactUnread} new messages`} />
                            )}
                          </p>
                          <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider leading-none">
                            {contact.role}{" "}{contact.department && `• ${contact.department}`}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {isViewerLoading && (
          <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-3 max-w-xs shadow-2xl animate-in zoom-in-95 duration-200 shadow-sm">
              <div className="w-8 h-8 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-semibold text-black uppercase tracking-wider">Preparing document preview...</p>
            </div>
          </div>
        )}

        {viewerUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative bg-white p-4 rounded-xl max-w-3xl w-full flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 shadow-sm">
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 mb-4">
                <div className="overflow-hidden">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-none">File Viewer</p>
                  <h4 className="text-xs font-semibold text-black truncate uppercase mt-1 leading-none">{viewerName}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (viewerUrl.startsWith("blob:")) {
                      URL.revokeObjectURL(viewerUrl);
                    }
                    setViewerUrl(null);
                    setViewerOriginalUrl("");
                    setViewerTextContent(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-black cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Modal Body / Viewer */}
              <div className="flex-grow flex items-center justify-center bg-gray-100 rounded-lg border border-black/10 overflow-hidden min-h-[350px] max-h-[65vh] p-2 relative w-full">
                {/\.(png|jpe?g|gif|webp|svg)/i.test(viewerName) ? (
                  <img
                    src={viewerUrl}
                    alt={viewerName}
                    className="max-w-full max-h-[60vh] object-contain rounded animate-in fade-in duration-300"
                  />
                ) : /\.pdf/i.test(viewerName) ? (
                  <iframe
                    src={viewerUrl}
                    title="PDF Preview"
                    className="w-full h-[60vh] border-none rounded bg-white animate-in fade-in duration-300"
                    allow="unload"
                  />
                ) : viewerTextContent !== null ? (
                  <div className="w-full h-[60vh] bg-white border border-black/10 rounded-lg p-4 overflow-y-auto text-left font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-black select-text animate-in fade-in duration-300">
                    {viewerTextContent}
                  </div>
                ) : /\.(docx?|xlsx?|pptx?)/i.test(viewerName) ? (
                  viewerOriginalUrl.includes("localhost") || viewerOriginalUrl.includes("127.0.0.1") ? (
                    <div className="text-center p-8 space-y-4 animate-in fade-in duration-300">
                      <span className="material-symbols-outlined text-5xl text-gray-400">warning</span>
                      <h4 className="text-xs font-semibold text-black uppercase">Office Preview Disabled (Local Host)</h4>
                      <p className="text-[10px] text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                        In local development, Google Docs Viewer cannot access local files.
                        <br />
                        In production, this file renders here automatically. Please click "Download" below to view it locally.
                      </p>
                    </div>
                  ) : (
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewerOriginalUrl)}&embedded=true`}
                      title="Office Document Preview"
                      className="w-full h-[60vh] border-none rounded bg-white animate-in fade-in duration-300"
                      allow="unload"
                    />
                  )
                ) : (
                  <div className="text-center p-8 space-y-4 animate-in fade-in duration-300">
                    <span className="material-symbols-outlined text-5xl text-gray-400">insert_drive_file</span>
                    <h4 className="text-xs font-semibold text-black uppercase">No Preview Available</h4>
                    <p className="text-[10px] text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                      Preview is not supported for this file type ({viewerName.split('.').pop()?.toUpperCase()}).
                      Please click the "Download" button below to view the file locally.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-3 border-t border-black/10 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-medium uppercase">
                  Preview Mode
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (viewerUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(viewerUrl);
                      }
                      setViewerUrl(null);
                      setViewerOriginalUrl("");
                      setViewerTextContent(null);
                    }}
                    className="px-4 py-2 border border-gray-200 bg-white text-black hover:bg-gray-50 text-xs cursor-pointer font-medium rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(viewerOriginalUrl, viewerName)}
                    className="bg-[#D32F2F] text-white border border-gray-200 hover:bg-[#1A1A1A] px-4 py-2 text-xs cursor-pointer font-medium rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body
    )}
    </>
  );
}
