import { sql } from "bun";
import { toChatroomImageUrl, toAvatarUrl, toISOString, toISOStringNullable } from "@/backend/lib/transforms";
import type { Chatroom, ChatroomMember, ChatroomRole } from "@/shared/schemas";

/**
 * Chatroom service.
 * Handles chatroom CRUD, membership, and access control.
 */

// Re-export types for convenience
export type { Chatroom, ChatroomMember, ChatroomRole } from "@/shared/schemas";

// ==========================
// Internal Types (not part of API)
// ==========================

export type ChatroomFilters = {
  userId: string;
  search?: string;
  filterFavorited?: boolean;
  filterUnmuted?: boolean;
  includeUnlisted?: boolean;
  includeDeleted?: boolean;
};

export type ChatroomCreate = {
  name: string;
  createdBy: string;
  description?: string | null;
  unlisted?: boolean;
  isTownsquare?: boolean;
  botsAllowed?: boolean;
  image?: string | null;
};

export type ChatroomUpdate = {
  name?: string;
  description?: string | null;
  image?: string | null;
  // Note: unlisted and is_townsquare are immutable after creation
  pinned?: boolean;
  deleted?: boolean;
};

/** Transforms a database row to a Chatroom object. */
const transformChatroom = (row: any): Chatroom => ({
  id: row.id,
  name: row.name,
  description: row.description || null,
  image: toChatroomImageUrl(row.id, !!row.has_image),
  unlisted: row.unlisted,
  pinned: row.pinned,
  deleted: row.deleted ?? false,
  is_townsquare: row.is_townsquare,
  bots_allowed: row.bots_allowed ?? true,
  created_at: toISOString(row.created_at),
  last_activity: toISOStringNullable(row.last_activity),
  is_favorited: row.is_favorited ?? false,
  is_unmuted: row.is_unmuted ?? false,
  user_role: row.user_role ?? null,
  can_manage: row.can_manage ?? false,
  join_token: row.can_manage ? row.join_token : null,
});

/** Transforms a database row to a ChatroomMember object. */
const transformMember = (row: any): ChatroomMember => ({
  id: row.id,
  username: row.username,
  bio: row.bio || null,
  avatar: toAvatarUrl(row.id, !!row.has_avatar),
  role: row.role,
  is_bot: row.is_bot ?? false,
  created_at: toISOString(row.created_at),
  real_name: row.real_name || null,
  chatroom_role: row.chatroom_role,
});

/** Combines SQL fragments into a single query. */
const combineFilters = (...filters: unknown[]) => filters.reduce((acc, filter) => sql`${acc} ${filter}`, sql``);

/** Builds WHERE clause from filter options (includes access check). */
const buildFilters = ({ search, filterFavorited, filterUnmuted, includeUnlisted, includeDeleted }: ChatroomFilters) =>
  combineFilters(
    sql`WHERE (NOT c.deleted OR (${includeDeleted ?? false} AND u.role = 'admin'))`,
    sql`AND (c.is_townsquare OR u.role = 'admin' OR cm.role >= 'member')`,
    sql`AND (NOT c.unlisted OR (${includeUnlisted ?? false} AND u.role = 'admin'))`,
    search ? sql`AND (c.name ILIKE ${"%" + search + "%"} OR c.description ILIKE ${"%" + search + "%"})` : sql``,
    filterFavorited ? sql`AND fc.user_id IS NOT NULL` : sql``,
    filterUnmuted ? sql`AND uc.user_id IS NOT NULL` : sql``,
  );

