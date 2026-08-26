import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue, valueFormat, className, value, min = 0, max = 100, ...props }, ref) => {
    const percentage = ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100;

    return (
      <div className={cn('w-full', className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            {label && <span className="text-xs font-medium text-mute">{label}</span>}
            {showValue && (
              <span className="text-xs data-mono text-signal">
                {valueFormat ? valueFormat(Number(value)) : value}
              </span>
            )}
          </div>
        )}
        <div className="relative w-full h-4 flex items-center">
          <div className="absolute w-full h-1 bg-steel rounded-full" />
          <div
            className="absolute h-1 bg-signal/60 rounded-full"
            style={{ width: `${percentage}%` }}
          />
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            value={value}
            className="absolute w-full h-full opacity-0 cursor-pointer"
            {...props}
          />
          <div
            className={cn(
              'absolute w-3 h-3 bg-deep border-2 border-signal rounded-full',
              'shadow-[0_0_8px_rgba(56,225,208,0.5)]',
              'pointer-events-none transition-all duration-100'
            )}
            style={{ left: `calc(${percentage}% - 6px)` }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
