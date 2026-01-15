import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";

type RemoveMemberButtonProps = {
  chatroomId: string;
  userId: string;
  username: string;
};

/** Button to remove a member from a chatroom. */
export default function RemoveMemberButton(props: RemoveMemberButtonProps) {
  const removeMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Remove '${props.username}' from this chatroom?`,
        {
          title: "Remove Member",
          icon: "ti ti-user-minus",
          variant: "danger",
          confirmText: "Remove",
          cancelText: "Cancel",
        },
      );
      if (!confirmed) return null;

      const res = await api.chatrooms[":id"].members[":userId"].$delete({
        param: { id: props.chatroomId, userId: props.userId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to remove");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: (data) => {
      if (data) window.location.reload();
    },
  });

  return (
    <button
      type="button"
      onClick={() => removeMutation.mutate({})}
      disabled={removeMutation.loading()}
      class="text-red-500 hover:text-red-600 disabled:opacity-50 p-1 px-2"
      aria-label={`Remove ${props.username}`}
    >
      <i
        class={
          removeMutation.loading()
            ? "ti ti-loader-2 animate-spin"
            : "ti ti-user-minus"
        }
      />
    </button>
  );
}
