import { useEffect, useState } from 'react';
import { Star, BadgeCheck, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { supabase } from '@/integrations/supabase/client';

interface OwnerInfoCardProps {
  ownerId: string;
}

interface OwnerInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_verified: boolean | null;
  avg_rating: number | null;
  total_reviews: number | null;
  reputation_badges: string[] | null;
}

export function OwnerInfoCard({ ownerId }: OwnerInfoCardProps) {
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('public_profiles')
        .select('user_id, full_name, avatar_url, kyc_verified, avg_rating, total_reviews, reputation_badges')
        .eq('user_id', ownerId)
        .maybeSingle();
      if (!cancelled) {
        setOwner(data as OwnerInfo | null);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (loading || !owner) return null;

  const rating = Number(owner.avg_rating || 0);
  const reviews = owner.total_reviews || 0;

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {owner.avatar_url ? (
              <img src={owner.avatar_url} alt={owner.full_name ?? ''} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium truncate">{owner.full_name || 'مالك'}</span>
              {owner.kyc_verified && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                {rating.toFixed(1)}
              </span>
              <span>·</span>
              <span>{reviews} تقييم</span>
            </div>
            {owner.reputation_badges && owner.reputation_badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {owner.reputation_badges.slice(0, 3).map((b) => (
                  <Badge key={b} variant="secondary" className="text-[10px] py-0 px-1.5">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                التقييمات
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تقييمات {owner.full_name || 'المالك'}</DialogTitle>
              </DialogHeader>
              <ReviewsList userId={owner.user_id} />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
