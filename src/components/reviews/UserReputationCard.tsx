import { Star, Shield, Clock, ThumbsUp, Sparkles, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StarRating } from './StarRating';

interface UserReputationCardProps {
  avgRating: number;
  totalReviews: number;
  badges: string[];
  size?: 'compact' | 'full';
}

const badgeConfig: Record<string, { label: string; icon: any; color: string }> = {
  reliable_owner: { label: 'مالك موثوق', icon: Shield, color: 'bg-blue-500/20 text-blue-400' },
  responsive: { label: 'سريع الاستجابة', icon: Clock, color: 'bg-green-500/20 text-green-400' },
  fair_pricing: { label: 'أسعار عادلة', icon: ThumbsUp, color: 'bg-yellow-500/20 text-yellow-400' },
  well_maintained: { label: 'عقار محافظ عليه', icon: Home, color: 'bg-purple-500/20 text-purple-400' },
  clean_tenant: { label: 'مستأجر نظيف', icon: Sparkles, color: 'bg-cyan-500/20 text-cyan-400' },
  punctual_payment: { label: 'دفع منتظم', icon: Clock, color: 'bg-emerald-500/20 text-emerald-400' },
  respectful: { label: 'محترم', icon: ThumbsUp, color: 'bg-orange-500/20 text-orange-400' },
  trustworthy: { label: 'جدير بالثقة', icon: Shield, color: 'bg-indigo-500/20 text-indigo-400' },
};

export function UserReputationCard({ 
  avgRating, 
  totalReviews, 
  badges,
  size = 'full' 
}: UserReputationCardProps) {
  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <StarRating rating={Math.round(avgRating)} readonly size="sm" />
        <span className="text-sm text-muted-foreground">
          ({totalReviews})
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Rating Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
          <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <span>{totalReviews} تقييم</span>
        </div>
      </div>

      {/* Star Breakdown */}
      <StarRating rating={Math.round(avgRating)} readonly />

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {badges.map((badgeId) => {
            const config = badgeConfig[badgeId];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Badge 
                key={badgeId} 
                variant="outline"
                className={`gap-1.5 ${config.color}`}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Trust Score */}
      {totalReviews >= 5 && avgRating >= 4 && (
        <div className="flex items-center gap-2 pt-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">
            {avgRating >= 4.5 ? 'موثوق جداً' : 'موثوق'}
          </span>
        </div>
      )}
    </div>
  );
}
