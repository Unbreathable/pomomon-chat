import { createSignal, For, Show } from "solid-js";
import { api } from "@/frontend/lib/client-utils";
import { createWs } from "@/frontend/lib/websocket";
import {
  type MessageGroup,
  addMessageToGroups,
  groupMessages,
  prependMessageGroups,
} from "./util";
import { createMutation } from "@/frontend/lib/mutation";
import type { WsClientMessage, WsServerMessage } from "@/shared/schemas";
import ChatInput from "./ChatInput";
import { MessageGroupView } from "./MessageGroupView";

// ==========================
// Types
// ==========================

type ChatWindowProps = {
  chatroomId: string;
  roomName: string;
  sessionToken: string;
  userId: string;
  groups: MessageGroup[];
  hasMore: boolean;
  gifsDisabled?: boolean;
};

// ==========================
// Sub-components
// ==========================

/** Displays system info messages (e.g., "User joined"). */
const SystemMessage = (props: { content: string }) => (
  <div class="flex justify-center">
    <p class="text-xs text-zinc-400 dark:text-zinc-600">{props.content}</p>
  </div>
);

// ==========================
// Main Component
// ==========================

/** Real-time chat window with WebSocket connection and message history. */
export default function ChatWindow(props: ChatWindowProps) {
  const [messageGroups, setMessageGroups] = createSignal<MessageGroup[]>(
    props.groups,
  );
  const [hasMoreMessages, setHasMoreMessages] = createSignal(props.hasMore);
  const [showScrollDown, setShowScrollDown] = createSignal(false);
  const [unreadCount, setUnreadCount] = createSignal(0);
  let messagesRef: HTMLDivElement | undefined;

  const ws = createWs<WsServerMessage, WsClientMessage>({
    uri: `/api/ws?session_token=${props.sessionToken}&room_id=${props.chatroomId}`,
    autoReconnect: true,
    onMessage: (msg) => {
      if (msg.type === "message") {
        setMessageGroups((prev) =>
          addMessageToGroups(prev, msg.data, props.userId),
        );
        if (showScrollDown()) setUnreadCount((prev) => prev + 1);
      } else {
        console.error("Error sending messages:", msg.message);
      }
    },
  });

  const loadMoreMutation = createMutation({
    mutation: async () => {
      // Groups are chronological: [oldest_group, ..., newest_group]
      // Each group's messages are also chronological: [oldest_msg, ..., newest_msg]
      const oldestMsg = messageGroups().at(0)?.messages.at(0);
      if (!oldestMsg) return null;

      const res = await api.chatrooms[":id"].messages.$get({
        param: { id: props.chatroomId },
        query: { per_page: "50", before: oldestMsg.id },
      });

      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    onSuccess: (data) => {
      if (!data?.messages.length) return;
      const olderGroups = groupMessages(
        [...data.messages].reverse(),
        props.userId,
      );
      setMessageGroups((prev) => prependMessageGroups(olderGroups, prev));
      if (data.messages.length < 50) {
        setHasMoreMessages(false);
      }
    },
  });

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollTop > -100;
    setShowScrollDown(!isNearBottom);
    if (isNearBottom) setUnreadCount(0);

    const nearTop =
      target.scrollHeight + target.scrollTop - target.clientHeight < 100;
    if (nearTop && hasMoreMessages() && !loadMoreMutation.loading()) {
      loadMoreMutation.mutate({});
    }
  };

  const scrollToBottom = () => {
    messagesRef?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSend = (msg: WsClientMessage) => {
    ws.send(msg);
    // Scroll to bottom after sending
    messagesRef?.scrollTo({ top: 0 });
  };

  return (
    <div class="relative h-full overflow-hidden">
      {/* Messages */}
      <div
        ref={messagesRef}
        onScroll={handleScroll}
        class="absolute inset-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 flex flex-col-reverse gap-4 scrollbar"
        style="padding-top: 4.5rem; padding-bottom: 5rem;"
      >
        <For each={messageGroups().toReversed()}>
          {(group) =>
            group.messages[0]?.content_type === "info" ? (
              <SystemMessage content={group.messages[0].content} />
            ) : (
              <MessageGroupView
                group={group}
                gifsDisabled={props.gifsDisabled}
              />
            )
          }
        </For>

        <Show when={hasMoreMessages()}>
          <div class="flex justify-center py-2">
            <Show
              when={loadMoreMutation.loading()}
              fallback={
                <button
                  type="button"
                  onClick={() => loadMoreMutation.mutate({})}
                  class="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  Load older messages
                </button>
              }
            >
              <span class="text-xs text-zinc-400">Loading...</span>
            </Show>
          </div>
        </Show>
      </div>

      {/* Header */}
      <div class="absolute top-0 left-0 right-0 px-2 pt-2 z-10 flex justify-center gap-2">
        <a
          href="/"
          class="flex items-center justify-center aspect-square paper px-2"
        >
          <i class="ti ti-bubble text-3xl bg-linear-to-br from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent" />
        </a>

        <a
          href={`/room/${props.chatroomId}/info`}
          class="paper px-3 py-2 pointer-events-auto flex items-center gap-2 overflow-hidden"
          style={`view-transition-name: chat-${props.chatroomId}`}
        >
          <img
            src={`/api/chatrooms/${props.chatroomId}/image`}
            alt={props.roomName}
            class="w-7 h-7 rounded-lg shrink-0"
          />
          <h1 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {props.roomName}
          </h1>
        </a>
      </div>

      {/* Scroll Down Button */}
      <Show when={showScrollDown()}>
        <button
          type="button"
          onClick={scrollToBottom}
          class={`absolute bottom-20 left-1/2 -translate-x-1/2 z-10 paper px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
            unreadCount() > 0
              ? "text-blue-500 animate-pulse"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <i class="ti ti-arrow-down" />
          <span>Scroll down</span>
        </button>
      </Show>

      {/* Input */}
      <div class="absolute bottom-0 left-0 right-0 px-2 pb-2 z-10">
        <ChatInput
          onSend={handleSend}
          disabled={ws.status() !== "connected"}
          gifsDisabled={props.gifsDisabled}
        />
      </div>

      {/* Connection Status */}
      <Show when={ws.status() !== "connected"}>
        <div class="absolute top-16 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs shadow-xl z-20">
          <Show when={ws.status() === "connecting"}>Connecting...</Show>
          <Show when={ws.status() === "disconnected"}>
            Disconnected. Reconnecting...
          </Show>
          <Show when={ws.status() === "error"}>Connection error</Show>
        </div>
      </Show>
    </div>
  );
}
