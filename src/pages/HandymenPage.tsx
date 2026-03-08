import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Search, Star, Phone, MessageSquare, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BookHandymanDialog } from '@/components/handymen/BookHandymanDialog';
import { HandymanCardSkeleton } from '@/components/common/HandymanCardSkeleton';
import { useLanguage } from '@/i18n/LanguageContext';

interface Handyman {
  id: string;
  user_id: string;
  specialty: string[];
  description: string;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
    phone: string;
  };
}

interface HandymenPageProps {
  onBack: () => void;
  onChat: (userId: string) => void;
  onViewHandyman?: (handymanId: string) => void;
}

export function HandymenPage({ onBack, onChat, onViewHandyman }: HandymenPageProps) {
  const [handymen, setHandymen] = useState<Handyman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [bookingHandyman, setBookingHandyman] = useState<Handyman | null>(null);
  const { t, dir } = useLanguage();

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const specialties = [
    { id: 'plumbing', label: t.handymenPage.plumbing, icon: '🔧' },
    { id: 'electrical', label: t.handymenPage.electrical, icon: '⚡' },
    { id: 'painting', label: t.handymenPage.painting, icon: '🎨' },
    { id: 'cleaning', label: t.handymenPage.cleaning, icon: '🧹' },
    { id: 'carpentry', label: t.handymenPage.carpentry, icon: '🪚' },
    { id: 'ac', label: t.handymenPage.ac, icon: '❄️' }
  ];

  useEffect(() => {
    fetchHandymen();
  }, []);

  const fetchHandymen = async () => {
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
      .eq('is_available', true)
      .order('rating', { ascending: false });
    
    if (!error && data) {
      setHandymen(data as unknown as Handyman[]);
    }
    setIsLoading(false);
  };

  const getSpecialtyLabel = (specialty: string) => {
    const found = specialties.find(s => s.id === specialty);
    return found ? found.label : specialty;
  };

  const filteredHandymen = handymen.filter(h => {
    const matchesSearch = !searchQuery || 
      h.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = !selectedSpecialty || h.specialty.includes(selectedSpecialty);
    
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <BackArrow className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">{t.handymenPage.title}</h1>
        </div>

        <div className="glass-card flex items-center gap-3 px-4 py-3 mb-4">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.handymenPage.searchPlaceholder}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            dir="auto"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          <button
            onClick={() => setSelectedSpecialty(null)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              !selectedSpecialty 
                ? 'bg-primary text-primary-foreground' 
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.all}
          </button>
          {specialties.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSpecialty(s.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedSpecialty === s.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'glass-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </motion.header>

      <div className="px-6 pb-6 space-y-4">
        {isLoading ? (
          <>
            <HandymanCardSkeleton />
            <HandymanCardSkeleton />
            <HandymanCardSkeleton />
          </>
        ) : (
          filteredHandymen.map((handyman, index) => (
            <motion.div
              key={handyman.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 cursor-pointer"
              onClick={() => onViewHandyman?.(handyman.id)}
            >
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-xl font-bold">
                    {handyman.profiles?.full_name?.charAt(0) || '?'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {handyman.profiles?.full_name || t.handymenPage.handyman}
                    </h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-foreground">{handyman.rating}</span>
                      <span className="text-muted-foreground">({handyman.total_reviews})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {handyman.specialty.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                        {getSpecialtyLabel(s)}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {handyman.description}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-primary font-medium">
                      {handyman.hourly_rate?.toLocaleString()} {t.perHour}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="glass" size="sm" className="gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{t.handymenPage.call}</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={(e) => { e.stopPropagation(); onChat(handyman.user_id); }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{t.handymenPage.chat}</span>
                      </Button>
                      <Button 
                        variant="gold" 
                        size="sm" 
                        className="gap-1"
                        onClick={(e) => { e.stopPropagation(); setBookingHandyman(handyman); }}
                      >
                        <CalendarPlus className="w-4 h-4" />
                        <span>{t.handymenPage.book}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {bookingHandyman && (
        <BookHandymanDialog
          open={!!bookingHandyman}
          onOpenChange={(open) => !open && setBookingHandyman(null)}
          handyman={bookingHandyman}
        />
      )}
    </div>
  );
}