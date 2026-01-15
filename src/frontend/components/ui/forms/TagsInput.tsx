import sanitizeHtml from "sanitize-html";
import { InputWrapper } from "./util";
import { createUniqueId } from "solid-js";

type TagsInputProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  icon?: string;
  activeIcon?: string;
  value?: () => string[];
  onChange?: (tags: string[]) => void;
  error?: () => string | undefined;
  required?: boolean;
  disabled?: boolean;
};

/**
 * Tags input component with comma-separated entry
 * @param label - Optional label text
 * @param description - Optional description text
 * @param placeholder - Placeholder text when no tags
 * @param icon - Icon shown when not focused
 * @param activeIcon - Icon shown when focused
 * @param value - Reactive string array getter
 * @param onChange - Called when tags change
 * @param error - Reactive error message getter
 * @param required - Show required asterisk after label
 * @param disabled - Disable the input
 */
const TagsInput = (props: TagsInputProps) => {
  const placeholder = () => props.placeholder ?? "Tags (z.B. Tag 1, Tag 2,...)";
  const icon = () => props.icon ?? "ti ti-tag";
  const activeIcon = () => props.activeIcon ?? "ti ti-pencil";
  const value = () => props.value?.() ?? [];
  const disabled = () => props.disabled ?? false;

  const announcementId = createUniqueId();

  const renderTags = (tags: string[] | undefined) => {
    const tagList = tags || [];
    return tagList.length === 0
      ? `<span class="text-gray-400 dark:text-gray-500">${placeholder()}</span>`
      : `<div class="flex flex-wrap gap-1">${tagList
          .map(
            (tag) =>
              `<span class="min-w-0 max-w-37.5 truncate rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">${tag}</span>`,
          )
          .join("")}</div>`;
  };

  return (
    <InputWrapper
      label={props.label}
      description={props.description}
      error={props.error}
      required={props.required}
    >
      {({ inputId, ariaDescribedBy }) => (
        <div class="flex gap-2">
          <div class="group relative flex-1">
            <div
              class={`absolute inset-y-0 left-3 flex items-center text-gray-500`}
            >
              <i class={`${icon()} group-focus-within:hidden`} />
              <i
                class={`${activeIcon()} hidden text-blue-500 group-focus-within:block`}
              />
            </div>
            <div
              contentEditable={!disabled()}
              id={inputId}
              class={`input-subtle min-h-9. w-full overflow-hidden p-2 pl-9 outline-none ${disabled() ? "cursor-not-allowed opacity-50" : "cursor-text"}`}
              role="textbox"
              aria-multiline="false"
              aria-label={
                !props.label ? placeholder() || "Tags eingeben" : undefined
              }
              aria-describedby={ariaDescribedBy}
              aria-invalid={!!props.error?.()}
              aria-required={props.required}
              aria-disabled={disabled()}
              aria-placeholder={placeholder()}
              onFocus={(e) => {
                if (disabled()) return;
                const currentTags = value();
                e.currentTarget.textContent = currentTags.join(", ");
                const sel = getSelection();
                sel?.selectAllChildren(e.currentTarget);
                sel?.collapseToEnd();
              }}
              onBlur={(e) => {
                if (disabled()) return;
                const oldTags = value();
                const newTags = (e.currentTarget.textContent || "")
                  .split(",")
                  .map((t) => sanitizeHtml(t.trim()))
                  .filter(Boolean)
                  .filter((tag, index, self) => self.indexOf(tag) === index);

                // Announce changes to screen readers
                const added = newTags.filter((t) => !oldTags.includes(t));
                const removed = oldTags.filter((t) => !newTags.includes(t));

                if (added.length > 0 || removed.length > 0) {
                  const announcement = document.getElementById(announcementId);
                  if (announcement) {
                    let message = "";
                    if (added.length > 0) {
                      message += `Tags hinzugefügt: ${added.join(", ")}. `;
                    }
                    if (removed.length > 0) {
                      message += `Tags entfernt: ${removed.join(", ")}.`;
                    }
                    announcement.textContent = message;
                  }
                }

                props.onChange?.(newTags);
                e.currentTarget.innerHTML = renderTags(newTags);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (e.preventDefault(), e.currentTarget.blur())
              }
              innerHTML={renderTags(value())}
            />
          </div>

          {/* Hidden live region for announcements */}
          <div
            id={announcementId}
            class="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          />
        </div>
      )}
    </InputWrapper>
  );
};

export default TagsInput;
