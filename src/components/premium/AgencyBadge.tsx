import { Building2, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgencyBadgeProps {
  packageName?: 'basic' | 'professional' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function AgencyBadge({ 
  packageName = 'basic',
  size = 'sm',
  showLabel = true,
  className 
}: AgencyBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const packageStyles = {
    basic: {
      bg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      icon: <Building2 className={iconSizes[size]} />,
      label: 'وكالة'
    },
    professional: {
      bg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      icon: <Shield className={iconSizes[size]} />,
      label: 'وكالة موثقة'
    },
    premium: {
      bg: 'bg-gradient-to-r from-primary/20 to-yellow-500/20 text-primary border border-primary/30',
      icon: <Crown className={iconSizes[size]} />,
      label: 'وكالة مميزة'
    }
  };

  const style = packageStyles[packageName];

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        style.bg,
        sizeClasses[size],
        className
      )}
    >
      {style.icon}
      {showLabel && <span>{style.label}</span>}
    </div>
  );
}
