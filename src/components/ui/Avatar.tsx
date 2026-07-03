import { HTMLAttributes, forwardRef } from 'react';
import { User } from 'lucide-react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative flex items-center justify-center rounded-full bg-dark-700 text-gray-300 font-medium overflow-hidden ${sizes[size]} ${className}`}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2 text-gray-500" />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  avatars: { src?: string | null; name?: string | null }[];
  max?: number;
  size?: AvatarProps['size'];
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ avatars, max = 4, size = 'sm', className = '', ...props }, ref) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    return (
      <div ref={ref} className={`flex -space-x-2 ${className}`} {...props}>
        {visibleAvatars.map((avatar, index) => (
          <Avatar
            key={index}
            src={avatar.src}
            name={avatar.name}
            size={size}
            className="ring-2 ring-dark-900"
          />
        ))}
        {remainingCount > 0 && (
          <div
            className={`relative flex items-center justify-center rounded-full bg-dark-600 text-gray-400 font-medium ring-2 ring-dark-900 ${sizes[size]}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';
