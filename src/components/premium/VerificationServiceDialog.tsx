import { useState, useEffect } from 'react';
import { Shield, FileCheck, Scale, FileSearch, Calendar, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface VerificationService {
  id: string;
  name: string;
  name_ar: string;
  description_ar: string;
  price: number;
  estimated_days: number;
}

interface VerificationServiceDialogProps {
  propertyId: string;
  propertyTitle: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function VerificationServiceDialog({
  propertyId,
  propertyTitle,
  trigger,
  onSuccess
}: VerificationServiceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<VerificationService[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contactPhone: '',
    preferredDate: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('verification_services')
      .select('*')
      .eq('is_active', true)
      .order('price');
    
    if (data) setServices(data);
  };

  const getServiceIcon = (name: string) => {
    switch (name) {
      case 'property_inspection': return <FileSearch className="w-6 h-6" />;
      case 'document_verification': return <FileCheck className="w-6 h-6" />;
      case 'legal_consultation': return <Scale className="w-6 h-6" />;
      case 'full_report': return <Shield className="w-6 h-6" />;
      default: return <FileCheck className="w-6 h-6" />;
    }
  };

  const selectedSvc = services.find(s => s.id === selectedService);

  const handleSubmit = async () => {
    if (!user || !selectedService) return;

    if (!formData.contactPhone) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رقم الهاتف للتواصل',
        variant: 'destructive'
      });
      return;
    }

    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          property_id: propertyId,
          requester_id: user.id,
          service_id: selectedService,
          notes: formData.notes,
          contact_phone: formData.contactPhone,
          preferred_date: formData.preferredDate || null,
          price_paid: service.price,
          payment_method: 'ccp',
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'تم استلام طلبك',
        description: 'سيتم التواصل معك خلال 24 ساعة'
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إرسال الطلب',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Shield className="w-4 h-4" />
            <span>التقرير الموثوق</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            خدمات التوثيق
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Name */}
          <div className="p-3 rounded-lg bg-secondary/30 text-sm">
            <span className="text-muted-foreground">العقار: </span>
            <span className="font-medium">{propertyTitle}</span>
          </div>

          {/* Service Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">اختر الخدمة</label>
            <div className="space-y-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-right ${
                    selectedService === service.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-secondary text-primary shrink-0">
                      {getServiceIcon(service.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{service.name_ar}</h4>
                        <span className="font-bold text-primary">
                          {service.price.toLocaleString('ar-DZ')} دج
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {service.description_ar}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>مدة التنفيذ: {service.estimated_days} أيام</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Form - Only show when service is selected */}
          {selectedService && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">رقم الهاتف للتواصل *</label>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="0XX XXX XX XX"
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">التاريخ المفضل للزيارة</label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">ملاحظات إضافية</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي تفاصيل تريد إضافتها..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none"
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">الخدمة</span>
                  <span className="font-medium">{selectedSvc?.name_ar}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">المجموع</span>
                  <span className="text-xl font-bold text-primary">
                    {selectedSvc?.price.toLocaleString('ar-DZ')} دج
                  </span>
                </div>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-5 h-5 ml-2" />
                    طلب الخدمة
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
