import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StarRating } from './StarRating';
import { Star, Loader2, CheckCircle, Clock, Shield, Sparkles, ThumbsUp, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReviewDialogProps {
  contractId: string;
  reviewedId: string;
  reviewedName: string;
  reviewerRole: 'owner' | 'tenant';
  onSuccess?: () => void;
}

const ownerBadges = [
  { id: 'reliable_owner', label: 'مالك موثوق', icon: Shield },
  { id: 'responsive', label: 'سريع الاستجابة', icon: Clock },
  { id: 'fair_pricing', label: 'أسعار عادلة', icon: ThumbsUp },
  { id: 'well_maintained', label: 'عقار محافظ عليه', icon: Home },
];

const tenantBadges = [
  { id: 'clean_tenant', label: 'مستأجر نظيف', icon: Sparkles },
  { id: 'punctual_payment', label: 'دفع منتظم', icon: Clock },
  { id: 'respectful', label: 'محترم', icon: ThumbsUp },
  { id: 'trustworthy', label: 'جدير بالثقة', icon: Shield },
];

export function ReviewDialog({ 
  contractId, 
  reviewedId, 
  reviewedName, 
  reviewerRole,
  onSuccess 
}: ReviewDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  const badges = reviewerRole === 'owner' ? tenantBadges : ownerBadges;

  const toggleBadge = (badgeId: string) => {
    setSelectedBadges(prev => 
      prev.includes(badgeId) 
        ? prev.filter(b => b !== badgeId)
        : [...prev, badgeId]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (rating === 0) {
      toast.error('يرجى اختيار تقييم');
      return;
    }

    setLoading(true);
    try {
      // Insert review
      const { error: reviewError } = await supabase.from('reviews').insert({
        contract_id: contractId,
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        reviewer_role: reviewerRole,
        rating,
        comment: comment.trim() || null,
        badges: selectedBadges.length > 0 ? selectedBadges : null,
      });

      if (reviewError) throw reviewError;

      // Update the reviewed user's profile with new average rating
      const { data: reviews, error: fetchError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', reviewedId);

      if (!fetchError && reviews) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        // Collect all badges for this user
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('badges')
          .eq('reviewed_id', reviewedId);
        
        const allBadges = new Set<string>();
        allReviews?.forEach(r => {
          r.badges?.forEach((b: string) => allBadges.add(b));
        });

        await supabase
          .from('profiles')
          .update({
            avg_rating: Math.round(avgRating * 10) / 10,
            total_reviews: reviews.length,
            reputation_badges: Array.from(allBadges)
          })
          .eq('user_id', reviewedId);
      }

      toast.success('تم إرسال التقييم بنجاح');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('حدث خطأ أثناء إرسال التقييم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Star className="h-4 w-4" />
          تقييم
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">تقييم {reviewedName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">كيف كانت تجربتك؟</p>
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            <p className="text-sm font-medium">
              {rating === 1 && 'سيء'}
              {rating === 2 && 'مقبول'}
              {rating === 3 && 'جيد'}
              {rating === 4 && 'جيد جداً'}
              {rating === 5 && 'ممتاز'}
            </p>
          </div>

          {/* Badges */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">اختر الشارات المناسبة</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {badges.map((badge) => {
                const Icon = badge.icon;
                const isSelected = selectedBadges.includes(badge.id);
                return (
                  <Badge
                    key={badge.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer gap-1 py-1.5 px-3 transition-all ${
                      isSelected ? 'bg-primary' : 'hover:bg-primary/10'
                    }`}
                    onClick={() => toggleBadge(badge.id)}
                  >
                    <Icon className="h-3 w-3" />
                    {badge.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">تعليق (اختياري)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شاركنا تجربتك..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            disabled={loading || rating === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 ml-2" />
                إرسال التقييم
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
