import { z } from "zod";

// ==========================
// Path Parameter Schemas
// ==========================

/** Common path parameter for chatroom ID */
export const ChatroomIdParamSchema = z.object({
  id: z.uuid().describe("Chatroom ID"),
});

/** Common path parameter for user ID */
export const UserIdParamSchema = z.object({
  id: z.uuid().describe("User ID"),
});

/** Common path parameter for message ID */
export const MessageIdParamSchema = z.object({
  id: z.uuid().describe("Message ID"),
});

/** Path parameters for chatroom member operations */
export const ChatroomMemberParamSchema = z.object({
  id: z.uuid().describe("Chatroom ID"),
  userId: z.uuid().describe("User ID of the member"),
});

/** Path parameter for invite token */
export const InviteTokenParamSchema = z.object({
  token: z.string().describe("Invite token (UUID)"),
});

/** Query parameter for search */
export const SearchQueryParamSchema = z.object({
  search: z.string().min(2).max(20).describe("Search query (2-20 characters)"),
});

// ==========================
// Common Schemas
// ==========================

// WebP base64 data URL validation
const WebpBase64Schema = z
  .string()
  .max(200000)
  .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, "Must be a WebP base64 data URL")
  .describe("WebP image as base64 data URL");

// Chatroom role enum (matches PostgreSQL ENUM order: member < manage)
export const ChatroomRoleSchema = z
  .enum(["member", "manage"])
  .describe("User's role in the chatroom: 'member' (read/write) or 'manage' (can edit room, manage members)");

// ==========================
// User Schemas
// ==========================

export const UserSchema = z.object({
  id: z.uuid().describe("Unique user identifier"),
  username: z.string().describe("Unique username (3-20 chars, alphanumeric + underscore)"),
  bio: z.string().nullable().describe("User bio/description"),
  avatar: z
    .string()
    .describe("URL to user avatar image. Contains '?fallback' query param if using generated fallback image"),
  role: z.enum(["user", "admin"]).describe("System role: 'user' or 'admin'"),
  is_bot: z.boolean().describe("Whether this user is a bot account"),
  created_at: z.string().describe("ISO 8601 timestamp of account creation"),
  real_name: z.string().nullable().describe("User's real name (only visible to admins)"),
});

export const UpdateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional()
    .describe("New username"),
  bio: z.string().max(500).nullable().optional().describe("New bio"),
  avatar: WebpBase64Schema.nullable().optional().describe("New avatar as WebP base64 (set to null to remove)"),
});

export const UpdateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]).describe("New system role"),
});

// ==========================
// Auth Schemas
// ==========================

export const RegisterSchema = z.object({
  invite_token: z.uuid().describe("Invite token received from admin"),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .describe("Desired username"),
  password: z.string().max(128).describe("Password (min 8 chars, must contain uppercase, lowercase, number)"),
  passwordConfirm: z.string().max(128).describe("Password confirmation (must match password)"),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, { message: "Please accept the terms and conditions" })
    .describe("Must be true to accept Terms of Service"),
});

export const LoginSchema = z.object({
  username: z.string().describe("Username"),
  password: z.string().describe("Password"),
});

export const ResetPasswordSchema = z.object({
  reset_token: z.string().describe("Password reset token from admin"),
  password: z.string().max(128).describe("New password"),
  passwordConfirm: z.string().max(128).describe("New password confirmation"),
});

export const ChangePasswordSchema = z.object({
  password: z.string().max(128).describe("New password"),
  passwordConfirm: z.string().max(128).describe("New password confirmation"),
});

export const AuthResponseSchema = z.object({
  session_token: z.string().describe("Session token for authentication (also set as cookie)"),
  user: UserSchema.describe("Authenticated user data"),
});

export const ErrorResponseSchema = z.object({
  message: z.string().describe("Error message"),
});

export const MessageResponseSchema = z.object({
  message: z.string().describe("Success/info message"),
});

// ==========================
// Admin Schemas
// ==========================

export const CreateInviteSchema = z.object({
  real_name: z.string().min(1).max(100).describe("Real name of the person being invited"),
});

