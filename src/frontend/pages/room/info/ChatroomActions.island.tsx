import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import { createStore } from "solid-js/store";
import { Show } from "solid-js";
import type { Chatroom } from "@/backend/services/chatrooms";

// ==========================
// Types
// ==========================

type ChatroomActionsProps = {
  chatroom: Chatroom;
  userId: string;
};

// ==========================
// Component
// ==========================

/** Action buttons for chatroom (favorite, pin, edit, delete). */
export default function ChatroomActions(props: ChatroomActionsProps) {
  const [chatroom, setChatroom] = createStore(props.chatroom);

  const setFavoriteMutation = createMutation({
    mutation: async () => {
      const isFavorited = chatroom.is_favorited;
      const res = isFavorited
        ? await api.chatrooms[":id"].favorite.$delete({
            param: { id: chatroom.id },
          })
        : await api.chatrooms[":id"].favorite.$put({
            param: { id: chatroom.id },
          });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to update");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: () => setChatroom("is_favorited", !chatroom.is_favorited),
  });

  const setMuteMutation = createMutation({
    mutation: async () => {
      const isUnmuted = chatroom.is_unmuted;
      const res = isUnmuted
        ? await api.chatrooms[":id"].mute.$put({ param: { id: chatroom.id } })
        : await api.chatrooms[":id"].mute.$delete({
            param: { id: chatroom.id },
          });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to update");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: () => setChatroom("is_unmuted", !chatroom.is_unmuted),
  });

  const leaveChatroomMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Are you sure you want to leave '${chatroom.name}'?`,
        {
          title: "Leave Chatroom",
          icon: "ti ti-logout-2",
          variant: "danger",
          confirmText: "Leave",
          cancelText: "Cancel",
        },
      );
      if (!confirmed) return null;

      const res = await api.chatrooms[":id"].members[":userId"].$delete({
        param: { id: chatroom.id, userId: props.userId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to leave");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: (data) => {
      if (data) window.location.href = "/";
    },
  });

  const btnClass =
    "leading-none transition-all disabled:opacity-50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200";
  const iconClass = "text-lg md:text-3xl leading-none";

  return (
    <div class="flex items-center gap-5 sm:gap-8 paper p-3 sm:py-4 sm:px-5">
      <a
        href={`/room/${chatroom.id}`}
        class={btnClass}
        aria-label="Back to Chat"
      >
        <i class={`ti ti-message ${iconClass}`} />
      </a>

      <button
        type="button"
        onClick={() => setFavoriteMutation.mutate({})}
        disabled={setFavoriteMutation.loading()}
        class={
          chatroom.is_favorited
            ? "leading-none transition-all disabled:opacity-50 bg-linear-to-br from-pink-500 to-red-500 bg-clip-text text-transparent"
            : btnClass
        }
        aria-label={chatroom.is_favorited ? "Unlike" : "Like"}
      >
        <i
          class={`${setFavoriteMutation.loading() ? "ti ti-loader-2 animate-spin" : "ti ti-heart"} ${iconClass}`}
        />
      </button>

      <button
        type="button"
        onClick={() => setMuteMutation.mutate({})}
        disabled={setMuteMutation.loading()}
        class={
          chatroom.is_unmuted
            ? "leading-none transition-all disabled:opacity-50 bg-linear-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent"
            : btnClass
        }
        aria-label={chatroom.is_unmuted ? "Mute" : "Unmute"}
      >
        <i
          class={`${setMuteMutation.loading() ? "ti ti-loader-2 animate-spin" : chatroom.is_unmuted ? "ti ti-bell-ringing" : "ti ti-bell-off"} ${iconClass}`}
        />
      </button>

      <Show when={!chatroom.is_townsquare}>
        <button
          type="button"
          onClick={() => leaveChatroomMutation.mutate({})}
          disabled={leaveChatroomMutation.loading()}
          class="leading-none transition-all disabled:opacity-50 text-red-500 hover:text-red-600"
          aria-label="Leave"
        >
          <i
            class={`${leaveChatroomMutation.loading() ? "ti ti-loader-2 animate-spin" : "ti ti-logout-2"} ${iconClass}`}
          />
        </button>
      </Show>
    </div>
  );
}
