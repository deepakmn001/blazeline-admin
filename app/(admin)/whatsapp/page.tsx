"use client";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  UserRound,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWhatsAppConversation,
  getWhatsAppConversations,
  markWhatsAppConversationRead,
  sendWhatsAppReply,
  type WhatsAppConversation,
  type WhatsAppConversationDetail,
} from "@/services/whatsapp.service";

type InboxFilter = "open" | "closed";

type IconProps = {
  icon: LucideIcon;
};

const POLL_INTERVAL_MS = 10_000;

function isValidDate(value?: string | null) {
  if (!value) return false;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp);
}

function formatDate(value?: string | null) {
  if (!isValidDate(value)) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value as string));
}

function formatMessageTime(value?: string | null) {
  if (!isValidDate(value)) return "";

  const date = new Date(value as string);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const sameYear = date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

function formatConversationDate(value?: string | null) {
  if (!isValidDate(value)) return "";

  const date = new Date(value as string);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  const axiosError = error as {
    response?: {
      data?: unknown;
      status?: number;
    };
    message?: string;
  };

  const payload = axiosError?.response?.data;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;

    const firstValue = Object.values(record)[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }

    if (
      Array.isArray(firstValue) &&
      typeof firstValue[0] === "string"
    ) {
      return firstValue[0];
    }
  }

  return axiosError?.message || "Something went wrong. Please try again.";
}

function conversationName(conversation: WhatsAppConversation) {
  return (
    conversation.customer_name?.trim() ||
    conversation.customer_number ||
    "Unknown customer"
  );
}

