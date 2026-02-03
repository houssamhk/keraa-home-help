import { useState, useEffect } from 'react';
import { Building2, Check, Crown, Zap, Shield, BarChart3, Headphones, Loader2 } from 'lucide-react';
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

interface AgencyPackage {
  id: string;
  name: string;
  name_ar: string;
  max_listings: number | null;
  priority_display: boolean;
  analytics_access: boolean;
  dedicated_support: boolean;
  verified_badge: boolean;
  monthly_price: number;
}

interface AgencySubscriptionDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AgencySubscriptionDialog({ trigger, onSuccess }: AgencySubscriptionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<AgencyPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [agencyData, setAgencyData] = useState({
    name: '',
    phone: '',
    address: '',
    commercialRegister: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from('agency_packages')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price');
    
    if (data) setPackages(data);
  };

  const getPackageIcon = (name: string) => {
    switch (name) {
      case 'basic': return <Zap className="w-6 h-6" />;
      case 'professional': return <Shield className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      default: return <Building2 className="w-6 h-6" />;
    }
  };

  const getPackageColor = (name: string) => {
    switch (name) {
      case 'basic': return 'text-blue-500';
      case 'professional': return 'text-purple-500';
      case 'premium': return 'text-primary';
      default: return 'text-foreground';
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedPackage) return;

    if (!agencyData.name || !agencyData.phone) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('agency_subscriptions')
        .insert({
          user_id: user.id,
          package_id: selectedPackage,
          agency_name: agencyData.name,
          agency_phone: agencyData.phone,
          agency_address: agencyData.address,
          commercial_register: agencyData.commercialRegister,
          status: 'pending',
          payment_method: 'ccp'
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('لديك اشتراك موجود بالفعل');
        }
        throw error;
      }

      toast({
        title: 'تم استلام طلبك',
        description: 'سيتم التواصل معك لتفعيل الاشتراك'
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إنشاء الاشتراك',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="gold" className="gap-2">
            <Building2 className="w-5 h-5" />
            <span>اشتراك الوكالات</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {step === 'select' ? 'اختر باقة الوكالة' : 'معلومات الوكالة'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPackage(pkg.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                  selectedPackage === pkg.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-secondary ${getPackageColor(pkg.name)}`}>
                    {getPackageIcon(pkg.name)}
                  </div>
                  {selectedPackage === pkg.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                <h3 className="text-lg font-bold mb-1">{pkg.name_ar}</h3>
                <div className="text-2xl font-bold text-primary mb-3">
                  {pkg.monthly_price.toLocaleString('ar-DZ')} <span className="text-sm font-normal">دج/شهر</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${pkg.max_listings === null ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span>
                      {pkg.max_listings === null 
                        ? 'عقارات غير محدودة' 
                        : `حتى ${pkg.max_listings} عقار`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${pkg.priority_display ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={!pkg.priority_display ? 'text-muted-foreground line-through' : ''}>
                      أولوية في الظهور
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BarChart3 className={`w-4 h-4 ${pkg.analytics_access ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={!pkg.analytics_access ? 'text-muted-foreground line-through' : ''}>
                      إحصائيات متقدمة
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${pkg.verified_badge ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={!pkg.verified_badge ? 'text-muted-foreground line-through' : ''}>
                      علامة التوثيق
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Headphones className={`w-4 h-4 ${pkg.dedicated_support ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={!pkg.dedicated_support ? 'text-muted-foreground line-through' : ''}>
                      دعم فني خاص
                    </span>
                  </div>
                </div>
              </button>
            ))}

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => setStep('details')}
              disabled={!selectedPackage}
            >
              متابعة
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Package Summary */}
            {selectedPkg && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-sm text-muted-foreground">الباقة المختارة:</span>
                  <span className="font-medium mr-2">{selectedPkg.name_ar}</span>
                </div>
                <span className="font-bold text-primary">
                  {selectedPkg.monthly_price.toLocaleString('ar-DZ')} دج/شهر
                </span>
              </div>
            )}

            {/* Agency Details Form */}
            <div>
              <label className="text-sm font-medium mb-2 block">اسم الوكالة *</label>
              <input
                type="text"
                value={agencyData.name}
                onChange={(e) => setAgencyData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="الاسم التجاري للوكالة"
                className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">رقم الهاتف *</label>
              <input
                type="tel"
                value={agencyData.phone}
                onChange={(e) => setAgencyData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0XX XXX XX XX"
                className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">العنوان</label>
              <input
                type="text"
                value={agencyData.address}
                onChange={(e) => setAgencyData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="عنوان مقر الوكالة"
                className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">رقم السجل التجاري</label>
              <input
                type="text"
                value={agencyData.commercialRegister}
                onChange={(e) => setAgencyData(prev => ({ ...prev, commercialRegister: e.target.value }))}
                placeholder="رقم السجل التجاري (اختياري)"
                className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
                dir="ltr"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('select')}
              >
                رجوع
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'إرسال الطلب'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
