import { forwardRef, type SelectHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, placeholder, error, className, ...props }, ref) => {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label className="block text-xs font-medium text-mute mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full h-10 px-3 pr-10',
              'bg-steel/50 border border-steel-hover rounded-[var(--radius-md)]',
              'text-ice text-sm',
              'focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'appearance-none cursor-pointer'
            )}
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
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none"
          />
        </div>
        {error && <p className="mt-1 text-xs text-amber">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
