import { getUserColor } from "@/shared/utils";
import {
  formatRelativeTime,
  type MessageGroup,
  type MessageChunk,
  DELETED_USER_ID,
} from "./util";
import { renderMarkdown } from "@/frontend/lib/markdown";
import { api, getEmojiOnlySize } from "@/frontend/lib/client-utils";
import { Show, For, Switch, Match, createSignal } from "solid-js";
import type { Message } from "@/shared/schemas";
import Lightbox from "./Lightbox";
import { prompts } from "@/frontend/components/ui/prompts";
import { createMutation } from "@/frontend/lib/mutation";

// ==========================
// Sub-components
// ==========================

type UserPopoverProps = {
  id: string;
  userId: string;
  bio: string | null;
};

/** Popover showing user bio when clicking on avatar. */
const UserPopover = (props: UserPopoverProps) => {
  const color = getUserColor(props.userId);
  const anchor = () => `--anchor-${props.id}`;
  const isDeleted = () => props.userId === DELETED_USER_ID;

  return (
    <div
      id={props.id}
      popover="auto"
      class="paper p-3 min-w-48 max-w-100"
      style={`position-anchor: ${anchor()}; bottom: anchor(top); left: anchor(left); margin-bottom: 8px;`}
    >
      <div class="flex-1 min-w-0">
        <Show
          when={!isDeleted()}
          fallback={
            <div class="text-sm text-zinc-500 dark:text-zinc-400 italic">
              This message was sent by a user whose account no longer exists.
            </div>
          }
        >
          <div class="font-semibold truncate" style={{ color }}>
            Bio
          </div>
          <div class="text-sm text-zinc-400 dark:text-zinc-200 line-clamp-3 mt-1">
            {props.bio || "¯\\_(ツ)_/¯"}
          </div>
        </Show>
      </div>
    </div>
  );
};

// ==========================
// Constants
// ==========================

/** 10 minutes in milliseconds - messages can only be edited/deleted within this window */
const EDIT_WINDOW_MS = 10 * 60 * 1000;

/** Checks if a message is still within the edit/delete window */
const isWithinEditWindow = (createdAt: string): boolean => {
  const created = new Date(createdAt).getTime();
  return Date.now() - created < EDIT_WINDOW_MS;
};

