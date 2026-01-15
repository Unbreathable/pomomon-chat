import { InputWrapper } from "./util";

type TextInputProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  icon?: string;
  activeIcon?: string;
  value?: () => string | undefined | null;
  onChange?: (value: string) => void;
  onInput?: (value: string) => void;
  error?: () => string | undefined;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
  password?: boolean;
};

/**
 * Text input component with optional multiline support
 * @param label - Optional label text
 * @param description - Optional description text
 * @param placeholder - Placeholder text
 * @param icon - Icon shown when not focused
 * @param activeIcon - Icon shown when focused
 * @param value - Reactive value getter
 * @param onChange - Called on change event
 * @param onInput - Called on input event
 * @param error - Reactive error message getter
 * @param multiline - Enable textarea mode
 * @param required - Show required asterisk after label
 * @param disabled - Disable the input
 */
const TextInput = (props: TextInputProps) => {
  const icon = () => props.icon ?? "ti ti-cursor-text";
  const activeIcon = () => props.activeIcon ?? "ti ti-pencil";
  const multiline = () => props.multiline ?? false;
  const disabled = () => props.disabled ?? false;

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
              class={`absolute inset-y-0 left-3 z-10 flex pointer-events-none text-zinc-400 dark:text-zinc-500 ${multiline() ? "top-2.5 items-start" : "items-center"}`}
            >
              <i class={`${icon()} group-focus-within:hidden`} />
              <i
                class={`${activeIcon()} hidden text-blue-500 group-focus-within:block`}
              />
            </div>
            {multiline() ? (
              <textarea
                id={inputId}
                class={`input-subtle h-20 max-h-50 min-h-15 w-full p-2 pl-9 md:max-h-30 ${disabled() ? "cursor-not-allowed opacity-50" : ""}`}
                placeholder={props.placeholder}
                onChange={(e) => props.onChange?.(e.target.value.trim())}
                onInput={(e) => props.onInput?.(e.target.value.trim())}
                disabled={disabled()}
                aria-label={!props.label ? props.placeholder : undefined}
                aria-describedby={ariaDescribedBy}
                aria-invalid={!!props.error?.()}
                aria-required={props.required}
                aria-disabled={disabled()}
              >
                {props.value?.() ?? ""}
              </textarea>
            ) : (
              <input
                id={inputId}
                type={props.password ? "password" : "text"}
                class={`input-subtle w-full p-2 pl-9 ${disabled() ? "cursor-not-allowed opacity-50" : ""}`}
                placeholder={props.placeholder}
                value={props.value?.() ?? ""}
                onChange={(e) => props.onChange?.(e.target.value.trim())}
                onInput={(e) => props.onInput?.(e.target.value.trim())}
                disabled={disabled()}
                aria-label={!props.label ? props.placeholder : undefined}
                aria-describedby={ariaDescribedBy}
                aria-invalid={!!props.error?.()}
                aria-required={props.required}
                aria-disabled={disabled()}
              />
            )}
          </div>
        </div>
      )}
    </InputWrapper>
  );
};

export default TextInput;
