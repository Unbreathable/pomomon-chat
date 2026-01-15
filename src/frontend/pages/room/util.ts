import type { Message } from "@/backend/services/messages";
import dayjs from "dayjs";

// ==========================
// Constants
// ==========================

const GROUP_TIME_THRESHOLD_MINUTES = 5;
const SYSTEM_MESSAGE_TYPE = "info" as const;

/** Placeholder ID for messages from deleted users. */
export const DELETED_USER_ID = "__deleted__";

/** Display name for deleted users. */
export const DELETED_USER_NAME = "Deleted User";

// ==========================
// Types
// ==========================

/** A chunk groups consecutive messages of the same type for rendering. */
export type MessageChunk =
  | { readonly type: "images"; readonly messages: readonly Message[] }
  | { readonly type: "text"; readonly message: Message }
  | { readonly type: "gif"; readonly message: Message };

/** A group of messages from the same user within a time threshold. */
export type MessageGroup = {
  readonly userId: string;
  readonly username: string;
  readonly bio: string | null;
  readonly isOwn: boolean;
  readonly messages: readonly Message[];
  readonly chunks: readonly MessageChunk[];
};

// ==========================
// Pure Helper Functions
// ==========================

const isSystemMessage = (msg: Message): boolean => msg.content_type === SYSTEM_MESSAGE_TYPE;

const getMinutesDiff = (a: string | Date, b: string | Date): number => Math.abs(dayjs(a).diff(dayjs(b), "minute"));

const isWithinThreshold = (msgA: Message, msgB: Message): boolean =>
  getMinutesDiff(msgA.created_at, msgB.created_at) < GROUP_TIME_THRESHOLD_MINUTES;

const lastItem = <T>(arr: readonly T[]): T | undefined => arr[arr.length - 1];

const firstItem = <T>(arr: readonly T[]): T | undefined => arr[0];

const isImageMessage = (msg: Message): boolean => msg.content_type === "image";

const isGifMessage = (msg: Message): boolean => msg.content_type === "gif";

// ==========================
// Chunk Operations
// ==========================

/**
 * Groups consecutive messages into chunks by content type.
 * Images are grouped together, text and GIFs remain individual.
 */
const chunkMessages = (messages: readonly Message[]): readonly MessageChunk[] => {
  const chunks: MessageChunk[] = [];

  for (const msg of messages) {
    if (isImageMessage(msg)) {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk?.type === "images") {
        chunks[chunks.length - 1] = {
          type: "images",
          messages: [...lastChunk.messages, msg],
        };
      } else {
        chunks.push({ type: "images", messages: [msg] });
      }
    } else if (isGifMessage(msg)) {
      chunks.push({ type: "gif", message: msg });
    } else {
      chunks.push({ type: "text", message: msg });
    }
  }

  return chunks;
};

// ==========================
// Group Operations
// ==========================

/** Creates a new message group from a single message. */
const createGroup = (msg: Message, isOwn: boolean): MessageGroup => ({
  userId: msg.created_by ?? DELETED_USER_ID,
  username: msg.created_by_username ?? DELETED_USER_NAME,
  bio: msg.created_by_bio,
  isOwn,
  messages: [msg],
  chunks: chunkMessages([msg]),
});

/** Appends a message to an existing group. */
const appendToGroup = (group: MessageGroup, msg: Message): MessageGroup => {
  const newMessages = [...group.messages, msg];
  return {
    ...group,
    messages: newMessages,
    chunks: chunkMessages(newMessages),
  };
};

/** Merges two groups into one. */
const mergeGroups = (a: MessageGroup, b: MessageGroup): MessageGroup => {
  const newMessages = [...a.messages, ...b.messages];
  return {
    ...a,
    messages: newMessages,
    chunks: chunkMessages(newMessages),
  };
};

/** Checks if a message can be added to an existing group (same user, within time threshold). */
export const canAddToGroup = (group: MessageGroup, msg: Message): boolean => {
  const last = lastItem(group.messages);
  return last !== undefined && group.userId === msg.created_by && isWithinThreshold(last, msg);
};