/** Renders a text message with markdown, emoji-only sizing, and edit controls. */
const TextMessage = (props: { msg: Message; isOwn: boolean }) => {
  const [showActions, setShowActions] = createSignal(false);
  const [content, setContent] = createSignal(props.msg.content);
  const [history, setHistory] = createSignal(props.msg.history ?? []);
  const [isDeleted, setIsDeleted] = createSignal(false);

  const emojiSize = () => getEmojiOnlySize(content());
  const isEdited = () => history().length > 0;
  const canEdit = () => props.isOwn && isWithinEditWindow(props.msg.created_at);
  const anchorName = () => `--msg-${props.msg.id}`;

  // Edit mutation
  const editMutation = createMutation({
    mutation: async ({ newContent }: { newContent: string }) => {
      const res = await api.messages[":id"].$patch({
        param: { id: props.msg.id },
        json: { content: newContent },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          (error as { message: string }).message || "Failed to edit message",
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      setContent(data.content);
      setHistory(data.history ?? []);
      setShowActions(false);
    },
    onError: (error) => {
      prompts.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = createMutation({
    mutation: async () => {
      const res = await api.messages[":id"].$delete({
        param: { id: props.msg.id },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          (error as { message: string }).message || "Failed to delete message",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      setIsDeleted(true);
      setShowActions(false);
    },
    onError: (error) => {
      prompts.error(error.message);
    },
  });

  // Handle edit button click
  const handleEdit = async (e: Event) => {
    e.stopPropagation();
    const result = await prompts.form({
      title: "Edit Message",
      icon: "ti ti-pencil",
      confirmText: "Save",
      fields: {
        content: {
          type: "text",
          label: "Message",
          default: content(),
          required: true,
          multiline: true,
          validate: (value) => {
            if (value === content()) return "Content is unchanged";
            return null;
          },
        },
      },
    });

    if (result?.content) {
      editMutation.mutate({ newContent: result.content });
    }
  };

  // Handle delete button click
  const handleDelete = async (e: Event) => {
    e.stopPropagation();
    const confirmed = await prompts.confirm(
      "Are you sure you want to delete this message?",
      {
        title: "Delete Message",
        icon: "ti ti-trash",
        variant: "danger",
        confirmText: "Delete",
      },
    );

    if (confirmed) {
      deleteMutation.mutate({});
    }
  };

  // Toggle actions on tap (for touch devices)
  const handleTap = () => {
    if (canEdit()) {
      setShowActions((prev) => !prev);
    }
  };

  // Don't render if deleted
  if (isDeleted()) {
    return null;
  }

  return (
    <div
      class="group/text"
      style={{ "anchor-name": anchorName() }}
      onClick={handleTap}
      role={canEdit() ? "button" : undefined}
      tabIndex={canEdit() ? 0 : undefined}
      aria-expanded={canEdit() ? showActions() : undefined}
      aria-label={canEdit() ? "Toggle message actions" : undefined}
      onKeyDown={(e) => {
        if (canEdit() && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      <div
        class={`wrap-break-word ${emojiSize() ?? "text-sm"} ${
          props.isOwn ? "text-white" : "text-zinc-900 dark:text-zinc-100"
        } [&_strong]:font-bold [&_em]:italic [&_s]:line-through [&_code]:bg-black/10 [&_code]:dark:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-[0.9em] [&_a]:underline [&_pre]:bg-black/10 [&_pre]:dark:bg-white/10 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-2 [&_blockquote]:opacity-80 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 ${
          canEdit() ? "group-hover/text:underline" : ""
        } ${showActions() ? "underline" : ""}`}
        innerHTML={renderMarkdown(content())}
      />
      <Show when={isEdited()}>
        <span
          class={`text-xs italic ${
            props.isOwn ? "text-white/50" : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          (edited)
        </span>
      </Show>

      {/* Edit actions - anchored to the left center of the text */}
      <Show when={canEdit()}>
        <div
          class={`fixed flex gap-2 transition-opacity z-10 ${
            showActions()
              ? "opacity-100"
              : "opacity-0 group-hover/text:opacity-100"
          }`}
          style={`position-anchor: ${anchorName()}; top: anchor(center); right: anchor(left); translate: 0 -50%; margin-right: 15px;`}
          role="group"
          aria-label="Message actions"
        >
          <button
            type="button"
            class="text-md text-zinc-600 dark:text-zinc-300 hover:text-blue-500 disabled:opacity-50"
            aria-label="Edit message"
            onClick={handleEdit}
            disabled={editMutation.loading()}
          >
            <i
              class={
                editMutation.loading()
                  ? "ti ti-loader-2 animate-spin"
                  : "ti ti-pencil"
              }
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="text-md text-zinc-600 dark:text-zinc-300 hover:text-red-500 disabled:opacity-50"
            aria-label="Delete message"
            onClick={handleDelete}
            disabled={deleteMutation.loading()}
          >
            <i
              class={
                deleteMutation.loading()
                  ? "ti ti-loader-2 animate-spin"
                  : "ti ti-trash"
              }
              aria-hidden="true"
            />
          </button>
        </div>
      </Show>
    </div>
  );
};

const MAX_VISIBLE_IMAGES = 4;

/** Displays images in a grid with lightbox support and "+N more" overlay. */
const ImageGrid = (props: { messages: readonly Message[] }) => {
  const [lightboxIndex, setLightboxIndex] = createSignal<number | null>(null);

  const visibleImages = () => props.messages.slice(0, MAX_VISIBLE_IMAGES);
  const remainingCount = () => props.messages.length - MAX_VISIBLE_IMAGES;
  const allImageUrls = () => props.messages.map((m) => m.content);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const isSingleImage = () => props.messages.length === 1;

  return (
    <>
      <div class={isSingleImage() ? "" : "flex flex-wrap gap-1.5"}>
        <For each={visibleImages()}>
          {(msg, idx) => {
            const isLast = () => idx() === MAX_VISIBLE_IMAGES - 1;
            const showOverlay = () => isLast() && remainingCount() > 0;

            return (
              <button
                type="button"
                class="relative cursor-pointer"
                onClick={() => openLightbox(idx())}
              >
                <img
                  src={msg.content}
                  alt="Image"
                  class={`rounded-lg object-cover ${isSingleImage() ? "max-w-48 max-h-48" : "w-24 h-24"}`}
                />
                <Show when={showOverlay()}>
                  <div class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                    <span class="text-white text-xl font-semibold">
                      +{remainingCount()}
                    </span>
                  </div>
                </Show>
              </button>
            );
          }}
        </For>
      </div>

      <Show when={lightboxIndex() !== null}>
        <Lightbox
          images={allImageUrls()}
          initialIndex={lightboxIndex()!}
          onClose={closeLightbox}
        />
      </Show>
    </>
  );
};

/** Renders a GIF message with KLIPY watermark, or placeholder if disabled. */
const GifMessage = (props: { msg: Message; disabled?: boolean }) => (
  <Show
    when={!props.disabled}
    fallback={
      <div class="flex items-center gap-2 px-3 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
        <i class="ti ti-gif text-lg" />
        <span>{props.msg.content_meta || "GIF"}</span>
      </div>
    }
  >
    <div class="relative inline-block">
      <img
        src={props.msg.content}
        alt={props.msg.content_meta || "GIF"}
        class="max-w-48 max-h-48 rounded-lg"
        loading="lazy"
      />
      <img
        src="/public/klipy-2.svg"
        alt="KLIPY"
        class="absolute bottom-1 left-1 h-3 opacity-70"
      />
    </div>
  </Show>
);

/** Renders a message chunk based on its type (text, images, or gif). */
const ChunkView = (props: {
  chunk: MessageChunk;
  isOwn: boolean;
  gifsDisabled?: boolean;
}) => (
  <Switch>
    <Match when={props.chunk.type === "images" && props.chunk}>
      {(chunk) => (
        <ImageGrid
          messages={
            (chunk() as { type: "images"; messages: readonly Message[] })
              .messages
          }
        />
      )}
    </Match>
    <Match when={props.chunk.type === "gif" && props.chunk}>
      {(chunk) => (
        <GifMessage
          msg={(chunk() as { type: "gif"; message: Message }).message}
          disabled={props.gifsDisabled}
        />
      )}
    </Match>
    <Match when={props.chunk.type === "text" && props.chunk}>
      {(chunk) => (
        <TextMessage
          msg={(chunk() as { type: "text"; message: Message }).message}
          isOwn={props.isOwn}
        />
      )}
    </Match>
  </Switch>
);

// ==========================
// Main Component
// ==========================

/** Renders a group of messages from the same user with avatar and timestamp. */
export const MessageGroupView = (props: {
  group: MessageGroup;
  gifsDisabled?: boolean;
}) => {
  const color = getUserColor(props.group.userId);
  const lastMessage = () =>
    props.group.messages[props.group.messages.length - 1];
  const popoverId = () => `user-popover-${props.group.messages[0]?.id}`;
  const isDeleted = () => props.group.userId === DELETED_USER_ID;

  // Avatar component - shows user icon for deleted users
  const Avatar = () => (
    <Show
      when={!isDeleted()}
      fallback={
        <div
          class="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center"
          style={{ border: `2px solid ${color}` }}
        >
          <i class="ti ti-user-off text-zinc-500 dark:text-zinc-400 text-sm" />
        </div>
      }
    >
      <img
        src={`/api/users/${props.group.userId}/avatar`}
        alt={props.group.username}
        class="w-8 h-8 rounded-full"
        style={{ border: `2px solid ${color}` }}
      />
    </Show>
  );

  return (
    <div
      class={`flex gap-2 ${props.group.isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      <div class="shrink-0 self-end">
        <Show when={!props.group.isOwn} fallback={<Avatar />}>
          <button
            type={"button"}
            popoverTarget={popoverId()}
            class={`rounded-full hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600 transition-all`}
            style={{ "anchor-name": `--anchor-${popoverId()}` }}
          >
            <Avatar />
          </button>
          <UserPopover
            id={popoverId()}
            userId={props.group.userId}
            bio={props.group.bio}
          />
        </Show>
      </div>

      <div
        class={`flex flex-col max-w-[70%] md:max-w-[40%] min-w-0 ${props.group.isOwn ? "items-end" : "items-start"}`}
      >
        <Show when={!props.group.isOwn}>
          <span
            class="text-xs font-medium mb-1 px-2 max-w-full truncate"
            style={{ color }}
            title={props.group.username}
          >
            {props.group.username}
          </span>
        </Show>

        <div
          class={`rounded-2xl overflow-hidden relative p-2 flex flex-col gap-2 max-w-full ${
            props.group.isOwn
              ? "bg-blue-500 text-white rounded-br-sm"
              : "bg-zinc-100 dark:bg-zinc-800 rounded-bl-sm"
          }`}
          title={props.group.username}
        >
          <For each={props.group.chunks}>
            {(chunk) => (
              <ChunkView
                chunk={chunk}
                isOwn={props.group.isOwn}
                gifsDisabled={props.gifsDisabled}
              />
            )}
          </For>

          <div
            class={`text-xs ${
              props.group.isOwn
                ? "text-white/70"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {formatRelativeTime(lastMessage()!.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
};
