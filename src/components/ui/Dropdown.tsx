import { HTMLAttributes, forwardRef } from 'react';

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`absolute z-50 mt-1 min-w-48 py-1 bg-dark-800 border border-dark-600 rounded-lg shadow-elevated animate-scale-in origin-top-left ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

interface DropdownItemProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
}

export const DropdownItem = forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ children, icon, danger, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm cursor-pointer
          transition-colors duration-150
          ${
            danger
              ? 'text-danger-400 hover:bg-danger-500/10 hover:text-danger-300'
              : 'text-gray-300 hover:bg-dark-700 hover:text-gray-100'
          }
          ${className}
        `}
        {...props}
      >
        {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
        {children}
      </div>
    );
  }
);

DropdownItem.displayName = 'DropdownItem';

export const DropdownDivider = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return <div ref={ref} className={`my-1 border-t border-dark-600 ${className}`} {...props} />;
  }
);

DropdownDivider.displayName = 'DropdownDivider';

interface DropdownLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const DropdownLabel = forwardRef<HTMLDivElement, DropdownLabelProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DropdownLabel.displayName = 'DropdownLabel';
