import { DURATION_STEP_MINUTES, MIN_TASK_DURATION_MINUTES } from '../domain/durations';

type Props = {
  value: number;
  onChange: (minutes: number) => void;
  id?: string;
};

export function DurationPicker({ value, onChange, id }: Props) {
  return (
    <label className="ph-field" htmlFor={id}>
      <span className="ph-field__label">Minutes (min {MIN_TASK_DURATION_MINUTES})</span>
      <input
        id={id}
        className="ph-input"
        type="number"
        min={MIN_TASK_DURATION_MINUTES}
        step={DURATION_STEP_MINUTES}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : MIN_TASK_DURATION_MINUTES);
        }}
      />
    </label>
  );
}