export const InviteResponseSchema = z.object({
  invite_url: z.string().describe("Full URL to share with the invited user"),
  token: z.string().describe("Raw invite token (UUID)"),
  expires_at: z.string().describe("ISO 8601 expiration timestamp"),
});

export const ResetPasswordTokenResponseSchema = z.object({
  reset_url: z.string().describe("Full URL for password reset"),
  token: z.string().describe("Raw reset token"),
  expires_at: z.string().describe("ISO 8601 expiration timestamp"),
});

// ==========================
// Chatroom Schemas
// ==========================

export const CreateChatroomSchema = z.object({
  name: z.string().min(1).max(50).describe("Chatroom name"),
  description: z.string().max(200).optional().describe("Optional description"),
  unlisted: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, room won't appear in public list (only accessible if user knows the chatroom ID)"),
  is_townsquare: z
    .boolean()
    .optional()
    .default(true)
    .describe("If true, all users can see and join. If false, invite-only."),
  bots_allowed: z
    .boolean()
    .optional()
    .default(true)
    .describe("If true, bots can be added to this chatroom. Cannot be changed after creation."),
});

export const UpdateChatroomSchema = z.object({
  name: z.string().min(1).max(50).optional().describe("New name"),
  description: z.string().max(200).nullable().optional().describe("New description (null to clear)"),
  image: WebpBase64Schema.nullable().optional().describe("New image as WebP base64 (null to reset to default)"),
  pinned: z.boolean().optional().describe("Pin to top for all users (admin only)"),
});

export const ChatroomSchema = z.object({
  id: z.uuid().describe("Unique chatroom identifier"),
  name: z.string().describe("Chatroom name"),
  description: z.string().nullable().describe("Chatroom description"),
  image: z
    .string()
    .describe("URL to chatroom image. Contains '?fallback' query param if using generated fallback image"),
  unlisted: z.boolean().describe("Hidden from public list, only accessible if user knows the chatroom ID"),
  pinned: z.boolean().describe("Pinned to top for all users"),
  deleted: z.boolean().describe("Whether this chatroom is soft-deleted (deleted chatrooms are only visible to admins)"),
  is_townsquare: z.boolean().describe("Public room accessible to all users"),
  bots_allowed: z.boolean().describe("Whether bots can be added to this chatroom (set at creation, immutable)"),
  created_at: z.string().describe("ISO 8601 creation timestamp"),
  last_activity: z.string().nullable().describe("ISO 8601 timestamp of last message"),
  is_favorited: z.boolean().optional().describe("Whether current user has favorited this room"),
  is_unmuted: z.boolean().optional().describe("Whether current user has notifications enabled"),
  user_role: ChatroomRoleSchema.nullable()
    .optional()
    .describe("Current user's role in this room (null if not a member)"),
  can_manage: z.boolean().optional().describe("Whether current user can edit room and manage members"),
  join_token: z
    .string()
    .nullable()
    .optional()
    .describe("Token for invite links (only visible to users with 'manage' role)"),
});

// ==========================
// Chatroom Member Schemas
// ==========================

export const ChatroomMemberSchema = UserSchema.extend({
  chatroom_role: ChatroomRoleSchema.describe("Member's role in this chatroom"),
});

export const AddMemberSchema = z.object({
  user_id: z.uuid().describe("User ID to add as member"),
  role: ChatroomRoleSchema.optional().default("member").describe("Role to assign (default: 'member')"),
});

export const JoinByTokenSchema = z.object({
  join_token: z.uuid().describe("Join token from invite link"),
});

// ==========================
// Message Schemas
// ==========================

export const MessageTypeSchema = z
  .enum(["text", "image", "info", "gif"])
  .describe("Message content type: text, image (WebP), info (system message), or gif");

/** Edit history entry for a message */
export const MessageEditSchema = z.object({
  old_content: z.string().describe("Previous content before this edit"),
  edited_at: z.string().describe("ISO 8601 timestamp of the edit"),
});

