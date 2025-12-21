import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Star, MapPin, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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
}

export function HandymenPage({ onBack, onChat }: HandymenPageProps) {
  const [handymen, setHandymen] = useState<Handyman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const specialties = [
    { id: 'plumbing', label: 'سباكة', icon: '🔧' },
    { id: 'electrical', label: 'كهرباء', icon: '⚡' },
    { id: 'painting', label: 'دهان', icon: '🎨' },
    { id: 'cleaning', label: 'تنظيف', icon: '🧹' },
    { id: 'carpentry', label: 'نجارة', icon: '🪚' },
    { id: 'ac', label: 'تكييف', icon: '❄️' }
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

  // Sample handymen for demo
  const displayHandymen = handymen.length > 0 ? handymen : [
    {
      id: '1',
      user_id: '1',
      specialty: ['plumbing'],
      description: 'سباك محترف مع خبرة 10 سنوات في جميع أعمال السباكة',
      hourly_rate: 2000,
      rating: 4.8,
      total_reviews: 56,
      is_available: true,
      profiles: {
        full_name: 'أحمد بن علي',
        avatar_url: '',
        phone: '+213 555 123 456'
      }
    },
    {
      id: '2',
      user_id: '2',
      specialty: ['electrical'],
      description: 'كهربائي معتمد لجميع أعمال الكهرباء المنزلية والصناعية',
      hourly_rate: 2500,
      rating: 4.9,
      total_reviews: 89,
      is_available: true,
      profiles: {
        full_name: 'محمد الأمين',
        avatar_url: '',
        phone: '+213 555 789 012'
      }
    },
    {
      id: '3',
      user_id: '3',
      specialty: ['painting', 'carpentry'],
      description: 'دهان ونجار متخصص في التشطيبات الداخلية والديكور',
      hourly_rate: 1800,
      rating: 4.7,
      total_reviews: 34,
      is_available: true,
      profiles: {
        full_name: 'كريم مسعود',
        avatar_url: '',
        phone: '+213 555 345 678'
      }
    }
  ];

  const filteredHandymen = displayHandymen.filter(h => {
    const matchesSearch = !searchQuery || 
      h.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = !selectedSpecialty || h.specialty.includes(selectedSpecialty);
    
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">الحرفيون</h1>
        </div>

        {/* Search */}
        <div className="glass-card flex items-center gap-3 px-4 py-3 mb-4">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن حرفي..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            dir="auto"
          />
        </div>

        {/* Specialties Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          <button
            onClick={() => setSelectedSpecialty(null)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              !selectedSpecialty 
                ? 'bg-primary text-primary-foreground' 
                : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            الكل
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

      {/* Handymen List */}
      <div className="px-6 pb-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          filteredHandymen.map((handyman, index) => (
            <motion.div
              key={handyman.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-xl font-bold">
                    {handyman.profiles?.full_name?.charAt(0) || '?'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {handyman.profiles?.full_name || 'حرفي'}
                    </h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-foreground">{handyman.rating}</span>
                      <span className="text-muted-foreground">({handyman.total_reviews})</span>
                    </div>
                  </div>

                  {/* Specialties */}
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

                  {/* Price & Actions */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-primary font-medium">
                      {handyman.hourly_rate?.toLocaleString('ar-DZ')} دج/ساعة
                    </span>
                    <div className="flex gap-2">
                      <Button variant="glass" size="sm" className="gap-1">
                        <Phone className="w-4 h-4" />
                        <span>اتصال</span>
                      </Button>
                      <Button 
                        variant="gold" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => onChat(handyman.user_id)}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>محادثة</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
