import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedType: 'property' | 'user' | 'handyman' | 'review';
  reportedId: string;
  reportedName?: string;
}

const REPORT_REASONS = {
  property: [
    { value: 'fake', label: 'إعلان وهمي أو احتيالي' },
    { value: 'wrong_info', label: 'معلومات غير صحيحة' },
    { value: 'duplicate', label: 'إعلان مكرر' },
    { value: 'inappropriate', label: 'محتوى غير لائق' },
    { value: 'other', label: 'سبب آخر' }
  ],
  user: [
    { value: 'harassment', label: 'تحرش أو مضايقة' },
    { value: 'scam', label: 'محاولة احتيال' },
    { value: 'fake_profile', label: 'ملف شخصي وهمي' },
    { value: 'inappropriate', label: 'سلوك غير لائق' },
    { value: 'other', label: 'سبب آخر' }
  ],
  handyman: [
    { value: 'bad_service', label: 'خدمة سيئة' },
    { value: 'scam', label: 'احتيال' },
    { value: 'fake_profile', label: 'ملف شخصي وهمي' },
    { value: 'no_show', label: 'لم يحضر للموعد' },
    { value: 'other', label: 'سبب آخر' }
  ],
  review: [
    { value: 'fake', label: 'تقييم وهمي' },
    { value: 'inappropriate', label: 'محتوى غير لائق' },
    { value: 'spam', label: 'محتوى مزعج' },
    { value: 'other', label: 'سبب آخر' }
  ]
};

const TYPE_LABELS = {
  property: 'العقار',
  user: 'المستخدم',
  handyman: 'الحرفي',
  review: 'التقييم'
};

export function ReportDialog({
  open,
  onOpenChange,
  reportedType,
  reportedId,
  reportedName
}: ReportDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = REPORT_REASONS[reportedType];

  const handleSubmit = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للإبلاغ');
      return;
    }

    if (!reason) {
      toast.error('يرجى اختيار سبب الإبلاغ');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_type: reportedType,
      reported_id: reportedId,
      reason: reason,
      description: description || null
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('فشل في إرسال البلاغ');
      return;
    }

    toast.success('تم إرسال البلاغ بنجاح');
    onOpenChange(false);
    setReason('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            الإبلاغ عن {TYPE_LABELS[reportedType]}
          </DialogTitle>
          <DialogDescription>
            {reportedName && `الإبلاغ عن: ${reportedName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>سبب الإبلاغ</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {reasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف تفاصيل إضافية تساعدنا في فهم المشكلة..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