export const MessageDataSchema = z.object({
  id: z.uuid().describe("Unique message identifier"),
  chatroom_id: z.uuid().describe("Chatroom this message belongs to"),
  chatroom_name: z.string().describe("Name of the chatroom"),
  created_by: z.uuid().nullable().describe("User ID of sender (null for system messages)"),
  created_by_username: z.string().nullable().describe("Username of sender"),
  created_by_bio: z.string().nullable().describe("Bio of sender at time of message"),
  content_type: MessageTypeSchema,
  content: z.string().describe("Message content (text, image URL, or gif URL depending on type)"),
  content_meta: z.string().nullable().describe("Optional metadata (e.g., alt text for images)"),
  created_at: z.string().describe("ISO 8601 timestamp"),
  deleted: z.boolean().describe("Whether this message is soft-deleted"),
  history: z.array(MessageEditSchema).describe("Edit history (empty array if never edited)"),
});

/** Request body for updating a message */
export const UpdateMessageSchema = z.object({
  content: z.string().min(1).max(10_000).describe("New message content"),
});

// ==========================
// Pagination Schema
// ==========================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1).describe("Page number (1-indexed)"),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20).describe("Items per page (max 100)"),
});

const TrueOnlySchema = z.coerce
  .boolean()
  .refine((val) => val === true, { message: "Only 'true' is allowed for this filter" });

export const ChatroomQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().describe("Search in chatroom names"),
  favorited: TrueOnlySchema.optional().describe("Filter to only favorited rooms"),
  unmuted: TrueOnlySchema.optional().describe("Filter to only unmuted rooms"),
  unlisted: TrueOnlySchema.optional().describe("Include unlisted rooms (requires membership)"),
  deleted: TrueOnlySchema.optional().describe("Include deleted rooms (admin only)"),
});

/** Query parameters for message search */
export const MessageSearchQuerySchema = PaginationQuerySchema.extend({
  chatroom_id: z.uuid().describe("Chatroom ID to search in"),
  search: z.string().optional().describe("Full-text search query"),
  content_type: MessageTypeSchema.optional().describe("Filter by message type"),
  deleted: TrueOnlySchema.optional().describe("Include deleted messages (admin only)"),
});

export const PaginationResponseSchema = z.object({
  page: z.number().describe("Current page number"),
  per_page: z.number().describe("Items per page"),
  total: z.number().describe("Total number of items (-1 if unknown, e.g. for external APIs like GIFs)"),
  total_pages: z.number().describe("Total number of pages (-1 if total is unknown)"),
  has_next: z.boolean().describe("Whether there are more pages (always reliable, use this for pagination)"),
});

// ==========================
// WebSocket Schemas
// ==========================

export const WsQuerySchema = z.object({
  session_token: z.string().describe("Session token (format: userId:tokenPart)"),
  room_id: z.uuid().optional().describe("Chatroom to join (if not provided, receives notifications only)"),
});

export const WsServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message").describe("New message event"),
    data: MessageDataSchema,
  }),
  z.object({
    type: z.literal("error").describe("Error event"),
    message: z.string(),
  }),
]);

// Text: max 10KB, Image: max 500KB base64 (~375KB actual image)
const WsTextMessageSchema = z.object({
  content_type: z.literal("text").default("text"),
  content: z.string().min(1).max(10_000).describe("Text message content"),
  content_meta: z.string().max(200).optional().describe("Optional metadata"),
});

const WsImageMessageSchema = z.object({
  content_type: z.literal("image"),
  content: z
    .string()
    .max(500_000, "Image too large (max 500KB)")
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, "Must be a WebP base64 data URL")
    .describe("WebP image as base64 data URL"),
  content_meta: z.string().max(200).optional().describe("Optional alt text"),
});

const WsGifMessageSchema = z.object({
  content_type: z.literal("gif"),
  content: z
    .url()
    .refine((url) => url.startsWith("https://static.klipy.com/"), { message: "Must be a Klipy CDN URL" })
    .describe("Klipy GIF URL"),
  content_meta: z.string().max(200).optional().describe("Optional metadata"),
});

export const WsClientMessageSchema = z.discriminatedUnion("content_type", [
  WsTextMessageSchema,
  WsImageMessageSchema,
  WsGifMessageSchema,
]);

