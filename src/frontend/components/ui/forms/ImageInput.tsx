import { showFileDialog } from "@/frontend/lib/files";
import { img } from "@/frontend/lib/images";
import { Show } from "solid-js";
import { InputWrapper } from "./util";

type ImageInputProps = {
  label?: string;
  description?: string;
  ariaLabel?: string;
  value?: () => string | null;
  round?: boolean;
  variant?: "default" | "small";
  onChange?: (value: string | null) => void;
  error?: () => string | undefined;
  required?: boolean;
  disabled?: boolean;
};

/**
 * Image input component with file upload and preview
 * @param label - Optional label text
 * @param description - Optional description text
 * @param ariaLabel - Accessibility label (defaults to label if not provided)
 * @param value - Reactive string value getter (base64 or URL, fallback URLs are treated as null)
 * @param onChange - Called when image changes (receives base64 string or null)
 * @param error - Reactive error message getter
 * @param round - Display image in circular shape
 * @param variant - "default" for large preview, "small" for inline compact view
 * @param required - Show required asterisk after label
 * @param disabled - Disable the input
 */
const ImageInput = (props: ImageInputProps) => {
  const disabled = () => props.disabled ?? false;
  const variant = () => props.variant ?? "default";

  // Effective value: treat fallback URLs as null (no custom image set)
  const value = () => {
    const val = props.value?.();
    return val && !val.includes("?fallback") ? val : null;
  };

  const selectImage = () => {
    if (disabled()) return;
    showFileDialog({ accept: ".jpg,.jpeg,.png,.gif,.webp" })
      .then((file) => img.presets.avatar(file))
      .then((image) => props.onChange?.(image));
  };

  // Small variant - inline compact view (same height as text input)
  if (variant() === "small") {
    return (
      <InputWrapper
        label={props.label}
        description={props.description}
        error={props.error}
        required={props.required}
      >
        {({ inputId, ariaDescribedBy }) => (
          <div
            class={`flex h-9 items-center gap-1 ${disabled() ? "opacity-50" : ""}`}
            role="group"
            aria-labelledby={inputId}
            aria-describedby={ariaDescribedBy}
          >
            <div
              class={`h-9 w-9 shrink-0 overflow-hidden ${props.round ? "rounded-full" : "rounded"} border border-gray-200 dark:border-gray-700`}
            >
              <Show
                when={value()}
                fallback={
                  <div class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <i
                      class="ti ti-photo-off text-gray-400 dark:text-gray-600"
                      aria-hidden="true"
                    />
                  </div>
                }
              >
                <img
                  src={value()!}
                  alt={props.label || "Ausgewähltes Bild"}
                  class="h-full w-full object-cover"
                />
              </Show>
            </div>
            <button
              type="button"
              class="btn-simple flex h-9 w-9 items-center justify-center"
              onClick={selectImage}
              aria-label={value() ? "Bild ändern" : "Bild hinzufügen"}
              disabled={disabled()}
            >
              <i
                class={value() ? "ti ti-edit" : "ti ti-photo-plus"}
                aria-hidden="true"
              />
            </button>
            <Show when={value() && !disabled()}>
              <button
                type="button"
                class="btn-simple flex h-9 w-9 items-center justify-center text-red-500"
                onClick={() => props.onChange?.(null)}
                aria-label="Bild entfernen"
                disabled={disabled()}
              >
                <i class="ti ti-trash" aria-hidden="true" />
              </button>
            </Show>
          </div>
        )}
      </InputWrapper>
    );
  }

  // Default variant - large preview
  return (
    <InputWrapper
      label={props.label}
      description={props.description}
      error={props.error}
      required={props.required}
    >
      {({ inputId, ariaDescribedBy }) => (
        <div
          class="flex flex-col items-center gap-1"
          role="group"
          aria-labelledby={inputId}
          aria-describedby={ariaDescribedBy}
        >
          <div
            class={`h-30 w-30 self-center overflow-hidden ${props.round ? "rounded-full" : "rounded-lg"} border-2 border-gray-200 md:h-50 md:w-50 dark:border-gray-700`}
          >
            <Show
              when={value()}
              fallback={
                <div class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <i
                    class="ti ti-photo-off text-2xl text-gray-400 dark:text-gray-600"
                    aria-hidden="true"
                  />
                </div>
              }
            >
              <img
                src={value()!}
                alt={props.label || "Ausgewähltes Bild"}
                class="h-full w-full object-cover"
                aria-label={props.ariaLabel || props.label || "Selected Image"}
              />
            </Show>
          </div>

          <div
            class={`mb-4 flex flex-row items-center gap-2 self-center ${disabled() ? "opacity-50" : ""}`}
          >
            <Show when={value() && !disabled()}>
              <button
                type="button"
                class="btn-simple group dark:hover:text-red-500"
                onClick={() => props.onChange?.(null)}
                aria-label="Bild entfernen"
                disabled={disabled()}
              >
                <i class="ti ti-trash group-hover:hidden" aria-hidden="true" />
                <i
                  class="ti ti-trash-x hidden group-hover:block"
                  aria-hidden="true"
                />
                Entfernen
              </button>
            </Show>

            <button
              type="button"
              class={`btn-simple group dark:hover:text-blue-500 ${disabled() ? "cursor-not-allowed" : ""}`}
              onClick={selectImage}
              aria-label={value() ? "Bild ändern" : "Bild hinzufügen"}
              aria-disabled={disabled()}
              disabled={disabled()}
            >
              <i
                class="ti ti-photo-plus group-hover:hidden"
                aria-hidden="true"
              />
              <i
                class="ti ti-cloud-upload hidden group-hover:block"
                aria-hidden="true"
              />
              {value() ? "Ändern" : "Hinzufügen"}
            </button>
          </div>
        </div>
      )}
    </InputWrapper>
  );
};

export default ImageInput;