/** Base SELECT with all JOINs for permission-aware queries. */
const selectWithJoins = (userId: string) => sql`
  SELECT
    c.id, c.name, c.description, c.unlisted, c.pinned, c.deleted, c.is_townsquare, c.bots_allowed, c.join_token, c.created_at,
    (c.image IS NOT NULL) as has_image,
    (SELECT MAX(created_at) FROM messages WHERE chatroom_id = c.id) as last_activity,
    COALESCE(fc.user_id IS NOT NULL, false) as is_favorited,
    COALESCE(uc.user_id IS NOT NULL, false) as is_unmuted,
    cm.role as user_role,
    (u.role = 'admin' OR cm.role >= 'manage') as can_manage
  FROM chatrooms c
  JOIN users u ON u.id = ${userId}
  LEFT JOIN chatroom_members cm ON c.id = cm.chatroom_id AND cm.user_id = ${userId}
  LEFT JOIN favorite_chatrooms fc ON c.id = fc.chatroom_id AND fc.user_id = ${userId}
  LEFT JOIN unmuted_chatrooms uc ON c.id = uc.chatroom_id AND uc.user_id = ${userId}
`;

// ==========================
// Queries
// ==========================

/** Gets all accessible chatrooms with pagination. */
const getAll = async (params: {
  filters: ChatroomFilters;
  page: number;
  perPage: number;
}): Promise<{ chatrooms: Chatroom[]; total: number; totalPages: number }> => {
  const { filters, page, perPage } = params;
  const where = buildFilters(filters);

  const [{ total }] = (await sql`
    SELECT COUNT(*)::int as total
    FROM chatrooms c
    JOIN users u ON u.id = ${filters.userId}
    LEFT JOIN chatroom_members cm ON c.id = cm.chatroom_id AND cm.user_id = ${filters.userId}
    LEFT JOIN favorite_chatrooms fc ON c.id = fc.chatroom_id AND fc.user_id = ${filters.userId}
    LEFT JOIN unmuted_chatrooms uc ON c.id = uc.chatroom_id AND uc.user_id = ${filters.userId}
    ${where}
  `) as [{ total: number }];

  const rows = (await sql`
    ${selectWithJoins(filters.userId)} ${where}
    ORDER BY c.pinned DESC, last_activity DESC NULLS LAST, c.created_at DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `) as any[];

  return {
    chatrooms: rows.map(transformChatroom),
    total,
    totalPages: Math.ceil(total / perPage),
  };
};

/** Gets a chatroom by ID if user has access. Returns null if no access or not found. */
const getById = async (params: { id: string; userId: string }): Promise<Chatroom | null> => {
  const { id, userId } = params;

  const [row] = (await sql`
    ${selectWithJoins(userId)}
    WHERE c.id = ${id} AND NOT c.deleted
      AND (c.is_townsquare OR u.role = 'admin' OR cm.role >= 'member')
  `) as any[];

  return row ? transformChatroom(row) : null;
};

/** Checks if user can access a chatroom (for WebSocket etc.). */
const canAccess = async (params: { chatroomId: string; userId: string }): Promise<boolean> => {
  const { chatroomId, userId } = params;

  const [row] = (await sql`
    SELECT
      (c.is_townsquare OR u.role = 'admin' OR cm.role >= 'member') as can_access
    FROM chatrooms c
    JOIN users u ON u.id = ${userId}
    LEFT JOIN chatroom_members cm ON c.id = cm.chatroom_id AND cm.user_id = ${userId}
    WHERE c.id = ${chatroomId} AND NOT c.deleted
  `) as { can_access: boolean }[];

  return row?.can_access ?? false;
};

/** Creates a new chatroom and adds creator as manager. */
const create = async (params: ChatroomCreate): Promise<Chatroom> => {
  const isTownsquare = params.isTownsquare ?? true;
  const botsAllowed = params.botsAllowed ?? true;

  const [row] = (await sql`
    INSERT INTO chatrooms (name, description, unlisted, image, is_townsquare, bots_allowed)
    VALUES (${params.name}, ${params.description ?? null}, ${params.unlisted ?? false}, ${params.image ?? null}, ${isTownsquare}, ${botsAllowed})
    RETURNING id, name, description, unlisted, pinned, is_townsquare, bots_allowed, created_at, (image IS NOT NULL) as has_image
  `) as any[];

  // Add creator as manager
  await sql`
    INSERT INTO chatroom_members (chatroom_id, user_id, role)
    VALUES (${row.id}, ${params.createdBy}, 'manage')
  `;

  await sql`
    INSERT INTO messages (chatroom_id, content_type, content)
    VALUES (${row.id}, 'info', ${'Chatroom "' + params.name + '" created'})
  `;

  return transformChatroom({
    ...row,
    last_activity: null,
    is_favorited: false,
    is_unmuted: false,
    user_role: "manage",
    can_manage: true,
  });
};

