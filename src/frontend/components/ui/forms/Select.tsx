import { createSignal, createMemo, Show, For, onCleanup } from "solid-js";
import { InputWrapper } from "./util";

type SelectOption =
  | string
  | { id: string; label?: string; description?: string; icon?: string };

type SelectInputProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  icon?: string;
  activeIcon?: string;
  value?: () => string | undefined;
  onChange?: (value: string) => void;
  error?: () => string | undefined;
  options: SelectOption[];
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

/**
 * Select input component with dropdown menu
 * @param label - Optional label text
 * @param description - Optional description text
 * @param placeholder - Placeholder text when no option selected
 * @param icon - Icon shown when dropdown is closed
 * @param activeIcon - Icon shown when dropdown is open
 * @param value - Reactive string value getter (selected option id)
 * @param onChange - Called when selection changes
 * @param error - Reactive error message getter
 * @param options - Array of options (strings or objects with id/label)
 * @param required - Show required asterisk after label
 * @param clearable - Show clear button when value is selected
 * @param disabled - Disable the select input
 */
const SelectInput = (props: SelectInputProps) => {
  const placeholder = () => props.placeholder ?? "Auswählen...";
  const icon = () => props.icon ?? "ti ti-chevron-down";
  const activeIcon = () => props.activeIcon ?? "ti ti-chevron-up";
  const disabled = () => props.disabled ?? false;
  const clearable = () => props.clearable ?? false;

  const options = () =>
    props.options.map((o) =>
      typeof o === "object"
        ? { ...o, label: o.label || o.id }
        : { id: o, label: o },
    );

  // State management
  const [isOpen, setIsOpen] = createSignal(false);
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  let containerRef: HTMLDivElement | undefined;
  let triggerRef: HTMLDivElement | undefined;
  let dialogRef: HTMLDialogElement | undefined;
  let optionRefs: HTMLDivElement[] = [];

  // Get selected option
  const selectedOption = createMemo(() =>
    options().find((opt) => opt.id === props.value?.()),
  );

  // Focus management with auto-scroll
  const focusOption = (index: number) => {
    setFocusedIndex(index);
    if (optionRefs[index]) {
      optionRefs[index].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  };

  const navigateOptions = (direction: "next" | "previous") => {
    const count = options().length;
    if (!count) return;

    let newIndex = focusedIndex();
    if (direction === "next") {
      newIndex = newIndex < count - 1 ? newIndex + 1 : 0;
    } else {
      newIndex = newIndex > 0 ? newIndex - 1 : count - 1;
    }

    focusOption(newIndex);
  };

  const toggleDropdown = (open: boolean) => {
    if (disabled()) return;
    setIsOpen(open);

    if (open) {
      // Find current value index or default to first
      const currentIndex = options().findIndex(
        (opt) => opt.id === props.value?.(),
      );
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);

      // Position and show dialog
      if (dialogRef && triggerRef) {
        const rect = triggerRef.getBoundingClientRect();
        dialogRef.style.top = `${rect.bottom + 8}px`;
        dialogRef.style.left = `${rect.left}px`;
        dialogRef.style.width = `${rect.width}px`;
        dialogRef.showModal();
      }
    } else {
      dialogRef?.close();
      setFocusedIndex(-1);
    }
  };

  const selectOption = (option: { id: string; label: string }) => {
    props.onChange?.(option.id);
    toggleDropdown(false);
    triggerRef?.focus();
  };

  const clearValue = (e: MouseEvent) => {
    e.stopPropagation();
    props.onChange?.("");
    triggerRef?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const open = isOpen();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          toggleDropdown(true);
        } else {
          navigateOptions("next");
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (open) {
          navigateOptions("previous");
        }
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        if (open && focusedIndex() >= 0) {
          const option = options()[focusedIndex()];
          if (option) selectOption(option);
        } else if (!open) {
          toggleDropdown(true);
        }
        break;

      case "Escape":
        if (open) {
          e.preventDefault();
          toggleDropdown(false);
        }
        break;

      case "Tab":
        if (open) {
          toggleDropdown(false);
        }
        break;
    }
  };

  const handleDialogClick = (e: MouseEvent) => {
    if (e.target === dialogRef) {
      toggleDropdown(false);
    }
  };

  onCleanup(() => dialogRef?.close());

  return (
    <InputWrapper
      label={props.label}
      description={props.description}
      error={props.error}
      required={props.required}
    >
      {({ inputId, ariaDescribedBy }) => (
        <div ref={containerRef} class="relative">
          <div class="group relative flex-1">
            <div class="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center text-gray-500">
              <i
                class={`${
                  selectedOption()?.icon || (isOpen() ? activeIcon() : icon())
                } ${isOpen() ? "text-blue-500" : ""}`}
              />
            </div>

            <div
              ref={triggerRef}
              id={inputId}
              class={`input-subtle w-full p-2 pr-8 pl-9 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                isOpen() ? "ring-2 ring-blue-500" : ""
              } ${disabled() ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              onClick={() => toggleDropdown(!isOpen())}
              onKeyDown={handleKeyDown}
              tabIndex={disabled() ? -1 : 0}
              role="combobox"
              aria-expanded={isOpen()}
              aria-haspopup="listbox"
              aria-label={!props.label ? "Option auswählen" : undefined}
              aria-describedby={ariaDescribedBy}
              aria-invalid={!!props.error?.()}
              aria-required={props.required}
              aria-disabled={disabled()}
            >
              <Show
                when={selectedOption()}
                fallback={
                  <span class="text-gray-400 dark:text-gray-500">
                    {placeholder()}
                  </span>
                }
              >
                <span class="text-gray-700 dark:text-gray-300">
                  {selectedOption()!.label}
                </span>
              </Show>
            </div>

            <Show when={clearable() && selectedOption() && !disabled()}>
              <button
                type="button"
                class="absolute inset-y-0 right-2 flex items-center px-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={clearValue}
                tabIndex={-1}
                aria-label="Auswahl löschen"
              >
                <i class="ti ti-x text-sm" />
              </button>
            </Show>
          </div>

          <dialog
            ref={dialogRef}
            class="dark:bg-dark rounded-lg bg-white p-1 ring-2 ring-gray-200 backdrop:bg-transparent dark:ring-gray-700"
            onKeyDown={handleKeyDown}
            onClick={handleDialogClick}
            aria-label="Optionen"
          >
            <div
              class="scrollbar flex max-h-60 flex-col gap-1 overflow-y-auto rounded-lg"
              role="listbox"
              aria-label={props.label || "Options"}
            >
              <For
                each={options()}
                fallback={
                  <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Keine Optionen verfügbar
                  </div>
                }
              >
                {(option, index) => {
                  const isSelected = () => option.id === props.value?.();
                  const isFocused = () => index() === focusedIndex();

                  return (
                    <div
                      ref={(el) => (optionRefs[index()] = el)}
                      class={`flex cursor-pointer items-center rounded px-3 py-2 text-sm transition-colors select-none ${
                        isFocused()
                          ? "bg-gray-100 dark:bg-gray-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                      onClick={() => selectOption(option)}
                      onMouseEnter={() => setFocusedIndex(index())}
                      role="option"
                      aria-label={option.label}
                      aria-selected={isSelected()}
                    >
                      <Show when={option.icon}>
                        <i class={`${option.icon} mr-3 text-gray-500`} />
                      </Show>

                      <div class="min-w-0 flex-1">
                        <span class="truncate text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                        <Show when={option.description}>
                          <div class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {option.description}
                          </div>
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </dialog>
        </div>
      )}
    </InputWrapper>
  );
};

export default SelectInput;
