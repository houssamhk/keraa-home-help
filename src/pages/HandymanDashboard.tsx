import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Edit, 
  Star, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  TrendingUp,
  DollarSign,
  MapPin,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LocationPicker } from '@/components/map/LocationPicker';
import { HandymanAnalytics } from '@/components/dashboard/HandymanAnalytics';

interface HandymanProfile {
  id: string;
  specialty: string[];
  description: string;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  service_area_km: number;
  latitude: number | null;
  longitude: number | null;
}

interface HandymanDashboardProps {
  onBack: () => void;
}

export function HandymanDashboard({ onBack }: HandymanDashboardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [handymanProfile, setHandymanProfile] = useState<HandymanProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    specialty: [] as string[],
    description: '',
    hourly_rate: '',
    service_area_km: '20',
    latitude: null as number | null,
    longitude: null as number | null
  });

  const specialties = [
    { id: 'plumbing', label: 'سباكة', icon: '🔧' },
    { id: 'electrical', label: 'كهرباء', icon: '⚡' },
    { id: 'painting', label: 'دهان', icon: '🎨' },
    { id: 'cleaning', label: 'تنظيف', icon: '🧹' },
    { id: 'carpentry', label: 'نجارة', icon: '🪚' },
    { id: 'ac', label: 'تكييف', icon: '❄️' },
    { id: 'gardening', label: 'بستنة', icon: '🌱' },
    { id: 'moving', label: 'نقل', icon: '📦' }
  ];

  useEffect(() => {
    if (user) {
      fetchHandymanProfile();
    }
  }, [user]);

  const fetchHandymanProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('handymen')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      setHandymanProfile(data);
      setFormData({
        specialty: data.specialty || [],
        description: data.description || '',
        hourly_rate: data.hourly_rate?.toString() || '',
        service_area_km: data.service_area_km?.toString() || '20',
        latitude: data.latitude || null,
        longitude: data.longitude || null
      });
    }
    setIsLoading(false);
  };

  const createOrUpdateProfile = async () => {
    if (!user) return;
    
    if (formData.specialty.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار تخصص واحد على الأقل',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    const profileData = {
      user_id: user.id,
      specialty: formData.specialty,
      description: formData.description,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      service_area_km: parseInt(formData.service_area_km),
      is_available: true,
      latitude: formData.latitude,
      longitude: formData.longitude
    };

    let result;
    if (handymanProfile) {
      result = await supabase
        .from('handymen')
        .update(profileData)
        .eq('id', handymanProfile.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('handymen')
        .insert(profileData)
        .select()
        .single();
    }

    setIsSaving(false);

    if (result.error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الملف الشخصي',
        variant: 'destructive'
      });
    } else {
      setHandymanProfile(result.data);
      setIsEditing(false);
      toast({
        title: 'تم بنجاح',
        description: 'تم حفظ ملفك الشخصي'
      });
    }
  };

  const toggleAvailability = async () => {
    if (!handymanProfile) return;

    const { error } = await supabase
      .from('handymen')
      .update({ is_available: !handymanProfile.is_available })
      .eq('id', handymanProfile.id);

    if (!error) {
      setHandymanProfile(prev => prev ? { ...prev, is_available: !prev.is_available } : null);
    }
  };

  const toggleSpecialty = (specialtyId: string) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.includes(specialtyId)
        ? prev.specialty.filter(s => s !== specialtyId)
        : [...prev.specialty, specialtyId]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no profile yet or editing
  if (!handymanProfile || isEditing) {
    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pt-6 pb-4 flex items-center gap-4"
        >
          <Button variant="glass" size="icon" onClick={() => isEditing ? setIsEditing(false) : onBack()}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            {handymanProfile ? 'تعديل الملف' : 'إنشاء ملف حرفي'}
          </h1>
        </motion.header>

        <div className="px-6 pb-6 space-y-4">
          {/* Specialties */}
          <div>
            <label className="text-sm text-muted-foreground mb-3 block">التخصصات *</label>
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpecialty(s.id)}
                  className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                    formData.specialty.includes(s.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'glass-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">نبذة عنك</label>
            <div className="glass-card px-4 py-3">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="اكتب نبذة عن خبرتك وخدماتك..."
                rows={4}
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
                dir="auto"
              />
            </div>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">السعر بالساعة (دج)</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="مثال: 2000"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
          </div>

          {/* Service Area */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">نطاق الخدمة (كم)</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.service_area_km}
                onChange={(e) => setFormData(prev => ({ ...prev, service_area_km: e.target.value }))}
                placeholder="20"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
              <span className="text-muted-foreground text-sm">كم</span>
            </div>
          </div>

          {/* Location Picker */}
          <LocationPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
          />

          <Button
            variant="gold"
            size="lg"
            className="w-full mt-6 gap-2"
            onClick={createOrUpdateProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>حفظ الملف الشخصي</span>
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={onBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="font-serif text-2xl font-bold text-foreground">لوحة التحكم</h1>
          </div>
          <Button variant="glass" size="icon" onClick={() => setIsEditing(true)}>
            <Edit className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground text-2xl font-bold">
                {profile?.full_name?.charAt(0) || '؟'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground text-lg">{profile?.full_name || 'حرفي'}</h2>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-foreground">{handymanProfile.rating}</span>
                <span className="text-muted-foreground">({handymanProfile.total_reviews} تقييم)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">متاح للعمل</span>
            <Switch
              checked={handymanProfile.is_available}
              onCheckedChange={toggleAvailability}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">مهام مكتملة</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">طلبات قيد الانتظار</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {handymanProfile.hourly_rate?.toLocaleString('ar-DZ') || '0'}
                </p>
                <p className="text-xs text-muted-foreground">دج/ساعة</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{handymanProfile.service_area_km}</p>
                <p className="text-xs text-muted-foreground">كم نطاق الخدمة</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Specialties */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">تخصصاتي</h2>
        <div className="flex flex-wrap gap-2">
          {handymanProfile.specialty.map(s => {
            const spec = specialties.find(sp => sp.id === s);
            return (
              <span key={s} className="px-4 py-2 rounded-full bg-primary/20 text-primary text-sm flex items-center gap-2">
                <span>{spec?.icon}</span>
                <span>{spec?.label || s}</span>
              </span>
            );
          })}
        </div>

        {handymanProfile.description && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">نبذة عني</h2>
            <p className="text-muted-foreground glass-card p-4">{handymanProfile.description}</p>
          </div>
        )}

        {/* Live analytics */}
        <div className="mt-6">
          <HandymanAnalytics handymanId={handymanProfile.id} />
        </div>
      </div>
    </div>
  );
}
