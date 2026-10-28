import { BADGE_SWATCHES } from '../domain/taskBadge';

type ColorSwatchPickerProps = {
  /** Selected swatch, or null when nothing is chosen (caller falls back to its default). */
  value: string | null;
  onChange: (color: string | null) => void;
  label: string;
};

/** Compact preset swatches; clicking the selected swatch again clears the choice. */
export function ColorSwatchPicker({ value, onChange, label }: ColorSwatchPickerProps) {
  return (
    <div className="ph-swatch-picker" role="group" aria-label={label}>
      {BADGE_SWATCHES.map((c) => {
        const selected = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            className={'ph-swatch' + (selected ? ' ph-swatch--selected' : '')}
            style={{ background: c }}
            aria-label={`${label} ${c}`}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : c)}
          />
        );
      })}
    </div>
  );
}
