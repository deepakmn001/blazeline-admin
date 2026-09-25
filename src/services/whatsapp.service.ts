import api from "@/lib/api";

// ==========================================================
// TYPES
// ==========================================================

export type WhatsAppConversationStatus = "open" | "closed";

export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppMessage = {
  id: number;
  direction: WhatsAppMessageDirection;
  message_type: string;
  text: string;
  status: string;
  provider_message_id?: string | null;
  provider_request_id?: string;
  sent_by?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  occurred_at: string;
  created_at: string;
};

export type WhatsAppConversation = {
  id: number;
  integrated_number: string;
  customer_number: string;
  customer_name: string;
  status: WhatsAppConversationStatus;
  unread_count: number;
  last_message_preview: string;
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  session_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppConversationDetail =
  WhatsAppConversation & {
    messages: WhatsAppMessage[];
  };

export type WhatsAppConversationsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: WhatsAppConversation[];
};

// ==========================================================
// QUERY PARAMS
// ==========================================================

export type WhatsAppConversationListParams = {
  q?: string;
  status?: WhatsAppConversationStatus;
  page?: number;
  page_size?: number;
};

// ==========================================================
// HELPERS
// ==========================================================

const asData = <T,>(response: { data: T }) => response.data;

const buildQuery = (
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  return search.toString();
};

// ==========================================================
// CONVERSATIONS — LIST
// ==========================================================

export async function getWhatsAppConversations(
  params: WhatsAppConversationListParams = {},
) {
  const query = buildQuery({
    q: params.q,
    status: params.status,
    page: params.page,
    page_size: params.page_size ?? 50,
  });

  const response =
    await api.get<WhatsAppConversationsResponse>(
      `/admin/whatsapp/conversations/${
        query ? `?${query}` : ""
      }`,
    );

  return asData(response);
}

// ==========================================================
// CONVERSATION — DETAIL
// ==========================================================

export async function getWhatsAppConversation(
  id: number,
) {
  const response =
    await api.get<WhatsAppConversationDetail>(
      `/admin/whatsapp/conversations/${id}/`,
    );

  return asData(response);
}

// ==========================================================
// CONVERSATION — MARK AS READ
// ==========================================================

export async function markWhatsAppConversationRead(
  id: number,
) {
  const response = await api.post<{
    success: boolean;
    conversation_id: number;
    unread_count: number;
  }>(
    `/admin/whatsapp/conversations/${id}/read/`,
  );

  return asData(response);
}

// ==========================================================
// CONVERSATION — SEND REPLY
// ==========================================================

export async function sendWhatsAppReply(
  id: number,
  message: string,
) {
  const response = await api.post<{
    success: boolean;
    message: WhatsAppMessage;
    conversation: WhatsAppConversation;
  }>(
    `/admin/whatsapp/conversations/${id}/reply/`,
    {
      message,
    },
  );

  return asData(response);
}