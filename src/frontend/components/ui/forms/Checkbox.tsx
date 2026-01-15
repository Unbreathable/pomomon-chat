import { createUniqueId } from "solid-js";

/**
 * Checkbox/Boolean input component
 * @param label - Text displayed next to checkbox
 * @param description - Optional description text below
 * @param value - Reactive boolean value getter
 * @param onChange - Called when checkbox state changes
 * @param error - Reactive error message getter
 * @param required - Show required asterisk
 * @param disabled - Disable the checkbox
 */
const CheckboxInput = ({
  label,
  description,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
}: {
  label?: string;
  description?: string;
  value?: () => boolean | undefined;
  onChange?: (checked: boolean) => void;
  error?: () => string | undefined;
  required?: boolean;
  disabled?: boolean;
}) => {
  const inputId = createUniqueId();

  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-row items-center gap-2">
        <input
          id={inputId}
          type="checkbox"
          checked={value?.() || false}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          aria-required={required}
          aria-invalid={!!error?.()}
          aria-describedby={error?.() ? `${inputId}-error` : undefined}
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {label && (
          <label
            for={inputId}
            class={`text-xs ${disabled ? "opacity-50" : "cursor-pointer"}`}
          >
            {label}
            {required && (
              <span class="ml-0.5 text-red-500" aria-label="erforderlich">
                *
              </span>
            )}
          </label>
        )}
      </div>

      {description && <p class="text-dimmed ml-6 text-xs">{description}</p>}

      {error?.() && (
        <p
          id={`${inputId}-error`}
          class="ml-6 text-sm text-red-500"
          role="alert"
          aria-live="polite"
        >
          {error()}
        </p>
      )}
    </div>
  );
};

export default CheckboxInput;
