import type { WsClientMessage } from "@/shared/schemas";
import { createEffect, createSignal, For, Show } from "solid-js";
import { showFileDialog } from "@/frontend/lib/files";
import { img } from "@/frontend/lib/images";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import { createDebounce } from "@/frontend/lib/timed";
import { api } from "@/frontend/lib/client-utils";
import { GifGrid, type Gif } from "./GifGrid";

// ==========================
// Types & Constants
// ==========================

const MAX_IMAGES = 10;

type ImagePreview = {
  name: string;
  imgData: string;
};

type ChatInputProps = {
  onSend: (msg: WsClientMessage) => void;
  disabled?: boolean;
  gifsDisabled?: boolean;
};

// ==========================
// Component
// ==========================

/** Chat input with text field, image upload, and GIF picker support. */
export default function ChatInput(props: ChatInputProps) {
  const [message, setMessage] = createSignal("");
  const [images, setImages] = createSignal<ImagePreview[]>([]);
  const [showGifPicker, setShowGifPicker] = createSignal(false);
  const [gifQuery, setGifQuery] = createSignal("");
  const [gifs, setGifs] = createSignal<Gif[]>([]);
  const [gifsLoading, setGifsLoading] = createSignal(false);
  const [gifPage, setGifPage] = createSignal(1);
  const [hasMoreGifs, setHasMoreGifs] = createSignal(true);
  let textareaRef: HTMLTextAreaElement | undefined;

  /** Fetches GIFs from API with optional pagination append. */
  const fetchGifs = async (query: string, page: number, append = false) => {
    setGifsLoading(true);
    try {
      const res = await api.gifs.$get({
        query: { q: query || undefined, per_page: "24", page: String(page) },
      });
      if (res.ok) {
        const data = await res.json();
        const newGifs = data.gifs as Gif[];
        setGifs(append ? [...gifs(), ...newGifs] : newGifs);
        setHasMoreGifs(data.pagination.has_next);
      }
    } catch (err) {
      console.error("Failed to fetch GIFs:", err);
    } finally {
      setGifsLoading(false);
    }
  };

  /** Debounced search that resets pagination. */
  const { debouncedFn: searchGifs } = createDebounce((query: string) => {
    setGifPage(1);
    setGifs([]);
    fetchGifs(query, 1);
  }, 300);

  /** Loads the next page of GIFs. */
  const loadMoreGifs = () => {
    const nextPage = gifPage() + 1;
    setGifPage(nextPage);
    fetchGifs(gifQuery(), nextPage, true);
  };

  // Load trending GIFs when picker opens
  createEffect(() => {
    if (showGifPicker() && gifs().length === 0) {
      fetchGifs("", 1);
    }
  });

  /** Sends selected GIF and closes picker. */
  const handleGifSelect = (gif: Gif) => {
    props.onSend({
      content_type: "gif",
      content: gif.url,
      content_meta: gif.title,
    });
    setShowGifPicker(false);
    setGifQuery("");
  };

  /** Closes the GIF picker and resets search query. */
  const closeGifPicker = () => {
    setShowGifPicker(false);
    setGifQuery("");
  };

  /** Sends all pending images and text message via WebSocket. */
  const sendMessagesMutation = createMutation({
    mutation: async () => {
      if (!message() && images().length === 0) return;

      for (const img of images()) {
        props.onSend({
          content_type: "image",
          content: img.imgData,
        });
      }

      message() &&
        props.onSend({
          content_type: "text",
          content: message(),
        });
    },
    onSuccess: () => {
      setImages([]);
      setMessage("");
    },
    onError: (err) => prompts.error(`Error sending message(s): ${err.message}`),
  });

  /** Submits message on Enter (without Shift). */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessagesMutation.mutate({});
    }
  };

  /** Opens file dialog, processes selected images to WebP base64. */
  const imageSelectMutation = createMutation({
    mutation: async () => {
      const files = await showFileDialog({
        accept: "image/*",
        multiple: true,
      }).catch(() => []);

      const currentNames = new Set(images().map((i) => i.name));

      const filesToProcess = files
        .filter((f) => !currentNames.has(f.name))
        .slice(0, MAX_IMAGES - images().length);

      if (filesToProcess.length === 0) return;

      return await Promise.all(
        filesToProcess.map(async (file) => ({
          name: file.name,
          imgData: await img
            .create(file)
            .then(img.resizeMax(1024))
            .then(img.toBase64("webp", 0.8)),
        })),
      );
    },
    onSuccess: (data) => {
      if (!data) return;
      setImages((prev) => [...prev, ...data]);
      closeGifPicker();
      textareaRef?.focus();
    },
    onError: (err) => {
      prompts.error(
        `Something went wrong during the image processing: ${err.message}`,
      );
    },
  });

  /** Removes an image from the preview list by filename. */
  const removeImage = (name: string) => {
    setImages((prev) => prev.filter((img) => img.name !== name));
  };

  /** Returns true if there is text or images to send. */
  const hasContent = () => message().trim() || images().length > 0;

  /** Auto-resizes textarea to fit content (max 4 lines). */
  const autoResize = () => {
    if (!textareaRef) return;
    textareaRef.style.height = "auto";
    textareaRef.style.height = `${Math.min(textareaRef.scrollHeight, 96)}px`;
  };

  // Reset height when message is cleared
  createEffect(() => {
    if (!message()) {
      if (textareaRef) textareaRef.style.height = "auto";
    }
  });

  return (
    <div class="flex flex-col gap-2 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-zinc-700/30 px-2 py-1.5 pointer-events-auto">
      {/* GIF Picker */}
      <Show when={showGifPicker()}>
        <GifGrid
          gifs={gifs()}
          query={gifQuery()}
          onQueryChange={(q) => {
            setGifQuery(q);
            searchGifs(q);
          }}
          onSelect={handleGifSelect}
          onLoadMore={loadMoreGifs}
          loading={gifsLoading()}
          hasMore={hasMoreGifs()}
        />
      </Show>

      {/* Image Previews */}
      <Show when={!showGifPicker() && images().length > 0}>
        <div class="flex gap-2 px-1 pt-1 overflow-x-auto no-scrollbar">
          <For each={images()}>
            {(image) => (
              <div class="relative shrink-0 group">
                <img
                  src={image.imgData}
                  alt="Upload preview"
                  class="w-16 h-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.name)}
                  class="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  title="Remove image"
                >
                  <i class="ti ti-x text-xs" />
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Input Row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessagesMutation.mutate({});
        }}
        class="flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => imageSelectMutation.mutate({})}
          disabled={imageSelectMutation.loading()}
          class="shrink-0 w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Add images"
        >
          <i
            class={`ti ${imageSelectMutation.loading() ? "ti-loader-2 animate-spin" : "ti-photo-plus"} text-xl`}
          />
        </button>

        <Show when={!props.gifsDisabled}>
          <button
            type="button"
            onClick={() => setShowGifPicker(!showGifPicker())}
            class={`shrink-0 w-9 h-9 flex items-center justify-center transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              showGifPicker()
                ? "text-blue-500 hover:text-blue-600"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            title="Add GIF"
          >
            <i class="ti ti-gif text-xl" />
          </button>
        </Show>

        <textarea
          ref={textareaRef}
          value={message()}
          onInput={(e) => {
            setMessage(e.currentTarget.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          class="flex-1 resize-none bg-transparent border-none outline-none text-sm leading-6 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 max-h-24 min-h-9"
          rows={1}
        />

        <button
          type="submit"
          disabled={
            !hasContent() || props.disabled || sendMessagesMutation.loading()
          }
          class="shrink-0 w-9 h-9 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-full transition-colors"
          title="Send message"
        >
          <i
            class={`ti ${sendMessagesMutation.loading() ? "ti-loader-2 animate-spin" : hasContent() ? "ti-sparkles" : "ti-sparkles-2"} text-lg`}
          />
        </button>
      </form>
    </div>
  );
}