// Bot message creation (REST API) - same content validation as WebSocket
export const CreateMessageSchema = z.object({
  chatroom_id: z.string().uuid().describe("Target chatroom ID"),
  content_type: z.enum(["text", "image", "gif"]).default("text").describe("Message type"),
  content: z.string().min(1).describe("Message content"),
  content_meta: z.string().max(200).optional().describe("Optional metadata"),
});

// ==========================
// Response Schemas
// ==========================

export const UsersListResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: PaginationResponseSchema,
});

export const ChatroomsListResponseSchema = z.object({
  chatrooms: z.array(ChatroomSchema),
  pagination: PaginationResponseSchema,
});

export const MessagesListResponseSchema = z.object({
  messages: z.array(MessageDataSchema),
  pagination: PaginationResponseSchema,
});

export const ChatroomMembersListResponseSchema = z.object({
  members: z.array(ChatroomMemberSchema),
  pagination: PaginationResponseSchema,
});

// ==========================
// Bot Schemas
// ==========================

/** Bot account with owner information */
export const BotSchema = UserSchema.extend({
  bot_owner_id: z.uuid().describe("User ID of the bot's owner"),
  bot_owner_username: z.string().describe("Username of the bot's owner"),
  token_prefix: z.string().nullable().describe("First 8 characters of the bot token (for identification)"),
  token_last_used_at: z.string().nullable().describe("ISO 8601 timestamp of last token usage"),
});

/** Request body for creating a new bot */
export const CreateBotSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .describe("Bot username (must be unique)"),
  bio: z.string().max(500).optional().describe("Bot description"),
});

/** Request body for updating a bot */
export const UpdateBotSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional()
    .describe("New bot username"),
  bio: z.string().max(500).nullable().optional().describe("New bot description"),
  avatar: z
    .string()
    .max(200000)
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, "Must be a WebP base64 data URL")
    .nullable()
    .optional()
    .describe("New avatar as WebP base64 (null to remove)"),
});

/** Response when creating a bot (includes the full token, shown only once) */
export const CreateBotResponseSchema = z.object({
  bot: BotSchema,
  token: z.string().describe("Bot API token (shown only once, store securely)"),
});

/** Response for bot list */
export const BotsListResponseSchema = z.object({
  bots: z.array(BotSchema),
  pagination: PaginationResponseSchema,
});

/** Path parameter for bot ID */
export const BotIdParamSchema = z.object({
  id: z.uuid().describe("Bot ID"),
});

// ==========================
// Type Exports
// ==========================

export type User = z.infer<typeof UserSchema>;

export type Register = z.infer<typeof RegisterSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type CreateInvite = z.infer<typeof CreateInviteSchema>;
export type CreateChatroom = z.infer<typeof CreateChatroomSchema>;

export type Chatroom = z.infer<typeof ChatroomSchema>;
export type ChatroomRole = z.infer<typeof ChatroomRoleSchema>;
export type ChatroomMember = z.infer<typeof ChatroomMemberSchema>;

export type MessageType = z.infer<typeof MessageTypeSchema>;
export type Message = z.infer<typeof MessageDataSchema>;
export type MessageEdit = z.infer<typeof MessageEditSchema>;

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;
export type WsServerMessage = z.infer<typeof WsServerMessageSchema>;

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;

export type InviteResponse = z.infer<typeof InviteResponseSchema>;
export type ResetPasswordTokenResponse = z.infer<typeof ResetPasswordTokenResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;
export type ChatroomsListResponse = z.infer<typeof ChatroomsListResponseSchema>;
export type MessagesListResponse = z.infer<typeof MessagesListResponseSchema>;
export type ChatroomMembersListResponse = z.infer<typeof ChatroomMembersListResponseSchema>;

export type Bot = z.infer<typeof BotSchema>;
export type CreateBot = z.infer<typeof CreateBotSchema>;
export type UpdateBot = z.infer<typeof UpdateBotSchema>;
export type CreateBotResponse = z.infer<typeof CreateBotResponseSchema>;
export type BotsListResponse = z.infer<typeof BotsListResponseSchema>;
