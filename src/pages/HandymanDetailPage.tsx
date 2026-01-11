import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Star, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CalendarPlus,
  Clock,
  CheckCircle,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { BookHandymanDialog } from '@/components/handymen/BookHandymanDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Handyman {
  id: string;
  user_id: string;
  specialty: string[];
  description: string;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  service_area_km: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
    phone: string;
  };
}

interface HandymanDetailPageProps {
  handymanId: string;
  onBack: () => void;
  onChat: (userId: string) => void;
}

const specialties = [
  { id: 'plumbing', label: 'سباكة', icon: '🔧' },
  { id: 'electrical', label: 'كهرباء', icon: '⚡' },
  { id: 'painting', label: 'دهان', icon: '🎨' },
  { id: 'cleaning', label: 'تنظيف', icon: '🧹' },
  { id: 'carpentry', label: 'نجارة', icon: '🪚' },
  { id: 'ac', label: 'تكييف', icon: '❄️' }
];

export function HandymanDetailPage({ handymanId, onBack, onChat }: HandymanDetailPageProps) {
  const [handyman, setHandyman] = useState<Handyman | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedContracts, setCompletedContracts] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    fetchHandyman();
    fetchStats();
  }, [handymanId]);

  const fetchHandyman = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('handymen')
      .select(`
        *,
        profiles!handymen_user_id_fkey (
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq('id', handymanId)
      .single();

    if (!error && data) {
      setHandyman(data as unknown as Handyman);
    }
    setIsLoading(false);
  };

  const fetchStats = async () => {
    // Get completed contracts count for this handyman
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('handyman_id', handymanId)
      .eq('status', 'completed');

    setCompletedContracts(count || 0);
  };

  const getSpecialtyLabel = (specialty: string) => {
    const found = specialties.find(s => s.id === specialty);
    return found ? `${found.icon} ${found.label}` : specialty;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!handyman) {
    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <header className="px-6 pt-6 pb-4 flex items-center gap-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">الحرفي غير موجود</h1>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">تفاصيل الحرفي</h1>
      </motion.header>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 mb-6"
      >
        <div className="glass-card p-6 text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            {handyman.profiles?.avatar_url ? (
              <img 
                src={handyman.profiles.avatar_url} 
                alt={handyman.profiles.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-primary-foreground text-3xl font-bold">
                {handyman.profiles?.full_name?.charAt(0) || '?'}
              </span>
            )}
          </div>

          {/* Name & Status */}
          <h2 className="text-xl font-bold text-foreground mb-1">
            {handyman.profiles?.full_name || 'حرفي'}
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs ${
              handyman.is_available 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {handyman.is_available ? 'متاح الآن' : 'غير متاح'}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(handyman.rating)
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-foreground font-medium">{handyman.rating?.toFixed(1)}</span>
            <span className="text-muted-foreground">({handyman.total_reviews} تقييم)</span>
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {handyman.specialty.map(s => (
              <span key={s} className="px-3 py-1 bg-muted rounded-full text-sm text-foreground">
                {getSpecialtyLabel(s)}
              </span>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <Briefcase className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{completedContracts}</p>
              <p className="text-xs text-muted-foreground">عمل مكتمل</p>
            </div>
            <div className="text-center">
              <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{handyman.hourly_rate?.toLocaleString('ar-DZ')}</p>
              <p className="text-xs text-muted-foreground">دج/ساعة</p>
            </div>
            <div className="text-center">
              <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{handyman.service_area_km || 20}</p>
              <p className="text-xs text-muted-foreground">كم نطاق الخدمة</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-6 mb-6"
      >
        <div className="flex gap-3">
          <Button 
            variant="glass" 
            className="flex-1 gap-2"
            onClick={() => {
              if (handyman.profiles?.phone) {
                window.location.href = `tel:${handyman.profiles.phone}`;
              }
            }}
          >
            <Phone className="w-4 h-4" />
            <span>اتصال</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={() => onChat(handyman.user_id)}
          >
            <MessageSquare className="w-4 h-4" />
            <span>محادثة</span>
          </Button>
          <Button 
            variant="gold" 
            className="flex-1 gap-2"
            onClick={() => setShowBooking(true)}
          >
            <CalendarPlus className="w-4 h-4" />
            <span>حجز موعد</span>
          </Button>
        </div>
      </motion.div>

      {/* Tabs: About & Reviews */}
      <div className="px-6 pb-6">
        <Tabs defaultValue="about" dir="rtl">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="about" className="flex-1">عن الحرفي</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">التقييمات</TabsTrigger>
          </TabsList>

          <TabsContent value="about">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-4"
            >
              <h3 className="font-semibold text-foreground mb-3">الوصف</h3>
              <p className="text-muted-foreground leading-relaxed">
                {handyman.description || 'لا يوجد وصف متاح'}
              </p>

              {handyman.profiles?.phone && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="font-semibold text-foreground mb-2">معلومات الاتصال</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span dir="ltr">{handyman.profiles.phone}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsList userId={handyman.user_id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Dialog */}
      {showBooking && (
        <BookHandymanDialog
          open={showBooking}
          onOpenChange={setShowBooking}
          handyman={handyman}
        />
      )}
    </div>
  );
}
