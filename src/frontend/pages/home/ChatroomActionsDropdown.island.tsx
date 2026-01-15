import { api } from "@/frontend/lib/client-utils";
import { isImageUrl } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import type { Chatroom } from "@/shared/schemas";
import { createStore } from "solid-js/store";
import Dropdown from "@/frontend/components/ui/Dropdown";

/** Dropdown menu with actions for a chatroom (favorite, mute, edit, delete). */
export default function ChatroomActionsDropdown(props: {
  chatroom: Chatroom;
  isAdmin: boolean;
  userId: string;
}) {
  const [chatroom, setChatroom] = createStore(props.chatroom);
  const canEdit = chatroom.can_manage ?? false;

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
        throw new Error(
          "message" in data ? data.message : "Error updating favorite",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: () => {
      setChatroom("is_favorited", !chatroom.is_favorited);

      // Toggle the heart icon on the parent page
      const heartIcon = document.getElementById(`heart-${chatroom.id}`);
      if (heartIcon) {
        heartIcon.classList.toggle("hidden");
      }
    },
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
        throw new Error(
          "message" in data ? data.message : "Error updating mute",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: () => {
      setChatroom("is_unmuted", !chatroom.is_unmuted);

      // Toggle the mute icon on the parent page (hidden when unmuted, shown when muted)
      const muteIcon = document.getElementById(`mute-${chatroom.id}`);
      if (muteIcon) {
        muteIcon.classList.toggle("hidden");
      }
    },
  });

  const editChatroomMutation = createMutation({
    mutation: async (values: {
      name?: string;
      description?: string | null;
      image?: string | null;
    }) => {
      const res = await api.chatrooms[":id"].$patch({
        param: { id: chatroom.id },
        json: {
          name: values.name,
          description: values.description,
          // Only send image if it changed (not a URL anymore)
          image: isImageUrl(values.image) ? undefined : values.image,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error updating chatroom",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: ({ name, description }) => {
      setChatroom({
        ...chatroom,
        name,
        description,
      });
    },
  });

  const togglePinMutation = createMutation({
    mutation: async () => {
      const res = await api.chatrooms[":id"].$patch({
        param: { id: chatroom.id },
        json: { pinned: !chatroom.pinned },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error updating pin status",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: () => window.location.reload(),
  });

  const deleteChatroomMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Are you sure you want to delete '${chatroom.name}'?`,
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
        param: { id: chatroom.id },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error deleting chatroom",
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

  const handleEdit = async () => {
    const values = await prompts.form({
      title: "Edit Chatroom",
      icon: "ti ti-edit",
      fields: {
        image: {
          type: "image",
          round: false,
          default: chatroom.image,
        },
        name: {
          type: "text",
          label: "Name",
          placeholder: "Chatroom Name",
          maxLength: 50,
          default: chatroom.name,
          required: true,
        },
        description: {
          type: "text",
          label: "Description",
          placeholder: "Describe the chatroom...",
          multiline: true,
          maxLength: 200,
          default: chatroom.description || undefined,
        },
      },
    });

    if (values) {
      await editChatroomMutation.mutate(values);
    }
  };

  // Build elements array dynamically based on permissions
  const getElements = () => {
    const elements: any[] = [
      {
        icon: chatroom.is_favorited ? "ti ti-heart-off" : "ti ti-heart",
        label: chatroom.is_favorited ? "Unlike" : "Like",
        action: () => setFavoriteMutation.mutate({}),
      },
      {
        icon: chatroom.is_unmuted ? "ti ti-bell-off" : "ti ti-bell",
        label: chatroom.is_unmuted ? "Mute" : "Unmute",
        action: () => setMuteMutation.mutate({}),
      },
    ];

    // Add edit section for creator/admin
    if (canEdit) {
      elements.push({
        icon: "ti ti-edit",
        label: "Edit",
        action: handleEdit,
      });
    }

    // Add pin for admin
    if (props.isAdmin) {
      elements.push({
        icon: "ti ti-pin",
        label: chatroom.pinned ? "Unpin" : "Pin for All",
        action: () => togglePinMutation.mutate({}),
      });
    }

    // Add delete for creator/admin
    if (canEdit) {
      elements.push({
        icon: "ti ti-trash",
        label: "Delete",
        action: () => deleteChatroomMutation.mutate({}),
        variant: "danger" as const,
      });
    }

    return elements;
  };

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-1.5 shrink-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          aria-label={`Actions for ${chatroom.name}`}
        >
          <i class="ti ti-dots-vertical text-sm" />
        </button>
      }
      elements={getElements()}
    />
  );
}
