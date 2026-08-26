import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Toggle Switch component
interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  checked: boolean;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className, checked, ...props }, ref) => {
    return (
      <label className={cn('inline-flex items-center gap-3 cursor-pointer', className)}>
        <input
          ref={ref}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          {...props}
        />
        <div
          className={cn(
            'relative w-10 h-5 rounded-full transition-all duration-200',
            'bg-steel peer-checked:bg-signal/30',
            'border border-steel-hover peer-checked:border-signal',
            'after:absolute after:top-0.5 after:left-0.5',
            'after:w-4 after:h-4 after:rounded-full after:bg-mute',
            'after:transition-all after:duration-200',
            'peer-checked:after:translate-x-5 peer-checked:after:bg-signal',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-deep'
          )}
        />
        {label && <span className="text-sm text-ice">{label}</span>}
      </label>
    );
  }
);

Switch.displayName = 'Switch';

// Toggle Button group
interface ToggleGroupProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ToggleGroup = ({ options, value, onChange, className }: ToggleGroupProps) => {
  return (
    <div className={cn('inline-flex p-1 bg-steel/50 rounded-[var(--radius-md)] border border-steel', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-all duration-150',
            'flex items-center gap-1.5',
            value === opt.value
              ? 'bg-steel-hover text-ice'
              : 'text-mute hover:text-ice-dim'
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
};
