interface ConstanteRowProps {
  label: string;
  value: number | undefined;
  unite: string;
}

export default function ConstanteRow({ label, value, unite }: ConstanteRowProps) {
  if (value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-outline-variant)] last:border-0">
      <span className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>{label}</span>
      <span className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
        {value} <span className="font-normal text-caption">{unite}</span>
      </span>
    </div>
  );
}
