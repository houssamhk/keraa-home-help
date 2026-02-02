import { useState } from 'react';
import { Calendar, Clock, MapPin, Loader2, Wrench, FileText, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LocationPicker } from '@/components/map/LocationPicker';

interface ServiceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handyman: {
    id: string;
    user_id: string;
    specialty: string[];
    profiles?: {
      full_name: string;
    };
  };
}

const serviceTypes = [
  { id: 'plumbing', label: 'سباكة', icon: '🔧' },
  { id: 'electrical', label: 'كهرباء', icon: '⚡' },
  { id: 'painting', label: 'دهان', icon: '🎨' },
  { id: 'cleaning', label: 'تنظيف', icon: '🧹' },
  { id: 'carpentry', label: 'نجارة', icon: '🪚' },
  { id: 'ac', label: 'تكييف', icon: '❄️' },
  { id: 'gardening', label: 'بستنة', icon: '🌱' },
  { id: 'moving', label: 'نقل', icon: '📦' },
  { id: 'other', label: 'أخرى', icon: '🔨' }
];

export function ServiceRequestDialog({ open, onOpenChange, handyman }: ServiceRequestDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_type: '',
    description: '',
    preferred_date: '',
    preferred_time: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!formData.service_type || !formData.preferred_date || !formData.description) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);

    try {
      // Create service request
      const { error: requestError } = await supabase
        .from('service_requests')
        .insert({
          handyman_id: handyman.id,
          client_id: user.id,
          service_type: formData.service_type,
          description: formData.description,
          preferred_date: formData.preferred_date,
          preferred_time: formData.preferred_time || null,
          address: formData.address || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          status: 'pending'
        });

      if (requestError) throw requestError;

      // Send notification to handyman
      await supabase.from('notifications').insert({
        user_id: handyman.user_id,
        type: 'service_request',
        title: 'طلب خدمة جديد',
        message: `لديك طلب خدمة جديد (${serviceTypes.find(s => s.id === formData.service_type)?.label || formData.service_type})`,
        data: { 
          service_type: formData.service_type,
          preferred_date: formData.preferred_date,
          client_id: user.id
        }
      });

      toast.success('تم إرسال طلب الخدمة بنجاح');
      onOpenChange(false);
      setFormData({
        service_type: '',
        description: '',
        preferred_date: '',
        preferred_time: '',
        address: '',
        latitude: null,
        longitude: null
      });
    } catch (error) {
      console.error('Service request error:', error);
      toast.error('فشل في إرسال طلب الخدمة');
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const availableServices = serviceTypes.filter(
    s => handyman.specialty.includes(s.id) || s.id === 'other'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            طلب خدمة
          </DialogTitle>
          <DialogDescription className="text-right">
            أرسل طلب خدمة إلى {handyman.profiles?.full_name || 'الحرفي'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Service Type */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">نوع الخدمة *</label>
            <div className="flex flex-wrap gap-2">
              {availableServices.map(service => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, service_type: service.id }))}
                  className={`px-3 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                    formData.service_type === service.id
                      ? 'bg-primary text-primary-foreground'
                      : 'glass-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{service.icon}</span>
                  <span>{service.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              <FileText className="w-4 h-4 inline ml-1" />
              وصف المشكلة / الخدمة المطلوبة *
            </label>
            <div className="glass-card px-4 py-3">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="صف المشكلة أو الخدمة المطلوبة بالتفصيل..."
                rows={4}
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
                dir="auto"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">التاريخ المفضل *</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                min={today}
                value={formData.preferred_date}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_date: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground"
                required
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">الوقت المفضل (اختياري)</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <input
                type="time"
                value={formData.preferred_time}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_time: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">العنوان (اختياري)</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="العنوان بالتفصيل..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="auto"
              />
            </div>
          </div>

          {/* Location Picker */}
          <LocationPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="glass"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>إرسال الطلب</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
