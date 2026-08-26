import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { forwardRef, type SVGAttributes } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'signal' | 'amber' | 'sheen' | 'ice';
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const colorMap = {
  signal: 'text-signal',
  amber: 'text-amber',
  sheen: 'text-sheen',
  ice: 'text-ice',
};

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ size = 'md', variant = 'signal', className, ...props }, ref) => {
    const pxSize = sizeMap[size];

    return (
      <svg
        ref={ref}
        className={cn('animate-spin', colorMap[variant], className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        width={pxSize}
        height={pxSize}
        {...props}
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
);

Spinner.displayName = 'Spinner';

// Full-page loader with SAR scan animation
export const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss">
      <div className="flex flex-col items-center gap-6">
        <Spinner size="xl" variant="signal" />
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-sm text-ice tracking-wider">INITIALIZING</p>
          <p className="data-mono text-xs text-mute">Loading satellite data...</p>
        </div>
      </div>
    </div>
  );
};

// Inline loading state for buttons/cards
export const InlineLoader = ({ text = 'Loading...' }: { text?: string }) => {
  return (
    <div className="flex items-center gap-2 text-mute">
      <Spinner size="sm" />
      <span className="text-xs">{text}</span>
    </div>
  );
};
