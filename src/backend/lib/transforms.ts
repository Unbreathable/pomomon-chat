/**
 * Shared transformation helpers for services.
 * These are pure functions used across multiple services.
 */

/** Converts a Date or string to ISO string format */
export const toISOString = (date: Date | string): string =>
  date instanceof Date ? date.toISOString() : date;

/** Converts a nullable Date or string to ISO string format */
export const toISOStringNullable = (date: Date | string | null): string | null =>
  date instanceof Date ? date.toISOString() : date;

/** Builds user avatar URL with fallback indicator */
export const toAvatarUrl = (id: string, hasAvatar: boolean): string =>
  `/api/users/${id}/avatar${hasAvatar ? "" : "?fallback"}`;

/** Builds chatroom image URL with fallback indicator */
export const toChatroomImageUrl = (id: string, hasImage: boolean): string =>
  `/api/chatrooms/${id}/image${hasImage ? "" : "?fallback"}`;

/** Builds message image URL */
export const toMessageImageUrl = (id: string): string =>
  `/api/messages/${id}/image`;
