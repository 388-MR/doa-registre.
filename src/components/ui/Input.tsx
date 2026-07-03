import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from 'react';

const inputBase = `
  w-full bg-dark-800 border border-dark-600 rounded-lg
  px-4 py-2.5 text-gray-100 placeholder-gray-500
  focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
  transition-all duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
`;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftElement, rightElement, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftElement && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            className={`${inputBase} ${leftElement ? 'pl-10' : ''} ${rightElement ? 'pr-10' : ''} ${
              error ? 'border-danger-500 focus:ring-danger-500/50 focus:border-danger-500' : ''
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-danger-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${inputBase} min-h-24 resize-y ${
            error ? 'border-danger-500 focus:ring-danger-500/50 focus:border-danger-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`${inputBase} appearance-none cursor-pointer ${
            error ? 'border-danger-500 focus:ring-danger-500/50 focus:border-danger-500' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-danger-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-sm font-medium text-gray-400 mb-1.5 ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';
