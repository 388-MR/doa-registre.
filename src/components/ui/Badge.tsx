import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
}

const variants = {
  primary: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
  success: 'bg-success-500/20 text-success-400 border border-success-500/30',
  warning: 'bg-warning-500/20 text-warning-400 border border-warning-500/30',
  danger: 'bg-danger-500/20 text-danger-400 border border-danger-500/30',
  neutral: 'bg-dark-600 text-gray-300 border border-dark-500',
  accent: 'bg-accent-500/20 text-accent-400 border border-accent-500/30',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'sm', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'closed' | 'open' | 'pending' | 'archived';
}

const statusVariants: Record<string, BadgeProps['variant']> = {
  active: 'success',
  inactive: 'neutral',
  closed: 'neutral',
  open: 'primary',
  pending: 'warning',
  archived: 'neutral',
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className = '', ...props }, ref) => {
    const statusLabels: Record<string, string> = {
      active: 'Actif',
      inactive: 'Inactif',
      closed: 'Fermé',
      open: 'Ouvert',
      pending: 'En attente',
      archived: 'Archivé',
    };

    return (
      <Badge
        ref={ref}
        variant={statusVariants[status] || 'neutral'}
        className={className}
        {...props}
      >
        {statusLabels[status] || status}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

interface ThreatBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  level: number;
}

export const ThreatBadge = forwardRef<HTMLSpanElement, ThreatBadgeProps>(
  ({ level, className = '', ...props }, ref) => {
    const colors: Record<number, string> = {
      1: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      2: 'bg-success-500/20 text-success-400 border-success-500/30',
      3: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
      4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      5: 'bg-danger-500/20 text-danger-400 border-danger-500/30',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[level] || colors[1]} ${className}`}
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Niveau {level}
      </span>
    );
  }
);

ThreatBadge.displayName = 'ThreatBadge';

interface DangerBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  level: number;
}

export const DangerBadge = forwardRef<HTMLSpanElement, DangerBadgeProps>(
  ({ level, className = '', ...props }, ref) => {
    const colors: Record<number, string> = {
      1: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      2: 'bg-success-500/20 text-success-400 border-success-500/30',
      3: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
      4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      5: 'bg-danger-500/20 text-danger-400 border-danger-500/30',
    };

    const labels: Record<number, string> = {
      1: 'Faible',
      2: 'Modéré',
      3: 'Élevé',
      4: 'Très élevé',
      5: 'Extrême',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[level] || colors[1]} ${className}`}
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {labels[level] || 'Inconnu'}
      </span>
    );
  }
);

DangerBadge.displayName = 'DangerBadge';
