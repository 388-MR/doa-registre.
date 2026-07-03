import { HTMLAttributes, forwardRef } from 'react';
import { FileX, Loader2 } from 'lucide-react';

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
        {...props}
      >
        <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4 text-gray-500">
          {icon || <FileX className="w-8 h-8" />}
        </div>
        <h3 className="text-lg font-medium text-gray-100 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
        )}
        {action}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export function LoadingState({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-dark-950 flex items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Chargement...</p>
      </div>
    </div>
  );
}

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, className = '', style, ...props }, ref) => {
    const variantClasses = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    return (
      <div
        ref={ref}
        className={`bg-dark-700 animate-pulse ${variantClasses[variant]} ${className}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export function CardSkeleton() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton width="40%" className="mb-2" />
          <Skeleton width="80%" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton />
        <Skeleton width="70%" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-lg overflow-hidden">
      <div className="bg-dark-800 p-4 flex gap-4">
        <Skeleton width={200} />
        <Skeleton width={150} />
        <Skeleton width={100} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex gap-4 border-t border-dark-700">
          <Skeleton width={200} />
          <Skeleton width={150} />
          <Skeleton width={100} />
        </div>
      ))}
    </div>
  );
}
