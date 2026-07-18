// Composant Select — Design system DMPI
import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, id, className = "", options, placeholder, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {label && (
          <label
            htmlFor={selectId}
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
          <select
            ref={ref}
            id={selectId}
            className={[
              "w-full rounded-xl text-body-md transition-all duration-200 appearance-none",
              "border bg-[var(--color-surface-container-lowest)] pl-4 pr-10 py-3",
              "focus:outline-none focus:ring-2 focus:border-transparent",
              error
                ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                : "border-[var(--color-outline-variant)] focus:ring-[var(--color-primary)]",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ color: "var(--color-on-surface)" }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] pointer-events-none"
            style={{ color: "var(--color-outline)" }}
          >
            expand_more
          </span>
        </div>

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

Select.displayName = "Select";
export default Select;