/** Updates a chatroom. */
const update = async (params: { id: string; data: ChatroomUpdate }): Promise<Chatroom> => {
  const { id, data } = params;

  // Build update object with only defined fields
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description ?? null;
  if (data.image !== undefined) updates.image = data.image ?? null;
  if (data.pinned !== undefined) updates.pinned = data.pinned;
  if (data.deleted !== undefined) updates.deleted = data.deleted;

  const [row] = (await sql`
    UPDATE chatrooms SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING id, name, description, unlisted, pinned, is_townsquare, bots_allowed, created_at, (image IS NOT NULL) as has_image
  `) as any[];

  return transformChatroom({
    ...row,
    last_activity: null,
    is_favorited: false,
    is_unmuted: false,
    user_role: null,
    can_manage: false,
  });
};

// ==========================
// Member Management
// ==========================

/** Gets all members of a chatroom with pagination. For townsquare rooms, returns only managers. */
const getMembers = async (params: {
  chatroomId: string;
  page: number;
  perPage: number;
}): Promise<
  { members: ChatroomMember[]; total: number; totalPages: number; is_townsquare: boolean } | { error: "not_found" }
> => {
  const { chatroomId, page, perPage } = params;

  // Check if chatroom exists and if it's a townsquare
  const [chatroom] = (await sql`
    SELECT id, is_townsquare FROM chatrooms WHERE id = ${chatroomId} AND NOT deleted
  `) as { id: string; is_townsquare: boolean }[];

  if (!chatroom) {
    return { error: "not_found" };
  }

  if (chatroom.is_townsquare) {
    // Townsquare: return only managers
    const [{ total }] = (await sql`
      SELECT COUNT(*)::int as total
      FROM chatroom_members cm
      WHERE cm.chatroom_id = ${chatroomId} AND cm.role = 'manage'
    `) as [{ total: number }];

    const rows = (await sql`
      SELECT u.id, u.username, u.bio, u.role, u.is_bot, u.created_at, u.real_name, cm.role as chatroom_role,
        (u.avatar IS NOT NULL) as has_avatar
      FROM chatroom_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.chatroom_id = ${chatroomId} AND cm.role = 'manage'
      ORDER BY u.username ASC
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `) as any[];

    return {
      members: rows.map(transformMember),
      total,
      totalPages: Math.ceil(total / perPage),
      is_townsquare: true,
    };
  }

  // Private room: return only explicit members
  const [{ total }] = (await sql`
    SELECT COUNT(*)::int as total
    FROM chatroom_members cm
    WHERE cm.chatroom_id = ${chatroomId}
  `) as [{ total: number }];

  const rows = (await sql`
    SELECT u.id, u.username, u.bio, u.role, u.is_bot, u.created_at, u.real_name, cm.role as chatroom_role,
      (u.avatar IS NOT NULL) as has_avatar
    FROM chatroom_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.chatroom_id = ${chatroomId}
    ORDER BY
      CASE cm.role WHEN 'manage' THEN 0 ELSE 1 END,
      u.username ASC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `) as any[];

  return {
    members: rows.map(transformMember),
    total,
    totalPages: Math.ceil(total / perPage),
    is_townsquare: false,
  };
};

