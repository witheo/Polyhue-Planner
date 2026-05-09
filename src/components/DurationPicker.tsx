import { MIN_TASK_DURATION_MINUTES, sanitizeDurationDigits } from '../domain/durations';

type Props = {
  /** Raw digits shown in the field (may be "" while editing). */
  value: string;
  onChange: (next: string) => void;
  id?: string;
  disabled?: boolean;
  /** Overrides the default “Minutes (min …)” label. */
  fieldLabel?: string;
};

export function DurationPicker({ value, onChange, id, disabled, fieldLabel }: Props) {
  const label =
    fieldLabel ?? `Minutes (min ${MIN_TASK_DURATION_MINUTES})`;
  return (
    <label className="ph-field" htmlFor={id}>
      <span className="ph-field__label">{label}</span>
      <input
        id={id}
        className="ph-input"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(sanitizeDurationDigits(e.target.value))}
      />
    </label>
  );
}
