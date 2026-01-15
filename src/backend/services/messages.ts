import { sql } from "bun";
import sanitizeHtml from "sanitize-html";
import { toMessageImageUrl, toISOString } from "@/backend/lib/transforms";
import type { Message, MessageType, MessageEdit } from "@/shared/schemas";

/**
 * Message service.
 * Handles message CRUD, edit history, and content sanitization.
 * All operations require userId for access control.
 */

// Re-export types for convenience
export type { Message, MessageType, MessageEdit } from "@/shared/schemas";

// ==========================
// Internal Types (not part of API)
// ==========================

export type MessageFilters = {
  chatroomId: string;
  userId: string;
  before?: string;
  contentType?: MessageType;
  includeDeleted?: boolean;
  search?: string;
};

export type MessageCreate = {
  chatroomId: string;
  userId: string;
  createdBy: string | null;
  contentType: MessageType;
  content: string;
  contentMeta?: string | null;
};

/** 10 minutes edit/delete window */
const EDIT_WINDOW_MS = 10 * 60 * 1000;

/** Checks if message is within the edit window */
const isWithinEditWindow = (createdAt: Date | string): boolean => {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Date.now() - created.getTime() < EDIT_WINDOW_MS;
};

/** Checks if message type can be edited */
const isEditableType = (contentType: MessageType): boolean => contentType === "text";

/** Sanitizes message content. Strips HTML from text/info, leaves images/gifs untouched. */
const sanitizeContent = (content: string, contentType: MessageType): string => {
  if (contentType === "image" || contentType === "gif") return content;
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
};

/** Fetches edit history for a message */
const getHistory = async (messageId: string): Promise<MessageEdit[]> => {
  const rows = (await sql`
    SELECT old_content, edited_at
    FROM message_edits
    WHERE message_id = ${messageId}
    ORDER BY edited_at ASC
  `) as { old_content: string; edited_at: Date }[];

  return rows.map((row) => ({
    old_content: row.old_content,
    edited_at: toISOString(row.edited_at),
  }));
};

/** Transforms a database row to a Message object. */
const transformMessage = (row: any, history: MessageEdit[] = []): Message => ({
  id: row.id,
  chatroom_id: row.chatroom_id,
  chatroom_name: row.chatroom_name,
  created_by: row.created_by,
  created_by_username: row.created_by_username,
  created_by_bio: row.created_by_bio,
  content_type: row.content_type,
  content: row.content_type === "image" ? toMessageImageUrl(row.id) : row.content,
  content_meta: row.content_meta ?? null,
  created_at: toISOString(row.created_at),
  deleted: row.deleted ?? false,
  history,
});

// ==========================
// Access Control
// ==========================

type AccessResult = { success: true } | { success: false; error: "not_found" | "no_access" };

/** Checks if user can access a chatroom. */
const checkChatroomAccess = async (params: { chatroomId: string; userId: string }): Promise<AccessResult> => {
  const [row] = (await sql`
    SELECT
      c.id,
      (c.is_townsquare OR u.role = 'admin' OR cm.role >= 'member') as can_access
    FROM chatrooms c
    JOIN users u ON u.id = ${params.userId}
    LEFT JOIN chatroom_members cm ON c.id = cm.chatroom_id AND cm.user_id = ${params.userId}
    WHERE c.id = ${params.chatroomId} AND NOT c.deleted
  `) as { id: string; can_access: boolean }[] | undefined[];

  if (!row) return { success: false, error: "not_found" };
  if (!row.can_access) return { success: false, error: "no_access" };
  return { success: true };
};

// ==========================
// Queries
// ==========================

