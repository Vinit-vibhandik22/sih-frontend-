import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TelemetryProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'signal' | 'amber' | 'sheen';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: 'text-ice',
  signal: 'text-signal',
  amber: 'text-amber',
  sheen: 'text-sheen',
};

const sizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const Telemetry = ({ label, value, unit, variant = 'default', size = 'md', className }: TelemetryProps) => {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[10px] uppercase tracking-wider text-mute-dim font-medium">
        {label}
      </span>
      <span className={cn('data-mono font-medium', variantStyles[variant], sizeStyles[size])}>
        {displayValue}
        {unit && <span className="text-mute ml-1">{unit}</span>}
      </span>
    </div>
  );
};

// Grouped telemetry display for related metrics
interface TelemetryGroupProps {
  label: string;
  items: Array<{ label: string; value: string | number; unit?: string }>;
  className?: string;
}

export const TelemetryGroup = ({ label, items, className }: TelemetryGroupProps) => {
  return (
    <div className={cn('bg-steel/40 border border-steel/50 rounded-[var(--radius-md)] p-3', className)}>
      <p className="text-[10px] uppercase tracking-wider text-mute mb-2 font-medium">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <Telemetry key={i} label={item.label} value={item.value} unit={item.unit} size="sm" />
        ))}
      </div>
    </div>
  );
};

// Live telemetry with blinking indicator
interface LiveTelemetryProps extends TelemetryProps {
  isLive?: boolean;
  updateInterval?: string;
}

export const LiveTelemetry = ({ isLive = true, updateInterval, ...props }: LiveTelemetryProps) => {
  return (
    <div className="flex items-start gap-2">
      {isLive && (
        <span className="relative flex h-2 w-2 mt-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-signal" />
        </span>
      )}
      <div className="flex-1">
        <Telemetry {...props} />
        {updateInterval && (
          <p className="text-[9px] text-mute-dim mt-0.5">Last updated {updateInterval}</p>
        )}
      </div>
    </div>
  );
};