/** Checks if two groups can be merged (same user, adjacent messages within threshold). */
const canMergeGroups = (a: MessageGroup, b: MessageGroup): boolean => {
  const lastA = lastItem(a.messages);
  const firstB = firstItem(b.messages);
  return (
    lastA !== undefined &&
    firstB !== undefined &&
    !isSystemMessage(lastA) &&
    !isSystemMessage(firstB) &&
    a.userId === b.userId &&
    isWithinThreshold(lastA, firstB)
  );
};

// ==========================
// Main Grouping Functions
// ==========================

/**
 * Adds a new message to the groups array.
 * Either appends to the last group or creates a new one.
 */
export const addMessageToGroups = (
  groups: readonly MessageGroup[],
  msg: Message,
  currentUserId: string,
): MessageGroup[] => {
  const isOwn = msg.created_by === currentUserId;

  if (isSystemMessage(msg)) {
    return [...groups, createGroup(msg, false)];
  }

  const last = lastItem(groups);

  if (last && !isSystemMessage(firstItem(last.messages)!) && canAddToGroup(last, msg)) {
    return [...groups.slice(0, -1), appendToGroup(last, msg)];
  }

  return [...groups, createGroup(msg, isOwn)];
};

/**
 * Groups an array of messages into MessageGroups.
 * Messages are grouped by user and time proximity.
 */
export const groupMessages = (messages: readonly Message[], currentUserId: string): MessageGroup[] =>
  messages.reduce<MessageGroup[]>((groups, msg) => addMessageToGroups(groups, msg, currentUserId), []);

/**
 * Prepends older message groups to existing ones.
 * Merges adjacent groups if they belong to the same user.
 */
export const prependMessageGroups = (
  older: readonly MessageGroup[],
  existing: readonly MessageGroup[],
): MessageGroup[] => {
  if (older.length === 0) return [...existing];
  if (existing.length === 0) return [...older];

  const lastOlder = lastItem(older)!;
  const firstExisting = firstItem(existing)!;

  return canMergeGroups(lastOlder, firstExisting)
    ? [...older.slice(0, -1), mergeGroups(lastOlder, firstExisting), ...existing.slice(1)]
    : [...older, ...existing];
};

// ==========================
// Time Formatting
// ==========================

const MINUTE = 1;
const HOUR = 60;
const DAY = HOUR * 24;

/**
 * Formats a date as relative time (e.g., "now", "5m ago", "2h ago", "3d ago").
 */
export const formatRelativeTime = (date: string | Date): string => {
  const minutes = dayjs().diff(dayjs(date), "minute");

  if (minutes < MINUTE) return "now";
  if (minutes < HOUR) return `${minutes}m ago`;
  if (minutes < DAY) return `${Math.floor(minutes / HOUR)}h ago`;
  return `${Math.floor(minutes / DAY)}d ago`;
};

// ==========================
// Message Update Operations
// ==========================

/**
 * Updates a message within the groups array.
 * Returns a new array with the updated message.
 */
export const updateMessageInGroups = (groups: readonly MessageGroup[], updatedMsg: Message): MessageGroup[] => {
  return groups.map((group) => {
    const messageIndex = group.messages.findIndex((m) => m.id === updatedMsg.id);
    if (messageIndex === -1) return group;

    const newMessages = [...group.messages];
    newMessages[messageIndex] = updatedMsg;

    return {
      ...group,
      messages: newMessages,
      chunks: chunkMessages(newMessages),
    };
  });
};

/**
 * Removes a message from the groups array.
 * If the group becomes empty, it is removed entirely.
 */
export const removeMessageFromGroups = (groups: readonly MessageGroup[], messageId: string): MessageGroup[] => {
  return groups
    .map((group) => {
      const newMessages = group.messages.filter((m) => m.id !== messageId);
      if (newMessages.length === group.messages.length) return group;
      if (newMessages.length === 0) return null;

      return {
        ...group,
        messages: newMessages,
        chunks: chunkMessages(newMessages),
      };
    })
    .filter((group): group is MessageGroup => group !== null);
};