const getAll = async (params: {
  filters: MessageFilters;
  page: number;
  perPage: number;
  isAdmin?: boolean;
}): Promise<{ messages: Message[]; total: number; totalPages: number } | { error: "not_found" | "no_access" }> => {
  const { filters, page, perPage, isAdmin } = params;

  // Check access first
  const access = await checkChatroomAccess({ chatroomId: filters.chatroomId, userId: filters.userId });
  if (!access.success) return { error: access.error };

  const before = filters.before
    ? sql`AND m.created_at < (SELECT created_at FROM messages WHERE id = ${filters.before})`
    : sql``;

  const contentTypeFilter = filters.contentType ? sql`AND m.content_type = ${filters.contentType}` : sql``;

  // Only admins can see deleted messages when includeDeleted is true
  const deletedFilter = filters.includeDeleted && isAdmin ? sql`` : sql`AND NOT m.deleted`;

  const searchFilter = filters.search ? sql`AND m.content ILIKE ${"%" + filters.search + "%"}` : sql``;

  const [{ total }] = (await sql`
    SELECT COUNT(*)::int as total
    FROM messages m
    WHERE m.chatroom_id = ${filters.chatroomId} ${before} ${contentTypeFilter} ${deletedFilter} ${searchFilter}
  `) as [{ total: number }];

  const rows = (await sql`
    SELECT
      m.id, m.chatroom_id, m.created_by, m.content_type, m.content, m.content_meta, m.created_at, m.deleted,
      u.username as created_by_username,
      u.bio as created_by_bio,
      c.name as chatroom_name
    FROM messages m
    LEFT JOIN users u ON m.created_by = u.id
    LEFT JOIN chatrooms c ON m.chatroom_id = c.id
    WHERE m.chatroom_id = ${filters.chatroomId} ${before} ${contentTypeFilter} ${deletedFilter} ${searchFilter}
    ORDER BY m.created_at DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `) as any[];

  // Load history for each message
  const messages = await Promise.all(
    rows.map(async (row) => {
      const history = await getHistory(row.id);
      return transformMessage(row, history);
    }),
  );

  return {
    messages,
    total,
    totalPages: Math.ceil(total / perPage),
  };
};

/** Gets a single message by ID with history */
const getById = async (params: {
  id: string;
  userId: string;
  includeDeleted?: boolean;
  isAdmin?: boolean;
}): Promise<Message | { error: "not_found" | "no_access" }> => {
  const { id, userId, includeDeleted, isAdmin } = params;

  // Only admins can see deleted messages when includeDeleted is true
  const deletedFilter = includeDeleted && isAdmin ? sql`` : sql`AND NOT m.deleted`;

  const [row] = (await sql`
    SELECT
      m.id, m.chatroom_id, m.created_by, m.content_type, m.content, m.content_meta, m.created_at, m.deleted,
      u.username as created_by_username,
      u.bio as created_by_bio,
      c.name as chatroom_name
    FROM messages m
    LEFT JOIN users u ON m.created_by = u.id
    LEFT JOIN chatrooms c ON m.chatroom_id = c.id
    WHERE m.id = ${id} ${deletedFilter}
  `) as any[];

  if (!row) return { error: "not_found" };

  // Check access to chatroom
  const access = await checkChatroomAccess({ chatroomId: row.chatroom_id, userId });
  if (!access.success) return { error: access.error };

  const history = await getHistory(id);
  return transformMessage(row, history);
};

/** Updates a message (only text, only creator, within 10 min) */
const update = async (params: {
  id: string;
  userId: string;
  content: string;
}): Promise<
  Message | { error: "not_found" | "no_access" | "not_creator" | "too_old" | "not_editable" | "no_change" }