/** Adds a member to a chatroom. Does nothing if user is already a member. */
const addMember = async (params: {
  chatroomId: string;
  userId: string;
  role?: ChatroomRole;
}): Promise<{ success: true } | { success: false; error: string }> => {
  const role = params.role ?? "member";

  // Check if user is a bot and if bots are allowed in this chatroom
  const [user] = (await sql`SELECT is_bot FROM users WHERE id = ${params.userId}`) as { is_bot: boolean }[];
  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (user.is_bot) {
    const [chatroom] = (await sql`
      SELECT bots_allowed FROM chatrooms WHERE id = ${params.chatroomId} AND NOT deleted
    `) as { bots_allowed: boolean }[];

    if (!chatroom) {
      return { success: false, error: "Chatroom not found" };
    }

    if (!chatroom.bots_allowed) {
      return { success: false, error: "Bots are not allowed in this chatroom" };
    }
  }

  await sql`
    INSERT INTO chatroom_members (chatroom_id, user_id, role)
    VALUES (${params.chatroomId}, ${params.userId}, ${role})
    ON CONFLICT (chatroom_id, user_id) DO NOTHING
  `;

  return { success: true };
};

/** Updates a member's role. Returns error if demoting the last manager. */
const updateMemberRole = async (params: {
  chatroomId: string;
  userId: string;
  role: ChatroomRole;
}): Promise<{ success: boolean; error?: string }> => {
  const { chatroomId, userId, role } = params;

  // Check current role
  const [membership] = (await sql`
    SELECT role FROM chatroom_members
    WHERE chatroom_id = ${chatroomId} AND user_id = ${userId}
  `) as { role: ChatroomRole }[];

  if (!membership) {
    return { success: false, error: "User is not a member" };
  }

  // If demoting from manage to member, check if there are other managers
  if (membership.role === "manage" && role === "member") {
    const [{ count }] = (await sql`
      SELECT COUNT(*)::int as count
      FROM chatroom_members
      WHERE chatroom_id = ${chatroomId} AND role = 'manage'
    `) as [{ count: number }];

    if (count <= 1) {
      return { success: false, error: "Cannot demote the last manager" };
    }
  }

  await sql`
    UPDATE chatroom_members
    SET role = ${role}
    WHERE chatroom_id = ${chatroomId} AND user_id = ${userId}
  `;

  return { success: true };
};

