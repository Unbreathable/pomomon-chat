import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import type { ChatroomRole } from "@/shared/schemas";

type EditMemberButtonProps = {
  chatroomId: string;
  userId: string;
  username: string;
  currentRole: ChatroomRole;
};

/** Button to edit a member's role in a chatroom. */
export default function EditMemberButton(props: EditMemberButtonProps) {
  const updateMutation = createMutation({
    mutation: async () => {
      const values = await prompts.form({
        title: `Edit ${props.username}`,
        icon: "ti ti-user-edit",
        fields: {
          isManager: {
            type: "boolean",
            label: "Room Admin",
            description:
              "Can edit/delete room, manage members, and reset invite token",
            default: props.currentRole === "manage",
          },
        },
      });

      if (!values) return null;

      const newRole: ChatroomRole = values.isManager ? "manage" : "member";
      if (newRole === props.currentRole) return null;

      const res = await api.chatrooms[":id"].members[":userId"].$patch({
        param: { id: props.chatroomId, userId: props.userId },
        json: { role: newRole },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to update");
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
      onClick={() => updateMutation.mutate({})}
      disabled={updateMutation.loading()}
      class="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50 p-1 px-2"
      aria-label={`Edit ${props.username}`}
    >
      <i
        class={
          updateMutation.loading()
            ? "ti ti-loader-2 animate-spin"
            : "ti ti-user-edit"
        }
      />
    </button>
  );
}