> => {
  const { id, userId, content } = params;

  // Get the message first
  const [row] = (await sql`
    SELECT
      m.id, m.chatroom_id, m.created_by, m.content_type, m.content, m.content_meta, m.created_at, m.deleted,
      u.username as created_by_username,
      u.bio as created_by_bio,
      c.name as chatroom_name
    FROM messages m
    LEFT JOIN users u ON m.created_by = u.id
    LEFT JOIN chatrooms c ON m.chatroom_id = c.id
    WHERE m.id = ${id} AND NOT m.deleted
  `) as any[];

  if (!row) return { error: "not_found" };

  // Check access to chatroom
  const access = await checkChatroomAccess({ chatroomId: row.chatroom_id, userId });
  if (!access.success) return { error: access.error };

  // Only creator can edit
  if (row.created_by !== userId) return { error: "not_creator" };

  // Check edit window
  if (!isWithinEditWindow(row.created_at)) return { error: "too_old" };

  // Only text messages can be edited
  if (!isEditableType(row.content_type)) return { error: "not_editable" };

  // Sanitize new content
  const sanitizedContent = sanitizeContent(content, row.content_type);

  // Check if content is identical (case sensitive)
  if (sanitizedContent === row.content) return { error: "no_change" };

  // Save old content to history
  await sql`
    INSERT INTO message_edits (message_id, old_content)
    VALUES (${id}, ${row.content})
  `;

  // Update message
  await sql`
    UPDATE messages SET content = ${sanitizedContent}
    WHERE id = ${id}
  `;

  // Return updated message with history
  const history = await getHistory(id);
  return transformMessage({ ...row, content: sanitizedContent }, history);
};

/** Soft-deletes a message (only creator, within 10 min) */
const remove = async (params: {
  id: string;
  userId: string;
}): Promise<{ success: true } | { error: "not_found" | "no_access" | "not_creator" | "too_old" }> => {
  const { id, userId } = params;

  // Get the message first
  const [row] = (await sql`
    SELECT m.id, m.chatroom_id, m.created_by, m.created_at
    FROM messages m
    WHERE m.id = ${id} AND NOT m.deleted
  `) as any[];

  if (!row) return { error: "not_found" };

  // Check access to chatroom
  const access = await checkChatroomAccess({ chatroomId: row.chatroom_id, userId });
  if (!access.success) return { error: access.error };

  // Only creator can delete
  if (row.created_by !== userId) return { error: "not_creator" };

  // Check delete window
  if (!isWithinEditWindow(row.created_at)) return { error: "too_old" };

  // Soft delete
  await sql`
    UPDATE messages SET deleted = true, deleted_at = now()
    WHERE id = ${id}
  `;

  return { success: true };
};

const create = async (params: MessageCreate): Promise<Message | { error: "not_found" | "no_access" }> => {
  // Check access first
  const access = await checkChatroomAccess({ chatroomId: params.chatroomId, userId: params.userId });
  if (!access.success) return { error: access.error };

  const sanitizedContent = sanitizeContent(params.content, params.contentType);
  const contentMeta = params.contentMeta ?? null;

  const [row] = (await sql`
    WITH inserted AS (
      INSERT INTO messages (chatroom_id, created_by, content_type, content, content_meta)
      VALUES (${params.chatroomId}, ${params.createdBy}, ${params.contentType}, ${sanitizedContent}, ${contentMeta})
      RETURNING *
    )
    SELECT
      inserted.id, inserted.chatroom_id, inserted.created_by, inserted.content_type,
      inserted.content, inserted.content_meta, inserted.created_at, inserted.deleted,
      c.name as chatroom_name,
      u.username as created_by_username,
      u.bio as created_by_bio
    FROM inserted
    JOIN chatrooms c ON c.id = inserted.chatroom_id
    LEFT JOIN users u ON u.id = inserted.created_by
  `) as any[];

  // New messages have no history
  return transformMessage(row, []);
};

// ==========================
// Raw Data Access (for image routes)
// ==========================

const getImageData = async (params: { id: string }): Promise<{ content: string; content_type: MessageType } | null> => {
  const [message] = (await sql`
    SELECT content, content_type FROM messages WHERE id = ${params.id}
  `) as { content: string; content_type: MessageType }[];

  if (!message || message.content_type !== "image") return null;

  return message;
};

// ==========================
// Service Export
// ==========================

export const messageService = {
  getAll,
  getById,
  create,
  update,
  remove,
  getImageData,
};
