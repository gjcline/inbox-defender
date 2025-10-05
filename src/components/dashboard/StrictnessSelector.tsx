import { Strictness } from '../../hooks/useStrictness';

interface StrictnessSelectorProps {
  value: Strictness;
  onChange: (value: Strictness) => void;
  helperText?: string;
}

export const StrictnessSelector = ({ value, onChange, helperText }: StrictnessSelectorProps) => {
  const options: Strictness[] = ['LOW', 'MEDIUM', 'HIGH'];

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${
                value === option
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>
      {helperText && (
        <p className="text-sm text-zinc-400">{helperText}</p>
      )}
    </div>
  );
};
