import { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from './StarRating';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  badges: string[] | null;
  created_at: string;
  reviewer_id: string;
  reviewer_role: string;
  reviewer_name?: string;
}

interface ReviewsListProps {
  userId: string;
}

const badgeLabels: Record<string, string> = {
  reliable_owner: 'مالك موثوق',
  responsive: 'سريع الاستجابة',
  fair_pricing: 'أسعار عادلة',
  well_maintained: 'عقار محافظ عليه',
  clean_tenant: 'مستأجر نظيف',
  punctual_payment: 'دفع منتظم',
  respectful: 'محترم',
  trustworthy: 'جدير بالثقة',
};

export function ReviewsList({ userId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewed_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch reviewer names
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', reviewerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      setReviews(data.map(r => ({
        ...r,
        reviewer_name: profileMap.get(r.reviewer_id) || 'مستخدم'
      })));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>لا توجد تقييمات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium">{review.reviewer_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), { 
                      addSuffix: true, 
                      locale: ar 
                    })}
                  </span>
                </div>
                
                <StarRating rating={review.rating} readonly size="sm" />
                
                {review.comment && (
                  <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                )}
                
                {review.badges && review.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {review.badges.map((badge) => (
                      <Badge key={badge} variant="secondary" className="text-xs">
                        {badgeLabels[badge] || badge}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
