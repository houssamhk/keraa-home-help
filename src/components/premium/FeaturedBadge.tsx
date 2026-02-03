import { Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedBadgeProps {
  type?: 'top_results' | 'highlighted' | 'premium_badge';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FeaturedBadge({ 
  type = 'top_results', 
  size = 'sm',
  className 
}: FeaturedBadgeProps) {
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

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
        'shadow-lg shadow-primary/30',
        sizeClasses[size],
        className
      )}
    >
      {type === 'top_results' ? (
        <Sparkles className={iconSizes[size]} />
      ) : (
        <Star className={iconSizes[size]} />
      )}
      <span>مميز</span>
    </div>
  );
}
