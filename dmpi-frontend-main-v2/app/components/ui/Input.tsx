// Composant Input — Design system DMPI
import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingIconClick?: () => void;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leadingIcon,
      trailingIcon,
      onTrailingIconClick,
      required,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-label-bold"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {label}
            {required && (
              <span className="ml-0.5" style={{ color: "var(--color-error)" }}>
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leadingIcon && (
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] pointer-events-none"
              style={{ color: "var(--color-outline)" }}
            >
              {leadingIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full rounded-xl text-body-md transition-all duration-200",
              "border bg-[var(--color-surface-container-lowest)]",
              "placeholder:text-[var(--color-outline)]",
              "focus:outline-none focus:ring-2 focus:border-transparent",
              leadingIcon ? "pl-10" : "pl-4",
              trailingIcon ? "pr-10" : "pr-4",
              "py-3",
              error
                ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                : "border-[var(--color-outline-variant)] focus:ring-[var(--color-primary)]",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ color: "var(--color-on-surface)" }}
            {...props}
          />

          {trailingIcon && (
            <button
              type="button"
              onClick={onTrailingIconClick}
              className={[
                "absolute right-1 top-1/2 -translate-y-1/2 p-2",
                "material-symbols-outlined text-[20px]",
                onTrailingIconClick ? "cursor-pointer hover:opacity-70" : "cursor-default pointer-events-none",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ color: "var(--color-outline)", fontFamily: "'Material Symbols Outlined'" }}
              tabIndex={onTrailingIconClick ? 0 : -1}
            >
              {trailingIcon}
            </button>
          )}
        </div>

        {error && (
          <p
            className="text-caption flex items-center gap-1"
            style={{ color: "var(--color-error)" }}
          >
            <span className="material-symbols-outlined text-[14px]">error</span>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-caption" style={{ color: "var(--color-outline)" }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
