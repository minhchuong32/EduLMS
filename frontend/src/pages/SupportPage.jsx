import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { chatApi, supportApi } from "../services/api";
import { getChatSocket } from "../services/chatSocket";
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

const SUPPORT_EMAIL = "support@edulms.local";
const SUPPORT_PHONE = "1900 1234";
const HISTORY_STORAGE_KEY = "supportRequestHistory";

const FILE_BASE_URL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const INITIAL_FORM = {
  category: "technical",
  priority: "normal",
  subject: "",
  message: "",
};

const CATEGORY_OPTIONS = [
  { value: "technical", label: "Sự cố kỹ thuật" },
  { value: "account", label: "Tài khoản & đăng nhập" },
  { value: "content", label: "Nội dung học tập" },
  { value: "other", label: "Khác" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "normal", label: "Bình thường" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
];

const FAQ_ITEMS = [
  {
    title: "Không đăng nhập được dù đúng mật khẩu",
    answer:
      "Hãy thử đăng xuất toàn bộ thiết bị và đăng nhập lại. Nếu vẫn lỗi, gửi yêu cầu hỗ trợ kèm email đăng nhập để đội ngũ kiểm tra.",
  },
  {
    title: "Không nộp được bài tập",
    answer:
      "Kiểm tra định dạng file và dung lượng. Nếu hệ thống báo lỗi liên tục, vui lòng đính kèm ảnh lỗi trong phần mô tả hỗ trợ.",
  },
  {
    title: "Không thấy lớp hoặc môn học",
    answer:
      "Hãy làm mới trang và kiểm tra đúng tài khoản. Nếu vẫn thiếu dữ liệu, tạo yêu cầu với thông tin lớp/môn để được xử lý nhanh.",
  },
];

const mapIncomingMessage = (item) => ({
  id: item.id,
  senderId: item.senderId,
  receiverId: item.receiverId,
  content: item.content,
  createdAt: item.createdAt,
  isRead: Boolean(item.isRead),
});

const normalizeRole = (role) => String(role || "").toLowerCase();

export default function SupportPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatFile, setChatFile] = useState(null);
  const [chatFilePreviewUrl, setChatFilePreviewUrl] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const messagesEndRef = useRef(null);

  const canUseRealtimeChat = ["admin", "teacher"].includes(
    normalizeRole(user?.role),
  );

  const pageContext = useMemo(() => {
    if (!location.pathname) return "Không xác định";
    return location.pathname;
  }, [location.pathname]);

  const selectedContact = useMemo(
    () => contacts.find((item) => item.id === selectedContactId) || null,
    [contacts, selectedContactId],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatFile) {
      setChatFilePreviewUrl("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(chatFile);
    setChatFilePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [chatFile]);

  useEffect(() => {
    if (!canUseRealtimeChat) return undefined;

    let mounted = true;

    const loadContacts = async () => {
      setLoadingContacts(true);
      try {
        const response = await chatApi.getContacts();
        if (!mounted) return;

        const nextContacts = Array.isArray(response.data) ? response.data : [];
        setContacts(nextContacts);
        setSelectedContactId((prev) => prev || nextContacts[0]?.id || "");
      } catch {
        if (mounted) {
          setContacts([]);
          toast.error("Không tải được danh sách chat");
        }
      } finally {
        if (mounted) setLoadingContacts(false);
      }
    };

    loadContacts();

    return () => {
      mounted = false;
    };
  }, [canUseRealtimeChat]);

  useEffect(() => {
    if (!canUseRealtimeChat || !selectedContactId) return undefined;

    let mounted = true;

    const loadConversation = async () => {
      setLoadingMessages(true);
      try {
        const response = await chatApi.getConversation(selectedContactId, {
          limit: 100,
        });
        if (!mounted) return;

        const list = Array.isArray(response.data) ? response.data : [];
        setMessages(list.map(mapIncomingMessage));
        await chatApi.markConversationRead(selectedContactId);
        setContacts((prev) =>
          prev.map((item) =>
            item.id === selectedContactId ? { ...item, unreadCount: 0 } : item,
          ),
        );
      } catch {
        if (mounted) {
          setMessages([]);
          toast.error("Không tải được lịch sử tin nhắn");
        }
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    };

    loadConversation();

    return () => {
      mounted = false;
    };
  }, [canUseRealtimeChat, selectedContactId]);

  useEffect(() => {
    if (!canUseRealtimeChat) return undefined;

    const token = localStorage.getItem("accessToken");
    if (!token) return undefined;

    const socket = getChatSocket();

    const onConnect = () => {
      socket.emit("chat:join", { token });
    };

    const onReady = () => {
      setSocketReady(true);
    };

    const onDisconnect = () => {
      setSocketReady(false);
    };

    const onError = (payload) => {
      if (payload?.message) {
        toast.error(payload.message);
      }
    };

    const onNewMessage = async (incoming) => {
      const message = mapIncomingMessage(incoming);
      const isCurrentConversation =
        (message.senderId === selectedContactId &&
          message.receiverId === user?.id) ||
        (message.senderId === user?.id &&
          message.receiverId === selectedContactId);

      if (isCurrentConversation) {
        setMessages((prev) => {
          if (prev.some((item) => item.id === message.id)) return prev;
          return [...prev, message];
        });

        if (
          message.senderId === selectedContactId &&
          message.receiverId === user?.id
        ) {
          try {
            await chatApi.markConversationRead(selectedContactId);
            setContacts((prev) =>
              prev.map((item) =>
                item.id === selectedContactId
                  ? { ...item, unreadCount: 0 }
                  : item,
              ),
            );
          } catch {}
        }
        return;
      }

      if (message.receiverId === user?.id) {
        setContacts((prev) =>
          prev.map((item) =>
            item.id === message.senderId
              ? { ...item, unreadCount: (item.unreadCount || 0) + 1 }
              : item,
          ),
        );
      }
    };

    const onHistoryCleared = () => {
      setMessages([]);
      setContacts((prev) => prev.map((item) => ({ ...item, unreadCount: 0 })));
      setSelectedContactId((prev) => prev || "");
      toast.info("Lịch sử chat đã được xóa");
    };

    socket.on("connect", onConnect);
    socket.on("chat:ready", onReady);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:error", onError);
    socket.on("chat:new-message", onNewMessage);
    socket.on("chat:history-cleared", onHistoryCleared);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("chat:ready", onReady);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:error", onError);
      socket.off("chat:new-message", onNewMessage);
      socket.off("chat:history-cleared", onHistoryCleared);
    };
  }, [canUseRealtimeChat, selectedContactId, user?.id]);

  const saveHistory = (nextHistory) => {
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const appendHistory = (statusLabel) => {
    const next = [
      {
        id: Date.now(),
        subject: form.subject,
        category:
          CATEGORY_OPTIONS.find((item) => item.value === form.category)
            ?.label || form.category,
        priority:
          PRIORITY_OPTIONS.find((item) => item.value === form.priority)
            ?.label || form.priority,
        statusLabel,
        createdAt: new Date().toISOString(),
      },
      ...history,
    ].slice(0, 5);

    saveHistory(next);
  };

  const openFallbackEmail = () => {
    const body = [
      `Người gửi: ${user?.fullName || "N/A"}`,
      `Email tài khoản: ${user?.email || "N/A"}`,
      `Vai trò: ${user?.role || "N/A"}`,
      `Danh mục: ${form.category}`,
      `Mức độ ưu tiên: ${form.priority}`,
      `Trang gặp vấn đề: ${pageContext}`,
      "",
      "Mô tả chi tiết:",
      form.message,
    ].join("\n");

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[EduLMS Support] ${form.subject}`)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.subject.trim() || !form.message.trim()) {
      toast.warning("Vui lòng nhập đầy đủ tiêu đề và nội dung hỗ trợ");
      return;
    }

    const payload = {
      ...form,
      contextPath: pageContext,
      createdBy: user?.id,
      createdByRole: user?.role,
    };

    setSubmitting(true);
    try {
      await supportApi.createTicket(payload);
      appendHistory("Đã gửi lên hệ thống");
      toast.success("Gửi yêu cầu hỗ trợ thành công");
      setForm(INITIAL_FORM);
    } catch {
      openFallbackEmail();
      appendHistory("Đã mở email hỗ trợ");
      toast.info(
        "Máy chủ chưa hỗ trợ ticket trực tiếp. Hệ thống đã mở email để bạn gửi yêu cầu.",
      );
      setForm(INITIAL_FORM);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success("Đã sao chép email hỗ trợ");
    } catch {
      toast.error("Không thể sao chép email trên trình duyệt này");
    }
  };

  const handleSendChat = async (event) => {
    event.preventDefault();

    const text = chatDraft.trim();
    if (!text && !chatFile) return;
    if (!selectedContactId) return;

    try {
      const formData = new FormData();
      formData.append("toUserId", selectedContactId);
      formData.append("content", text);
      if (chatFile) formData.append("file", chatFile);

      const response = await chatApi.sendMessage(formData);
      const message = mapIncomingMessage(response.data);
      setMessages((prev) => [...prev, message]);
      setChatDraft("");
      setChatFile(null);
    } catch {
      toast.error("Không gửi được tin nhắn");
    }
  };

  const handlePickFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warning("Chỉ cho phép gửi file ảnh");
      event.target.value = "";
      return;
    }

    setChatFile(file);
  };

  const handleClearHistory = async () => {
    if (normalizeRole(user?.role) !== "admin") return;

    const confirmed = window.confirm(
      "Xóa toàn bộ lịch sử chat giữa admin và teacher? Hành động này không thể hoàn tác.",
    );
    if (!confirmed) return;

    setClearingHistory(true);
    try {
      await chatApi.clearHistory();
      setMessages([]);
      setContacts((prev) => prev.map((item) => ({ ...item, unreadCount: 0 })));
      toast.success("Đã xóa toàn bộ lịch sử chat");
    } catch {
      toast.error("Không thể xóa lịch sử chat");
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl p-4 md:p-6">
      {canUseRealtimeChat && (
        <div className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-white p-4 shadow-sm md:p-6 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Chat Hỗ Trợ
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {normalizeRole(user?.role) === "admin" && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={clearingHistory}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-slate-900 dark:hover:bg-red-950/30"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  {clearingHistory ? "Đang xóa..." : "Xóa toàn bộ lịch sử"}
                </button>
              )}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  socketReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {socketReady ? "Đang kết nối trực tuyến" : "Đang ở chế độ thường"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <aside className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Danh bạ chat
              </p>
              <div className="max-h-[340px] space-y-2 overflow-y-auto">
                {loadingContacts ? (
                  <p className="text-xs text-slate-400">Đang tải danh bạ...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Chưa có tài khoản phù hợp để chat.
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                        selectedContactId === contact.id
                          ? "bg-indigo-50 text-indigo-700"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                          {contact.fullName}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {contact.email}
                        </p>
                      </div>
                      {contact.unreadCount > 0 && (
                        <span className="ml-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {contact.unreadCount > 99
                            ? "99+"
                            : contact.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
              {!selectedContact ? (
                <div className="flex h-[340px] items-center justify-center text-sm text-slate-400">
                  Chọn một người để bắt đầu trò chuyện.
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    {selectedContact.avatar ? (
                      <img
                        src={`${FILE_BASE_URL}${selectedContact.avatar}`}
                        alt="avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-slate-400" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                        {selectedContact.fullName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedContact.role}
                      </p>
                    </div>
                  </div>

                  <div className="h-[250px] space-y-2 overflow-y-auto pr-1">
                    {loadingMessages ? (
                      <p className="text-xs text-slate-400">
                        Đang tải tin nhắn...
                      </p>
                    ) : messages.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Chưa có tin nhắn nào.
                      </p>
                    ) : (
                      messages.map((item) => {
                        const isMine = item.senderId === user?.id;
                        const hasImage = Boolean(item.fileUrl);
                        return (
                          <div
                            key={item.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                isMine
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {hasImage && (
                                <a
                                  href={`${FILE_BASE_URL}${item.fileUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mb-2 block overflow-hidden rounded-xl"
                                >
                                  <img
                                    src={`${FILE_BASE_URL}${item.fileUrl}`}
                                    alt={item.fileName || "attachment"}
                                    className="max-h-64 w-full rounded-xl object-cover"
                                  />
                                </a>
                              )}
                              <p className="whitespace-pre-wrap break-words">
                                {item.content}
                              </p>
                              <p
                                className={`mt-1 text-[10px] ${
                                  isMine ? "text-indigo-100" : "text-slate-400"
                                }`}
                              >
                                {format(
                                  new Date(item.createdAt),
                                  "HH:mm dd/MM",
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
                    <div className="flex w-full flex-col gap-2">
                      <input
                        type="text"
                        value={chatDraft}
                        onChange={(event) => setChatDraft(event.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePickFile}
                          />
                          Chọn ảnh
                        </label>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Gửi
                        </button>
                      </div>
                      {chatFile && (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                          <img
                            src={chatFilePreviewUrl}
                            alt={chatFile.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-100">
                              {chatFile.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Ảnh đính kèm sẽ được gửi kèm tin nhắn
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setChatFile(null)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600 dark:hover:bg-slate-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-5 shadow-sm md:p-8 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              <LifebuoyIcon className="h-4 w-4" />
              Hỗ trợ EduLMS
            </p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Bạn cần hỗ trợ gì hôm nay?
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Gửi yêu cầu trực tiếp để đội ngũ kỹ thuật xử lý. Trong thời gian
              chưa có API hỗ trợ ticket, hệ thống sẽ tự động mở email với đầy đủ
              thông tin để bạn gửi nhanh.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Thời gian phản hồi
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Trong vòng 4 giờ làm việc
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 inline-flex rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
            <EnvelopeIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Email hỗ trợ
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {SUPPORT_EMAIL}
          </p>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="mt-3 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sao chép email
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <PhoneIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Hotline
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {SUPPORT_PHONE}
          </p>
          <p className="mt-3 text-xs text-slate-400">08:00 - 17:30 (T2 - T6)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 inline-flex rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            <ClockIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Trang đang thao tác
          </p>
          <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-300">
            {pageContext}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Tạo yêu cầu hỗ trợ
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Danh mục
              <select
                value={form.category}
                onChange={handleChange("category")}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-300">
              Mức độ ưu tiên
              <select
                value={form.priority}
                onChange={handleChange("priority")}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300">
            Tiêu đề
            <input
              type="text"
              value={form.subject}
              onChange={handleChange("subject")}
              placeholder="Ví dụ: Không tải được file bài giảng"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300">
            Nội dung chi tiết
            <textarea
              rows={6}
              value={form.message}
              onChange={handleChange("message")}
              placeholder="Mô tả lỗi, các bước bạn đã thử, và thời điểm xảy ra vấn đề..."
              className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Câu hỏi nhanh
            </h3>
            <div className="mt-3 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
                >
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Yêu cầu gần đây
            </h3>
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Chưa có yêu cầu nào trong phiên này.
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
                  >
                    <p className="font-semibold text-slate-700 dark:text-slate-100">
                      {item.subject}
                    </p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-300">
                      {item.category} - {item.priority}
                    </p>
                    <p className="mt-0.5 text-slate-400">
                      {item.statusLabel} -{" "}
                      {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