function conversationInitial(conversation: WhatsAppConversation) {
  const name = conversation.customer_name?.trim();

  if (!name) {
    return conversation.customer_number?.slice(-2) || "WA";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizePhone(value?: string | null) {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return `+${digits}`;
}

function getEffectiveSessionExpiry(
  conversation?: WhatsAppConversation | null,
) {
  if (!conversation) return null;

  if (isValidDate(conversation.session_expires_at)) {
    return conversation.session_expires_at;
  }

  if (isValidDate(conversation.last_inbound_at)) {
    const fallback = new Date(
      new Date(conversation.last_inbound_at as string).getTime() +
        24 * 60 * 60 * 1000,
    );

    return fallback.toISOString();
  }

  return null;
}

function getReplyWindowState(
  conversation?: WhatsAppConversation | null,
) {
  if (!conversation) {
    return {
      active: false,
      label: "No conversation selected",
      expiresAt: null,
    };
  }

  if (conversation.status !== "open") {
    return {
      active: false,
      label: "Conversation closed",
      expiresAt: getEffectiveSessionExpiry(conversation),
    };
  }

  const expiresAt = getEffectiveSessionExpiry(conversation);

  if (!expiresAt) {
    return {
      active: true,
      label: "Reply window available",
      expiresAt: null,
    };
  }

  const expiryTime = new Date(expiresAt).getTime();
  const remaining = expiryTime - Date.now();

  if (remaining <= 0) {
    return {
      active: false,
      label: "24-hour reply window expired",
      expiresAt,
    };
  }

  return {
    active: true,
    label: "Reply window active",
    expiresAt,
  };
}

function messageTypeLabel(type?: string | null) {
  if (!type) return "Message";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function messageStatusLabel(status?: string | null) {
  switch (status) {
    case "read":
      return "Read";
    case "delivered":
      return "Delivered";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "received":
      return "Received";
    default:
      return status || "";
  }
}

function MessageStatus({
  status,
}: {
  status?: string | null;
}) {
  switch (status) {
    case "read":
    case "delivered":
      return (
        <CheckCheck
          className="h-3 w-3"
          aria-label={messageStatusLabel(status)}
        />
      );

    case "sent":
    case "received":
      return (
        <Check
          className="h-3 w-3"
          aria-label={messageStatusLabel(status)}
        />
      );

    default:
      return null;
  }
}

function StatusDot({
  icon: Icon,
}: IconProps) {
  return <Icon className="h-3 w-3" />;
}

export default function Page() {
  const [conversations, setConversations] = useState<
    WhatsAppConversation[]
  >([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [detail, setDetail] =
    useState<WhatsAppConversationDetail | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("open");

  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [replyDraft, setReplyDraft] = useState("");
  const [error, setError] = useState("");
  const [replyError, setReplyError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const loadConversations = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setListLoading(true);
      }

      setError("");

      try {
        const data = await getWhatsAppConversations({
          status: filter,
          page: 1,
          page_size: 100,
        });

        setConversations(data.results ?? []);
      } catch (loadError) {
        const message = getErrorMessage(loadError);

        if (showLoader) {
          setConversations([]);
          setError(message);
        }
      } finally {
        if (showLoader) {
          setListLoading(false);
        }
      }
    },
    [filter],
  );

  const loadConversationDetail = useCallback(
    async (
      id: number,
      options: {
        showLoader?: boolean;
        markRead?: boolean;
      } = {},
    ) => {
      const {
        showLoader = true,
        markRead = true,
      } = options;

      if (showLoader) {
        setDetailLoading(true);
      }

      try {
        const data = await getWhatsAppConversation(id);

        setDetail(data);

        if (
          markRead &&
          data.unread_count > 0
        ) {
          try {
            await markWhatsAppConversationRead(id);

            setConversations((current) =>
              current.map((conversation) =>
                conversation.id === id
                  ? {
                      ...conversation,
                      unread_count: 0,
                    }
                  : conversation,
              ),
            );

            setDetail((current) =>
              current?.id === id
                ? {
                    ...current,
                    unread_count: 0,
                  }
                : current,
            );
          } catch {
            // Detail loading succeeded.
            // Read-state failure should not break the inbox.
          }
        }

        return data;
      } finally {
        if (showLoader) {
          setDetailLoading(false);
        }
      }
    },
    [],
  );

  const openConversation = useCallback(
    async (id: number) => {
      setSelectedId(id);
      setReplyDraft("");
      setReplyError("");
      setError("");

      try {
        await loadConversationDetail(id, {
          showLoader: true,
          markRead: true,
        });
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      }
    },
    [loadConversationDetail],
  );

  const closeConversationView = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setReplyDraft("");
    setReplyError("");
  }, []);

  const handleSendReply = useCallback(async () => {
    if (selectedId === null || sendingReply) return;

    const message = replyDraft.trim();

    if (!message) return;

    const selectedConversation = detail;

    if (!selectedConversation) return;

    const replyWindow = getReplyWindowState(selectedConversation);

    if (!replyWindow.active) {
      setReplyError(
        "The 24-hour WhatsApp reply window has expired. An approved WhatsApp template is required to continue this conversation.",
      );
      return;
    }

    setSendingReply(true);
    setReplyError("");
    setError("");

    try {
      await sendWhatsAppReply(selectedId, message);

      setReplyDraft("");

      await loadConversationDetail(selectedId, {
        showLoader: false,
        markRead: false,
      });

      await loadConversations(false);

      window.setTimeout(() => {
        replyInputRef.current?.focus();
      }, 50);
    } catch (sendError) {
      setReplyError(getErrorMessage(sendError));
    } finally {
      setSendingReply(false);
    }
  }, [
    detail,
    loadConversationDetail,
    loadConversations,
    replyDraft,
    selectedId,
    sendingReply,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      await loadConversations(true);

      if (selectedId !== null) {
        await loadConversationDetail(selectedId, {
          showLoader: false,
          markRead: false,
        });
      }
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setRefreshing(false);
    }
  }, [
    loadConversationDetail,
    loadConversations,
    selectedId,
  ]);

  useEffect(() => {
    void loadConversations(true);
  }, [loadConversations]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadConversations(false);

      if (selectedId !== null) {
        void loadConversationDetail(selectedId, {
          showLoader: false,
          markRead: true,
        }).catch(() => {
          // Background refresh is intentionally silent.
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [
    loadConversationDetail,
    loadConversations,
    selectedId,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: detailLoading ? "auto" : "smooth",
      block: "end",
    });
  }, [detail?.messages, detailLoading]);

  useEffect(() => {
    if (selectedId !== null) {
      replyInputRef.current?.focus();
    }
  }, [selectedId]);

  useEffect(() => {
    setSelectedId(null);
    setDetail(null);
    setReplyDraft("");
    setReplyError("");
  }, [filter]);

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) =>
          total + Number(conversation.unread_count || 0),
        0,
      ),
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return conversations;

    return conversations.filter((conversation) =>
      [
        conversation.customer_name,
        conversation.customer_number,
        conversation.last_message_preview,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query),
        ),
    );
  }, [conversations, search]);

  const selectedConversation = detail;

  const replyWindow = getReplyWindowState(
    selectedConversation,
  );

  const hasMessages = Boolean(detail?.messages?.length);

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-5">
      {/* Page heading */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-faint">
            <MessageCircle className="h-4 w-4 text-brand-600" />
            Growth / Conversations
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              WhatsApp Inbox
            </h1>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-medium text-ink-soft shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live updates · 10s
            </div>
          </div>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Manage customer conversations, respond from BlazeLine,
            and keep every WhatsApp interaction in one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadTotal > 0 ? (
            <div className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 sm:flex">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
              unread
            </div>
          ) : null}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={refreshing || listLoading}
          >
            <RefreshCw
              className={
                refreshing || listLoading
                  ? "h-4 w-4 animate-spin"
                  : "h-4 w-4"
              }
            />
            Refresh
          </Button>
        </div>
      </header>

      {/* Global error */}
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          <div className="min-w-0 flex-1">
            {error}
          </div>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
            className="shrink-0 rounded-lg p-1 transition hover:bg-danger/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Main inbox */}
      <section className="grid min-h-[700px] flex-1 overflow-hidden rounded-[22px] border border-line bg-white shadow-card lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Left panel */}
        <aside
          className={`min-h-0 flex-col border-b border-line lg:flex lg:border-b-0 lg:border-r ${
            selectedId !== null
              ? "hidden"
              : "flex"
          }`}
        >
          {/* Toolbar */}
          <div className="border-b border-line bg-white p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customers or messages…"
                className="h-10 rounded-xl pl-9 pr-3"
                aria-label="Search conversations"
              />
            </div>

            <div className="mt-3 flex items-center gap-1 rounded-xl bg-black/[0.035] p-1">
              <button
                type="button"
                onClick={() => setFilter("open")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  filter === "open"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                Open

                {filter === "open" ? (
                  <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-700">
                    {conversations.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setFilter("closed")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  filter === "closed"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                Closed
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <Inbox className="h-3.5 w-3.5 text-ink-faint" />
                {filter === "open"
                  ? "Active conversations"
                  : "Closed conversations"}
              </div>

              <span className="text-[11px] text-ink-faint">
                {filteredConversations.length} shown
              </span>
            </div>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="space-y-1 p-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`conversation-skeleton-${index}`}
                    className="rounded-2xl p-3"
                  >
                    <div className="flex gap-3">
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-black/[0.045]" />

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-2/3 animate-pulse rounded bg-black/[0.045]" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-black/[0.035]" />
                        <div className="h-3 w-full animate-pulse rounded bg-black/[0.035]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length ? (
              <div className="divide-y divide-line">
                {filteredConversations.map(
                  (conversation) => {
                    const active =
                      selectedId === conversation.id;

                    const unread =
                      Number(
                        conversation.unread_count || 0,
                      ) > 0;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() =>
                          void openConversation(
                            conversation.id,
                          )
                        }
                        className={`group w-full px-4 py-3.5 text-left transition ${
                          active
                            ? "bg-brand-50/70"
                            : "hover:bg-black/[0.02]"
                        }`}
                        aria-current={
                          active ? "true" : undefined
                        }
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div
                            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                              active
                                ? "bg-brand-100 text-brand-700"
                                : "bg-black/[0.045] text-ink-soft"
                            }`}
                          >
                            {conversationInitial(
                              conversation,
                            )}

                            {unread ? (
                              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-brand-600 px-1 text-[8px] font-bold text-white">
                                {conversation.unread_count >
                                9
                                  ? "9+"
                                  : conversation.unread_count}
                              </span>
                            ) : null}
                          </div>

                          {/* Conversation data */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={`truncate text-sm ${
                                  unread
                                    ? "font-semibold text-ink"
                                    : "font-medium text-ink"
                                }`}
                              >
                                {conversationName(
                                  conversation,
                                )}
                              </p>

                              <span
                                className={`shrink-0 text-[10px] ${
                                  unread
                                    ? "font-medium text-brand-700"
                                    : "text-ink-faint"
                                }`}
                              >
                                {formatConversationDate(
                                  conversation.last_message_at,
                                )}
                              </span>
                            </div>

                            <p className="mt-0.5 truncate text-[10px] text-ink-faint">
                              {normalizePhone(
                                conversation.customer_number,
                              )}
                            </p>

                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p
                                className={`truncate text-xs ${
                                  unread
                                    ? "font-medium text-ink-soft"
                                    : "text-ink-faint"
                                }`}
                              >
                                {conversation.last_message_preview ||
                                  "No message preview"}
                              </p>

                              {conversation.status ===
                              "open" ? (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                                  Open
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-black/[0.045] px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">
                                  Closed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.035] text-ink-faint">
                  <MessageCircle className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-ink">
                  {search.trim()
                    ? "No matching conversations"
                    : filter === "open"
                      ? "No open conversations"
                      : "No closed conversations"}
                </h3>

                <p className="mt-1 max-w-xs text-xs leading-5 text-ink-faint">
                  {search.trim()
                    ? "Try another customer name, phone number or message."
                    : "New WhatsApp conversations will appear here automatically."}
                </p>

                {search.trim() ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <main
          className={`min-h-0 flex-col bg-canvas ${
            selectedId !== null
              ? "flex"
              : "hidden lg:flex"
          }`}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-brand-100 bg-brand-50 text-brand-600 shadow-sm">
                  <MessageCircle className="h-8 w-8" />
                </div>

                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-canvas bg-white text-emerald-600 shadow-sm">
                  <Wifi className="h-3.5 w-3.5" />
                </span>
              </div>

              <h2 className="mt-6 text-lg font-semibold tracking-tight text-ink">
                Your customer conversations
              </h2>

              <p className="mt-1 max-w-md text-sm leading-6 text-ink-faint">
                Select a conversation from the left to view the full
                message history and reply directly from BlazeLine.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-line bg-white px-3 py-1.5 text-[10px] font-medium text-ink-soft">
                  Live updates
                </span>

                <span className="rounded-full border border-line bg-white px-3 py-1.5 text-[10px] font-medium text-ink-soft">
                  Customer history
                </span>

                <span className="rounded-full border border-line bg-white px-3 py-1.5 text-[10px] font-medium text-ink-soft">
                  Direct replies
                </span>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-line bg-white px-4 py-4 lg:px-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-black/[0.045]" />

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-black/[0.045]" />
                    <div className="h-3 w-24 animate-pulse rounded bg-black/[0.035]" />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-hidden p-5">
                <div className="h-20 w-[68%] animate-pulse rounded-2xl bg-black/[0.035]" />
                <div className="ml-auto h-24 w-[62%] animate-pulse rounded-2xl bg-black/[0.035]" />
                <div className="h-16 w-[48%] animate-pulse rounded-2xl bg-black/[0.035]" />
                <div className="ml-auto h-20 w-[54%] animate-pulse rounded-2xl bg-black/[0.035]" />
              </div>
            </div>
          ) : selectedConversation ? (
            <>
              {/* Conversation header */}
              <div className="border-b border-line bg-white px-4 py-3.5 lg:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={closeConversationView}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition hover:bg-black/[0.03] lg:hidden"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 text-xs font-semibold">
                      {conversationInitial(
                        selectedConversation,
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-ink">
                          {conversationName(
                            selectedConversation,
                          )}
                        </h2>

                        <span className="hidden shrink-0 items-center gap-1 text-[9px] font-medium text-emerald-600 sm:inline-flex">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          WhatsApp
                        </span>
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-faint">
                        <span>
                          {normalizePhone(
                            selectedConversation.customer_number,
                          )}
                        </span>

                        <span className="hidden text-line sm:inline">
                          •
                        </span>

                        <span>
                          Last active{" "}
                          {formatConversationDate(
                            selectedConversation.last_message_at,
                          ) || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {selectedConversation.status ===
                    "open" ? (
                      <Badge variant="success">
                        Open
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        Closed
                      </Badge>
                    )}

                    {selectedConversation.customer_number ? (
                      <a
                        href={`tel:${selectedConversation.customer_number}`}
                        className="hidden h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition hover:bg-black/[0.03] sm:flex"
                        aria-label="Call customer"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>

                {/* Session indicator */}
                <div
                  className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                    replyWindow.active
                      ? "border-emerald-100 bg-emerald-50/70"
                      : "border-danger/15 bg-danger-bg"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Clock3
                      className={`h-3.5 w-3.5 shrink-0 ${
                        replyWindow.active
                          ? "text-emerald-600"
                          : "text-danger"
                      }`}
                    />

                    <p
                      className={`truncate text-[10px] font-medium ${
                        replyWindow.active
                          ? "text-emerald-700"
                          : "text-danger"
                      }`}
                    >
                      {replyWindow.label}
                    </p>
                  </div>

                  {replyWindow.expiresAt ? (
                    <span className="shrink-0 text-[9px] text-ink-faint">
                      {replyWindow.active
                        ? `Until ${formatMessageTime(
                            replyWindow.expiresAt,
                          )}`
                        : `Expired ${formatDate(
                            replyWindow.expiresAt,
                          )}`}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Messages */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
                  {hasMessages ? (
                    <>
                      <div className="mb-3 flex justify-center">
                        <span className="rounded-full border border-line bg-white px-3 py-1 text-[9px] font-medium uppercase tracking-wider text-ink-faint shadow-sm">
                          Conversation history
                        </span>
                      </div>

                      {selectedConversation?.messages?.map((message) => {
                        const outbound =
                          message.direction ===
                          "outbound";

                        const failed =
                          message.status === "failed";

                        const text =
                          message.text?.trim() ||
                          `[${messageTypeLabel(
                            message.message_type,
                          )}]`;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              outbound
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`flex max-w-[88%] flex-col sm:max-w-[78%] ${
                                outbound
                                  ? "items-end"
                                  : "items-start"
                              }`}
                            >
                              <div
                                className={`rounded-[18px] px-3.5 py-2.5 shadow-sm ${
                                  failed
                                    ? "border border-danger/20 bg-danger-bg text-danger"
                                    : outbound
                                      ? "rounded-br-md bg-brand-600 text-white"
                                      : "rounded-bl-md border border-line bg-white text-ink"
                                }`}
                              >
                                {message.message_type !==
                                "text" ? (
                                  <div
                                    className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                      outbound
                                        ? "bg-white/15 text-white/80"
                                        : "bg-black/[0.04] text-ink-faint"
                                    }`}
                                  >
                                    {messageTypeLabel(
                                      message.message_type,
                                    )}
                                  </div>
                                ) : null}

                                <p className="whitespace-pre-wrap break-words text-[13px] leading-6">
                                  {text}
                                </p>

                                <div
                                  className={`mt-1.5 flex items-center justify-end gap-1.5 text-[9px] ${
                                    failed
                                      ? "text-danger/70"
                                      : outbound
                                        ? "text-white/60"
                                        : "text-ink-faint"
                                  }`}
                                >
                                  <span>
                                    {formatMessageTime(
                                      message.occurred_at,
                                    )}
                                  </span>

                                  {outbound ? (
                                    <>
                                      <MessageStatus
                                        status={
                                          message.status
                                        }
                                      />

                                      {failed ? (
                                        <span className="font-medium">
                                          Failed
                                        </span>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-faint shadow-sm ring-1 ring-black/[0.03]">
                        <MessageCircle className="h-6 w-6" />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-ink">
                        No messages yet
                      </p>

                      <p className="mt-1 max-w-xs text-xs leading-5 text-ink-faint">
                        Start the conversation using the reply box
                        below.
                      </p>
                    </div>
                  )}

                  <div
                    ref={messagesEndRef}
                    aria-hidden="true"
                    className="h-px"
                  />
                </div>
              </div>

              {/* Reply composer */}
              <div className="border-t border-line bg-white p-4 lg:p-5">
                {replyError ? (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-bg px-3 py-2.5 text-xs text-danger">
                    <div className="min-w-0 flex-1 leading-5">
                      {replyError}
                    </div>

                    <button
                      type="button"
                      onClick={() => setReplyError("")}
                      className="shrink-0 p-0.5"
                      aria-label="Dismiss reply error"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                {selectedConversation.status !==
                "open" ? (
                  <div className="rounded-2xl border border-line bg-canvas px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-ink-faint">
                        <Inbox className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink">
                          Conversation closed
                        </p>

                        <p className="mt-0.5 text-[10px] leading-5 text-ink-faint">
                          This conversation is read-only until a
                          new WhatsApp conversation is started.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !replyWindow.active ? (
                  <div className="rounded-2xl border border-danger/15 bg-danger-bg px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-danger">
                        <Clock3 className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-danger">
                          24-hour reply window expired
                        </p>

                        <p className="mt-0.5 text-[10px] leading-5 text-danger/75">
                          Free-form replies are no longer available
                          for this customer. An approved WhatsApp
                          template is required to continue the
                          conversation.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-line bg-canvas p-2 transition focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-50">
                      <textarea
                        ref={replyInputRef}
                        value={replyDraft}
                        onChange={(event) => {
                          setReplyDraft(
                            event.target.value,
                          );

                          if (replyError) {
                            setReplyError("");
                          }
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();
                            void handleSendReply();
                          }
                        }}
                        placeholder="Write a reply to the customer…"
                        rows={3}
                        maxLength={4096}
                        disabled={sendingReply}
                        className="max-h-40 min-h-[76px] w-full resize-none border-0 bg-transparent px-2.5 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-faint focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="WhatsApp reply"
                      />

                      <div className="flex items-center justify-between gap-3 px-2.5 pb-1.5">
                        <div className="flex min-w-0 items-center gap-2 text-[9px] text-ink-faint">
                          <span className="hidden sm:inline">
                            Enter to send
                          </span>

                          <span className="hidden text-line sm:inline">
                            •
                          </span>

                          <span>
                            Shift + Enter for new line
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() =>
                            void handleSendReply()
                          }
                          disabled={
                            !replyDraft.trim() ||
                            sendingReply
                          }
                          className="shrink-0 rounded-xl px-3.5"
                        >
                          {sendingReply ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}

                          <span className="hidden sm:inline">
                            {sendingReply
                              ? "Sending…"
                              : "Send reply"}
                          </span>

                          <span className="sm:hidden">
                            Send
                          </span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 px-1">
                      <div className="flex min-w-0 items-center gap-1.5 text-[9px] text-ink-faint">
                        <UserRound className="h-3 w-3 shrink-0" />

                        <span className="truncate">
                          Replying as BlazeLine
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 text-[9px] text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        WhatsApp connected
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Conversation footer */}
              <div className="border-t border-line bg-white px-4 py-2.5 lg:px-5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[9px] text-ink-faint">
                  <span>
                    Last inbound{" "}
                    {formatDate(
                      selectedConversation.last_inbound_at,
                    )}
                  </span>

                  <span>
                    Last outbound{" "}
                    {formatDate(
                      selectedConversation.last_outbound_at,
                    )}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="text-center text-sm text-ink-faint">
                Conversation unavailable.
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}