/** Removes a member from a chatroom. Returns false if user is the last manager. */
const removeMember = async (params: {
  chatroomId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> => {
  const { chatroomId, userId } = params;

  // Check if user is a manager
  const [membership] = (await sql`
    SELECT role FROM chatroom_members
    WHERE chatroom_id = ${chatroomId} AND user_id = ${userId}
  `) as { role: ChatroomRole }[];

  if (!membership) {
    return { success: false, error: "User is not a member" };
  }

  // If user is a manager, check if there are other managers
  if (membership.role === "manage") {
    const [{ count }] = (await sql`
      SELECT COUNT(*)::int as count
      FROM chatroom_members
      WHERE chatroom_id = ${chatroomId} AND role = 'manage'
    `) as [{ count: number }];

    if (count <= 1) {
      return { success: false, error: "Cannot remove the last manager" };
    }
  }

  await sql`
    DELETE FROM chatroom_members
    WHERE chatroom_id = ${chatroomId} AND user_id = ${userId}
  `;

  return { success: true };
};

/** Joins a chatroom via join token. */
const joinByToken = async (params: {
  chatroomId: string;
  userId: string;
  joinToken: string;
}): Promise<{ success: boolean; error?: string }> => {
  const { chatroomId, userId, joinToken } = params;

  // Check token and that room is not townsquare
  const [chatroom] = (await sql`
    SELECT id, is_townsquare, join_token
    FROM chatrooms
    WHERE id = ${chatroomId} AND NOT deleted
  `) as { id: string; is_townsquare: boolean; join_token: string }[];

  if (!chatroom) {
    return { success: false, error: "Chatroom not found" };
  }

  if (chatroom.is_townsquare) {
    return { success: false, error: "Cannot join a townsquare room via token" };
  }

  if (chatroom.join_token !== joinToken) {
    return { success: false, error: "Invalid join token" };
  }

  // Add as member (ignore if already member)
  await sql`
    INSERT INTO chatroom_members (chatroom_id, user_id, role)
    VALUES (${chatroomId}, ${userId}, 'member')
    ON CONFLICT (chatroom_id, user_id) DO NOTHING
  `;

  return { success: true };
};

/** Resets the join token for a chatroom. */
const resetJoinToken = async (params: { chatroomId: string }): Promise<string> => {
  const [row] = (await sql`
    UPDATE chatrooms
    SET join_token = gen_random_uuid()
    WHERE id = ${params.chatroomId}
    RETURNING join_token
  `) as { join_token: string }[];

  return row!.join_token;
};

// ==========================
// User Preferences (Favorites & Unmute)
// ==========================

type AccessResult = { success: true } | { success: false; error: "not_found" | "no_access" };

/** Checks access and returns structured error. */
const checkAccess = async (params: { chatroomId: string; userId: string }): Promise<AccessResult> => {
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

/** Adds a chatroom to favorites. */
const setFavorite = async (params: {
  userId: string;
  chatroomId: string;
}): Promise<{ success: true } | { error: "not_found" | "no_access" }> => {
  const access = await checkAccess(params);
  if (!access.success) return { error: access.error };

  const { userId, chatroomId } = params;
  await sql`
    INSERT INTO favorite_chatrooms (user_id, chatroom_id) VALUES (${userId}, ${chatroomId})
    ON CONFLICT (user_id, chatroom_id) DO NOTHING
  `;
  return { success: true };
};

/** Removes a chatroom from favorites. */
const removeFavorite = async (params: {
  userId: string;
  chatroomId: string;
}): Promise<{ success: true } | { error: "not_found" | "no_access" }> => {
  const access = await checkAccess(params);
  if (!access.success) return { error: access.error };

  const { userId, chatroomId } = params;
  await sql`DELETE FROM favorite_chatrooms WHERE user_id = ${userId} AND chatroom_id = ${chatroomId}`;
  return { success: true };
};

/** Unmutes a chatroom (enables notifications). */
const unmute = async (params: {
  userId: string;
  chatroomId: string;
}): Promise<{ success: true } | { error: "not_found" | "no_access" }> => {
  const access = await checkAccess(params);
  if (!access.success) return { error: access.error };

  const { userId, chatroomId } = params;
  await sql`
    INSERT INTO unmuted_chatrooms (user_id, chatroom_id) VALUES (${userId}, ${chatroomId})
    ON CONFLICT (user_id, chatroom_id) DO NOTHING
  `;
  return { success: true };
};

/** Mutes a chatroom (disables notifications). */
const mute = async (params: {
  userId: string;
  chatroomId: string;
}): Promise<{ success: true } | { error: "not_found" | "no_access" }> => {
  const access = await checkAccess(params);
  if (!access.success) return { error: access.error };

  const { userId, chatroomId } = params;
  await sql`DELETE FROM unmuted_chatrooms WHERE user_id = ${userId} AND chatroom_id = ${chatroomId}`;
  return { success: true };
};

// ==========================
// Raw Data Access
// ==========================

/** Gets raw image data for image routes. */
const getImageData = async (params: { id: string }): Promise<{ image: string | null; name: string } | null> => {
  const [chatroom] = (await sql`
    SELECT image, name FROM chatrooms WHERE id = ${params.id} AND NOT deleted
  `) as { image: string | null; name: string }[];

  return chatroom ?? null;
};

// ==========================
// Service Export
// ==========================

export const chatroomService = {
  getAll,
  getById,
  canAccess,
  create,
  update,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
  joinByToken,
  resetJoinToken,
  setFavorite,
  removeFavorite,
  mute,
  unmute,
  getImageData,
};
