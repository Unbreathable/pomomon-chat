import { createSignal, createEffect, Show, onMount, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

// ==========================
// Types
// ==========================

type LightboxProps = {
  images: readonly string[];
  initialIndex?: number;
  onClose: () => void;
  /** Optional: Override total count displayed (for infinite scroll). */
  totalCount?: number;
  /** Optional: Callback when near the end to load more images. */
  onLoadMore?: () => void;
};

// ==========================
// Helpers
// ==========================

/** Downloads an image by fetching it and triggering a browser download. */
const downloadImage = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Failed to download image:", error);
  }
};

/** Minimum swipe distance in pixels to trigger navigation. */
const SWIPE_THRESHOLD = 50;

// ==========================
// Component
// ==========================

/** Fullscreen image viewer with keyboard navigation, touch gestures, and download. */
export default function Lightbox(props: LightboxProps) {
  let containerRef: HTMLDivElement | undefined;
  const [currentIndex, setCurrentIndex] = createSignal(props.initialIndex ?? 0);
  const [touchStart, setTouchStart] = createSignal<number | null>(null);

  const currentImage = () => props.images[currentIndex()];
  const displayTotal = () => props.totalCount ?? props.images.length;
  const hasMultiple = () => displayTotal() > 1;

  /** Triggers onLoadMore when within 2 images of the end. */
  createEffect(() => {
    const idx = currentIndex();
    const loadedCount = props.images.length;
    if (
      props.onLoadMore &&
      idx >= loadedCount - 2 &&
      displayTotal() > loadedCount
    ) {
      props.onLoadMore();
    }
  });

  /** Navigates to the next image (wraps around if all loaded). */
  const goNext = () => {
    if (!hasMultiple()) return;
    const nextIdx = currentIndex() + 1;
    // Only wrap if all images are loaded
    if (
      nextIdx >= props.images.length &&
      displayTotal() <= props.images.length
    ) {
      setCurrentIndex(0);
    } else if (nextIdx < props.images.length) {
      setCurrentIndex(nextIdx);
    }
  };

  /** Navigates to the previous image (wraps around if all loaded). */
  const goPrev = () => {
    if (!hasMultiple()) return;
    const prevIdx = currentIndex() - 1;
    // Only wrap if all images are loaded
    if (prevIdx < 0 && displayTotal() <= props.images.length) {
      setCurrentIndex(props.images.length - 1);
    } else if (prevIdx >= 0) {
      setCurrentIndex(prevIdx);
    }
  };

  /** Handles keyboard shortcuts (Escape, Arrow keys). */
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        props.onClose();
        break;
      case "ArrowRight":
        goNext();
        break;
      case "ArrowLeft":
        goPrev();
        break;
    }
  };

  /** Handles touch start for swipe gestures. */
  const handleTouchStart: JSX.EventHandler<HTMLDivElement, TouchEvent> = (
    e,
  ) => {
    const touch = e.touches[0];
    if (touch) setTouchStart(touch.clientX);
  };

  /** Handles touch end for swipe gestures. */
  const handleTouchEnd: JSX.EventHandler<HTMLDivElement, TouchEvent> = (e) => {
    const start = touchStart();
    if (start === null) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const diff = start - touch.clientX;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    setTouchStart(null);
  };

  /** Downloads the currently displayed image. */
  const handleDownload = () => {
    const filename = `image-${currentIndex() + 1}.webp`;
    currentImage() && downloadImage(currentImage()!, filename);
  };

  /** Traps focus within the lightbox. */
  const handleFocusTrap = (e: FocusEvent) => {
    if (!containerRef?.contains(e.relatedTarget as Node)) {
      containerRef?.focus();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    // Focus the container for accessibility
    containerRef?.focus();
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "";
  });

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer, showing image ${currentIndex() + 1} of ${displayTotal()}`}
      tabIndex={-1}
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onFocusOut={handleFocusTrap}
    >
      {/* Header */}
      <div class="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
        {/* Counter */}
        <Show when={hasMultiple()}>
          <div
            class="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentIndex() + 1} / {displayTotal()}
          </div>
        </Show>
        <Show when={!hasMultiple()}>
          <div />
        </Show>

        {/* Actions */}
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            class="w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
            aria-label="Download image"
          >
            <i class="ti ti-download text-xl" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={props.onClose}
            class="w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
            aria-label="Close image viewer (Escape)"
          >
            <i class="ti ti-x text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <Show when={hasMultiple()}>
        <button
          type="button"
          onClick={goPrev}
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="Previous image"
        >
          <i class="ti ti-chevron-left text-2xl" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={goNext}
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="Next image"
        >
          <i class="ti ti-chevron-right text-2xl" aria-hidden="true" />
        </button>
      </Show>

      {/* Image */}
      <img
        src={currentImage()}
        alt={`Image ${currentIndex() + 1} of ${displayTotal()}`}
        class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg select-none"
        draggable={false}
      />
    </div>
  );
}
