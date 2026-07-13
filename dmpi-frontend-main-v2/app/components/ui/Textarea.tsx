// Composant Textarea — Design system DMPI
import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, id, className = "", rows = 4, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {label && (
          <label
            htmlFor={textareaId}
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

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={[
            "w-full rounded-xl text-body-md transition-all duration-200 resize-y",
            "border bg-[var(--color-surface-container-lowest)] px-4 py-3",
            "placeholder:text-[var(--color-outline)]",
            "focus:outline-none focus:ring-2 focus:border-transparent",
            error
              ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
              : "border-[var(--color-outline-variant)] focus:ring-[var(--color-primary)]",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ color: "var(--color-on-surface)" }}
          {...props}
        />

        {error && (
          <p className="text-caption flex items-center gap-1" style={{ color: "var(--color-error)" }}>
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

Textarea.displayName = "Textarea";
export default Textarea;
