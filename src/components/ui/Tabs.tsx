import { useState, createContext, useContext, ReactNode, HTMLAttributes } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  defaultValue: string;
  onChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({ defaultValue, onChange, children, className = '', ...props }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultValue);

  const setActiveTab = (value: string) => {
    setActiveTabState(value);
    onChange?.(value);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TabsList({ children, className = '', ...props }: TabsListProps) {
  return (
    <div
      className={`flex gap-1 p-1 bg-dark-800 rounded-lg border border-dark-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function TabsTrigger({ value, children, icon, className = '', ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.activeTab === value;

  return (
    <button
      className={`
        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
        transition-all duration-150
        ${
          isActive
            ? 'bg-dark-700 text-gray-100 shadow-md'
            : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'
        }
        ${className}
      `}
      onClick={() => context.setActiveTab(value)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export function TabsContent({ value, children, className = '', ...props }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.activeTab !== value) return null;

  return (
    <div className={`animate-fade-in ${className}`} {...props}>
      {children}
    </div>
  );
}
