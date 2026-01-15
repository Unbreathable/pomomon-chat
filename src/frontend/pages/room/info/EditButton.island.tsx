import { api, isImageUrl } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts, type FieldSchema } from "@/frontend/components/ui/prompts";
import type { Chatroom } from "@/backend/services/chatrooms";

type EditButtonProps = {
  chatroom: Chatroom;
  isAdmin: boolean;
};

/** Edit chatroom button styled as a tab. */
export default function EditButton(props: EditButtonProps) {
  const editMutation = createMutation({
    mutation: async (values: {
      name?: string;
      description?: string | null;
      image?: string | null;
      pinned?: boolean;
    }) => {
      const res = await api.chatrooms[":id"].$patch({
        param: { id: props.chatroom.id },
        json: {
          name: values.name,
          description: values.description,
          image: isImageUrl(values.image) ? undefined : values.image,
          pinned: props.isAdmin ? values.pinned : undefined,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to update");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleEdit = async () => {
    const baseFields = {
      image: {
        type: "image" as const,
        round: false,
        default: props.chatroom.image,
      },
      name: {
        type: "text" as const,
        label: "Name",
        placeholder: "Chatroom Name",
        maxLength: 50,
        default: props.chatroom.name,
        required: true,
      },
      description: {
        type: "text" as const,
        label: "Description",
        placeholder: "Describe the chatroom...",
        multiline: true,
        maxLength: 200,
        default: props.chatroom.description || undefined,
      },
    };

    const adminFields = props.isAdmin
      ? {
          info: {
            type: "info",
            content: (
              <div class="info-block-info text-xs text-center">
                The following fields are only visible to admins.
              </div>
            ),
          },
          pinned: {
            type: "boolean" as const,
            label: "Pinned",
            description: "Pin this chatroom to the top of the list",
            default: props.chatroom.pinned,
          },
        }
      : {};

    const values = await prompts.form({
      title: "Edit Chatroom",
      icon: "ti ti-edit",
      fields: { ...baseFields, ...adminFields } as Record<string, FieldSchema>,
    });

    if (values) {
      await editMutation.mutate(values);
    }
  };

  return (
    <button
      type="button"
      onClick={handleEdit}
      disabled={editMutation.loading()}
      class="paper rounded-full px-4 py-2 text-sm sm:text-md font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
    >
      <i
        class={
          editMutation.loading()
            ? "ti ti-loader-2 animate-spin"
            : "ti ti-settings"
        }
      />
      <span class="hidden sm:inline">Edit</span>
    </button>
  );
}
