import { useState } from 'react';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BookViewingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    title: string;
    owner_id?: string;
  };
}

export function BookViewingDialog({ open, onOpenChange, property }: BookViewingDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!property.owner_id) {
      toast.error('لا يمكن تحديد مالك العقار');
      return;
    }

    if (!date || !time) {
      toast.error('يرجى تحديد التاريخ والوقت');
      return;
    }

    setIsLoading(true);

    try {
      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          property_id: property.id,
          owner_id: property.owner_id,
          tenant_id: user.id,
          appointment_date: date,
          appointment_time: time,
          notes: notes || null,
          status: 'pending'
        });

      if (appointmentError) throw appointmentError;

      // Send notification to property owner
      await supabase.from('notifications').insert({
        user_id: property.owner_id,
        title: 'طلب موعد معاينة جديد',
        message: `طلب جديد لمعاينة عقار "${property.title}" بتاريخ ${date}`,
        type: 'appointment',
        data: { property_id: property.id }
      });

      toast.success('تم إرسال طلب الموعد بنجاح');
      onOpenChange(false);
      setDate('');
      setTime('');
      setNotes('');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('فشل في إرسال طلب الموعد');
    } finally {
      setIsLoading(false);
    }
  };

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">حجز موعد معاينة</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4 text-right">
              {property.title}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 justify-end">
              <span>التاريخ</span>
              <Calendar className="w-4 h-4" />
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              className="w-full p-3 rounded-lg bg-muted border border-border text-right"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 justify-end">
              <span>الوقت</span>
              <Clock className="w-4 h-4" />
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 rounded-lg bg-muted border border-border text-right"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-right block">ملاحظات (اختياري)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات تريد إضافتها..."
              className="text-right"
              dir="rtl"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'إرسال الطلب'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
