import { useState, useEffect } from 'react';
import { Star, Clock, Wallet, CreditCard, Loader2, Check, Sparkles, Globe, Shield } from 'lucide-react';
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
import { createSatimPayment } from '@/services/paymentService';

interface FeaturedPricing {
  id: string;
  duration_days: number;
  price: number;
  discount_percentage: number;
}

interface FeaturedListingDialogProps {
  propertyId: string;
  propertyTitle: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function FeaturedListingDialog({ 
  propertyId, 
  propertyTitle,
  trigger,
  onSuccess 
}: FeaturedListingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pricing, setPricing] = useState<FeaturedPricing[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'satim' | 'ccp' | 'baridimob'>('wallet');
  const [isSatimProcessing, setIsSatimProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPricing();
      fetchWalletBalance();
    }
  }, [isOpen]);

  const fetchPricing = async () => {
    const { data } = await supabase
      .from('featured_pricing')
      .select('*')
      .eq('is_active', true)
      .order('duration_days');
    
    if (data) setPricing(data);
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (data) setWalletBalance(data.balance);
  };

  const getSelectedPrice = () => {
    return pricing.find(p => p.duration_days === selectedDuration)?.price || 0;
  };

  const getDurationLabel = (days: number) => {
    switch (days) {
      case 7: return 'أسبوع';
      case 14: return 'أسبوعين';
      case 30: return 'شهر';
      default: return `${days} يوم`;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    const price = getSelectedPrice();
    
    if (paymentMethod === 'wallet') {
      if (walletBalance < price) {
        toast({
          title: 'رصيد غير كافي',
          description: `الرصيد المتوفر: ${walletBalance.toLocaleString('ar-DZ')} دج، المطلوب: ${price.toLocaleString('ar-DZ')} دج`,
          variant: 'destructive'
        });
        return;
      }
    } else if (paymentMethod === 'satim') {
      // Handle SATIM online payment
      setIsSatimProcessing(true);
      try {
        // First create a pending featured listing
        const { data: listing, error: listingError } = await supabase
          .from('featured_listings')
          .insert({
            property_id: propertyId,
            user_id: user.id,
            feature_type: 'top_results',
            duration_days: selectedDuration,
            price_paid: price,
            status: 'pending',
            payment_method: 'satim_cib',
          })
          .select('id')
          .single();

        if (listingError) throw listingError;

        const result = await createSatimPayment({
          amount: price,
          payment_type: 'featured_listing',
          reference_id: listing.id,
          description: `تمييز عقار: ${propertyTitle}`,
        });

        if (result.redirect_url) {
          window.location.href = result.redirect_url;
          return;
        } else {
          toast({
            title: 'بوابة الدفع غير مفعلة',
            description: 'استخدم المحفظة أو التحويل اليدوي حالياً',
          });
        }
      } catch (error: any) {
        toast({
          title: 'خطأ',
          description: error.message || 'فشل في إنشاء عملية الدفع',
          variant: 'destructive'
        });
      } finally {
        setIsSatimProcessing(false);
      }
      return;
    } else if (!paymentReference) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رقم التحويل',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      if (paymentMethod === 'wallet') {
        const { data, error } = await supabase.rpc('pay_for_featured_listing', {
          p_property_id: propertyId,
          p_duration_days: selectedDuration,
          p_feature_type: 'top_results'
        });

        if (error) throw error;

        toast({
          title: 'تم بنجاح!',
          description: `تم تمييز عقارك لمدة ${getDurationLabel(selectedDuration)}`
        });
      } else {
        const { error } = await supabase
          .from('featured_listings')
          .insert({
            property_id: propertyId,
            user_id: user.id,
            feature_type: 'top_results',
            duration_days: selectedDuration,
            price_paid: price,
            status: 'pending',
            payment_method: paymentMethod,
            payment_reference: paymentReference
          });

        if (error) throw error;

        toast({
          title: 'تم استلام طلبك',
          description: 'سيتم تفعيل التميز بعد التحقق من الدفع'
        });
      }

      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تمييز العقار',
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
          <Button variant="gold" size="sm" className="gap-2">
            <Star className="w-4 h-4" />
            <span>تمييز الإعلان</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            تمييز العقار
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Name */}
          <div className="p-3 rounded-lg bg-secondary/30 text-sm">
            <span className="text-muted-foreground">العقار: </span>
            <span className="font-medium">{propertyTitle}</span>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">اختر مدة التميز</label>
            <div className="grid grid-cols-3 gap-2">
              {pricing.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedDuration(p.duration_days)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedDuration === p.duration_days
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{getDurationLabel(p.duration_days)}</span>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {p.price.toLocaleString('ar-DZ')} <span className="text-xs">دج</span>
                  </div>
                  {p.discount_percentage > 0 && (
                    <div className="text-xs text-green-500">خصم {p.discount_percentage}%</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-sm font-medium mb-3 block">طريقة الدفع</label>
            <div className="space-y-2">
              {/* SATIM Online Payment */}
              <button
                type="button"
                onClick={() => setPaymentMethod('satim')}
                className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                  paymentMethod === 'satim'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <div className="text-right">
                    <div className="font-medium flex items-center gap-2">
                      دفع إلكتروني
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">فوري</span>
                    </div>
                    <div className="text-sm text-muted-foreground">CIB / البطاقة الذهبية</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-400" />
                  {paymentMethod === 'satim' && <Check className="w-5 h-5 text-primary" />}
                </div>
              </button>

              {/* Wallet */}
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <div className="text-right">
                    <div className="font-medium">رصيد المحفظة</div>
                    <div className="text-sm text-muted-foreground">
                      {walletBalance.toLocaleString('ar-DZ')} دج متاح
                    </div>
                  </div>
                </div>
                {paymentMethod === 'wallet' && <Check className="w-5 h-5 text-primary" />}
              </button>

              {/* CCP */}
              <button
                type="button"
                onClick={() => setPaymentMethod('ccp')}
                className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                  paymentMethod === 'ccp'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-yellow-500" />
                  <div className="text-right">
                    <div className="font-medium">تحويل CCP</div>
                    <div className="text-sm text-muted-foreground">تحويل بريدي</div>
                  </div>
                </div>
                {paymentMethod === 'ccp' && <Check className="w-5 h-5 text-primary" />}
              </button>

              {/* BaridiMob */}
              <button
                type="button"
                onClick={() => setPaymentMethod('baridimob')}
                className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                  paymentMethod === 'baridimob'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <div className="text-right">
                    <div className="font-medium">BaridiMob</div>
                    <div className="text-sm text-muted-foreground">دفع إلكتروني</div>
                  </div>
                </div>
                {paymentMethod === 'baridimob' && <Check className="w-5 h-5 text-primary" />}
              </button>
            </div>
          </div>

          {/* Payment Reference for CCP/BaridiMob */}
          {paymentMethod !== 'wallet' && (
            <div>
              <label className="text-sm font-medium mb-2 block">رقم التحويل</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="أدخل رقم عملية التحويل"
                className="w-full p-3 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                حساب CCP: 0012345678 مفتاح 90
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">المجموع</span>
              <span className="text-xl font-bold text-primary">
                {getSelectedPrice().toLocaleString('ar-DZ')} دج
              </span>
            </div>
          </div>

          {/* Submit Button */}
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
                <Sparkles className="w-5 h-5 ml-2" />
                تأكيد التمييز
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
