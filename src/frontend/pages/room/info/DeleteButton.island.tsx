import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import type { Chatroom } from "@/backend/services/chatrooms";

type DeleteButtonProps = {
  chatroom: Chatroom;
};

/** Delete chatroom button styled as a tab. */
export default function DeleteButton(props: DeleteButtonProps) {
  const deleteMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Are you sure you want to delete '${props.chatroom.name}'?`,
        {
          title: "Delete Chatroom",
          icon: "ti ti-trash",
          variant: "danger",
          confirmText: "Delete",
          cancelText: "Cancel",
        },
      );
      if (!confirmed) return null;

      const res = await api.chatrooms[":id"].$delete({
        param: { id: props.chatroom.id },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to delete");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: (data) => {
      if (data) window.location.href = "/";
    },
  });

  return (
    <button
      type="button"
      onClick={() => deleteMutation.mutate({})}
      disabled={deleteMutation.loading()}
      class="paper rounded-full px-4 py-2 text-sm sm:text-md font-semibold flex items-center gap-2 text-red-500 hover:text-red-600 disabled:opacity-50"
    >
      <i
        class={
          deleteMutation.loading()
            ? "ti ti-loader-2 animate-spin"
            : "ti ti-trash"
        }
      />
      <span class="hidden sm:inline">Delete</span>
    </button>
  );
}
