import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { forwardRef, type HTMLAttributes } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  variant?: 'default' | 'elevated' | 'subtle';
}

const variantStyles = {
  default: 'bg-deep border-steel',
  elevated: 'bg-deep border-steel shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
  subtle: 'bg-steel/50 border-steel/50',
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ title, subtitle, headerAction, children, className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[var(--radius-lg)] border',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {(title || headerAction) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-steel/50">
            <div>
              {title && (
                <h3 className="font-display font-semibold text-ice text-sm tracking-wide">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-mute mt-0.5">{subtitle}</p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';

// Card - simpler container for content blocks
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-steel/60 border border-steel-hover rounded-[var(--radius-md)] p-4',
          'hover:border-steel-hover/80 transition-colors',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
