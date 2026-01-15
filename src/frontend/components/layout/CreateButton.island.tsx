import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";

/** Button to create a new chatroom via form dialog. */
export default function CreateButton() {
  const mutation = createMutation({
    mutation: async () => {
      const data = await prompts.form({
        title: "New Chatroom",
        icon: "ti ti-message-plus",
        confirmText: "Create",
        fields: {
          name: {
            type: "text",
            label: "Name",
            placeholder: "Name",
            required: true,
          },
          description: {
            type: "text",
            multiline: true,
            label: "Description",
            placeholder: "Description",
          },
          info: {
            type: "info",
            content: (
              <div class="info-block-warning text-xs text-center">
                The following fields cannot be changed later!
              </div>
            ),
          },
          unlisted: {
            type: "boolean",
            label: "Unlisted",
            description: "Only accessible via link.",
            required: false,
          },
          is_townsquare: {
            type: "boolean",
            label: "Public Room",
            description: "All users can participate.",
            required: false,
            default: true,
          },
        },
      });

      if (!data) return;

      const res = await api.chatrooms.$post({
        json: {
          name: data.name,
          description: data.description || undefined,
          unlisted: data.unlisted || false,
          is_townsquare: data.is_townsquare ?? true,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          // @ts-ignore todo
          "message" in data ? data.message : "Error creating chatroom",
        );
      }

      return res.json();
    },
    onSuccess: (res) => {
      if (!res) return;
      window.location.href = `/room/${res.id}`;
    },
    onError: (error) => prompts.error(error.message),
  });

  return (
    <>
      <button
        class="text-md sm:text-lg hover-text text-green-500 hover:text-green-700"
        title="New Chatroom"
        aria-label="New Chatroom"
        onClick={() => mutation.mutate({})}
      >
        <i class="ti ti-plus" />
      </button>
    </>
  );
}
