import { useState, createContext, useContext, type ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tabs Context
interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within <Tabs>');
  }
  return context;
}

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const Tabs = ({ children, defaultValue, value, onChange, className }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const activeValue = value !== undefined ? value : internalValue;

  const setActiveValue = (newValue: string) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabListProps {
  children: ReactNode;
  className?: string;
}

export const TabList = ({ children, className }: TabListProps) => {
  return (
    <div className={cn('flex border-b border-steel/50', className)}>
      {children}
    </div>
  );
};

interface TabTriggerProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const TabTrigger = ({ value, children, icon, className }: TabTriggerProps) => {
  const { activeValue, setActiveValue } = useTabs();
  const isActive = activeValue === value;

  return (
    <button
      value={value}
      onClick={() => setActiveValue(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-all duration-150',
        'border-b-2 -mb-px flex items-center gap-2',
        isActive
          ? 'border-signal text-signal'
          : 'border-transparent text-mute hover:text-ice-dim hover:border-steel',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
};

interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabContent = ({ value, children, className }: TabContentProps) => {
  const { activeValue } = useTabs();
  if (activeValue !== value) return null;

  return <div className={cn('pt-4', className)}>{children}</div>;
};
