type Props = {
  value: number;
  onChange: (minutes: number) => void;
  id?: string;
};

export function DurationPicker({ value, onChange, id }: Props) {
  return (
    <label className="ph-field" htmlFor={id}>
      <span className="ph-field__label">Minutes</span>
      <input
        id={id}
        className="ph-input"
        type="number"
        min={5}
        step={5}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 5);
        }}
      />
    </label>
  );
}
