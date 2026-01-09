import { useState } from 'react';
import { Calendar, Clock, Loader2, MessageSquare } from 'lucide-react';
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

interface BookHandymanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handyman: {
    id: string;
    user_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export function BookHandymanDialog({ open, onOpenChange, handyman }: BookHandymanDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!formData.date || !formData.time) {
      toast.error('يرجى اختيار التاريخ والوقت');
      return;
    }

    setIsLoading(true);

    try {
      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          tenant_id: user.id,
          owner_id: handyman.user_id,
          appointment_date: formData.date,
          appointment_time: formData.time,
          notes: formData.notes || `حجز موعد مع الحرفي: ${handyman.profiles?.full_name || 'حرفي'}`,
          status: 'pending'
        });

      if (appointmentError) throw appointmentError;

      // Send notification to handyman
      await supabase.from('notifications').insert({
        user_id: handyman.user_id,
        type: 'appointment',
        title: 'طلب حجز موعد جديد',
        message: `لديك طلب حجز موعد جديد بتاريخ ${formData.date} الساعة ${formData.time}`,
        data: { 
          appointment_date: formData.date,
          appointment_time: formData.time,
          requester_id: user.id
        }
      });

      toast.success('تم إرسال طلب الحجز بنجاح');
      onOpenChange(false);
      setFormData({ date: '', time: '', notes: '' });
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('فشل في إرسال طلب الحجز');
    } finally {
      setIsLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">حجز موعد مع الحرفي</DialogTitle>
          <DialogDescription className="text-right">
            اختر التاريخ والوقت المناسب لك
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Date */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">التاريخ *</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                min={today}
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground"
                required
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">الوقت *</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">ملاحظات (اختياري)</label>
            <div className="glass-card px-4 py-3">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="وصف المشكلة أو الخدمة المطلوبة..."
                rows={3}
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
                dir="auto"
              />
            </div>
          </div>

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
                  <MessageSquare className="w-4 h-4" />
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
