import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { forwardRef, type HTMLAttributes } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BadgeVariant = 'default' | 'signal' | 'amber' | 'sheen' | 'mute';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-steel text-mute border-steel-hover',
  signal: 'bg-signal/10 text-signal border-signal/40 glow-signal-sm',
  amber: 'bg-amber/10 text-amber border-amber/40',
  sheen: 'bg-sheen/10 text-sheen border-sheen/40 glow-sheen',
  mute: 'bg-steel/50 text-mute-dim border-steel',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-mute',
  signal: 'bg-signal',
  amber: 'bg-amber',
  sheen: 'bg-sheen',
  mute: 'bg-mute-dim',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', dot, children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          'text-xs font-medium border',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Tag - smaller, more compact label
export const Tag = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)]',
          'text-[10px] uppercase tracking-wider font-semibold border',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Tag.displayName = 'Tag';
