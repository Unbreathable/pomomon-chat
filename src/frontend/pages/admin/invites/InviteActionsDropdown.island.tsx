import { api } from "@/frontend/lib/client-utils";
import { copyToClipboard } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import Dropdown from "@/frontend/components/ui/Dropdown";

/** Dropdown with actions for an invite (copy, delete). */
export default function InviteActionsDropdown(props: {
  token: string;
  inviteUrl: string;
  realName: string;
}) {
  const deleteInviteMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Are you sure you want to delete the invite for '${props.realName}'?`,
        {
          title: "Delete Invite",
          icon: "ti ti-trash",
          variant: "danger",
          confirmText: "Delete",
          cancelText: "Cancel",
        },
      );

      if (!confirmed) return null;

      const res = await api.admin.invites[":token"].$delete({
        param: { token: props.token },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error deleting invite",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: async (data) => {
      if (!data) return;
      window.location.reload();
    },
  });

  const handleCopyInvite = async () => {
    await copyToClipboard(props.inviteUrl);
    await prompts.alert("Invite URL copied to clipboard");
  };

  return (
    <Dropdown
      trigger={
        <button class="h-8 w-8 p-1.5 shrink-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
          <i class="ti ti-dots-vertical text-sm" />
        </button>
      }
      elements={[
        {
          icon: "ti ti-copy",
          label: "Copy Invite",
          action: handleCopyInvite,
        },
        {
          icon: "ti ti-trash",
          label: "Delete",
          action: () => deleteInviteMutation.mutate({}),
          variant: "danger" as const,
        },
      ]}
    />
  );
}
