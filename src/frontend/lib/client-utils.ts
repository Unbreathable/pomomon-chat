import { hc } from "hono/client";
import type { ApiType } from "@/backend";

// ==========================
// API Client
// ==========================

/** Type-safe API client for backend requests. */
export const api = hc<ApiType>("/api");

// ==========================
// Clipboard
// ==========================

/**
 * Copies text to the clipboard.
 * Fails silently with console error if clipboard API is unavailable.
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

/**
 * Checks if a value is an image URL served by the API.
 * Used to determine if an image field contains an existing server URL or new base64 data.
 * Matches URLs like /api/users/:id/avatar or /api/chatrooms/:id/image (with optional ?fallback).
 */
export const isImageUrl = (value: string | null | undefined): boolean =>
  typeof value === "string" && (value.includes("/avatar") || value.includes("/image"));

/**
 * Regex pattern matching emoji characters.
 * Covers most common emoji ranges including emoticons, symbols, flags, and modifiers.
 */
const EMOJI_PATTERN =
  /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/gu;

/**
 * Analyzes text to determine if it contains only emojis.
 * Returns the emoji size class or null if text contains non-emoji characters.
 * - 1 emoji: "text-7xl" (extra large)
 * - 2 emojis: "text-5xl" (very large)
 * - 3-5 emojis: "text-3xl" (medium)
 * - 6+ emojis: null (normal text rendering)
 */
export const getEmojiOnlySize = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Remove all emojis and check if anything remains
  const withoutEmojis = trimmed.replace(EMOJI_PATTERN, "").replace(/\s/g, "");
  if (withoutEmojis.length > 0) return null;

  // Count emojis using the pattern
  const emojis = trimmed.match(EMOJI_PATTERN);
  if (!emojis) return null;

  const count = emojis.length;
  if (count === 1) return "text-7xl";
  if (count === 2) return "text-5xl";
  if (count <= 5) return "text-3xl";
  return null;
};

// ==========================
// Desktop Notifications
// ==========================

/** Requests notification permission from the user. */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

type DesktopNotificationOptions = {
  body: string;
  title: string;
  icon: string;
  /** Large image to display in notification. */
  image?: string;
  /** Used as tag to deduplicate notifications. */
  id?: string;
  /** URL to navigate to on click. */
  href: string;
};

/** Shows a desktop notification that auto-closes after 5 seconds. */
export const showDesktopNotification = ({ body, title, icon, image, id, href }: DesktopNotificationOptions): void => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Note: 'image' is supported in Chrome/Edge but not in all browsers
  const notification = new Notification(title, {
    body,
    icon,
    image,
    tag: id ?? crypto.randomUUID(),
  } as NotificationOptions);

  setTimeout(() => notification.close(), 5000);

  notification.onclick = () => {
    window.focus();
    notification.close();
    window.location.href = href;
  };
};
