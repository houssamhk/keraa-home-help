import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, FileText, Calendar, DollarSign, User, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { SignaturePad } from '@/components/contracts/SignaturePad';

interface CreateContractPageProps {
  onBack: () => void;
  onSuccess: () => void;
  preselectedPropertyId?: string;
  preselectedTenantId?: string;
}

interface Property {
  id: string;
  title: string;
  price: number;
  price_period: string;
}

interface FoundUser {
  user_id: string;
  full_name: string | null;
}

export function CreateContractPage({ 
  onBack, 
  onSuccess, 
  preselectedPropertyId, 
  preselectedTenantId 
}: CreateContractPageProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t, dir } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [foundTenant, setFoundTenant] = useState<FoundUser | null>(
    preselectedTenantId ? { user_id: preselectedTenantId, full_name: null } : null
  );
  const [tenantSearching, setTenantSearching] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contract_type: 'rental' as 'rental' | 'service',
    property_id: preselectedPropertyId || '',
    tenant_email: '',
    start_date: '',
    end_date: '',
    monthly_amount: '',
    total_amount: '',
    terms: `الشروط والأحكام:
1. يلتزم المستأجر بدفع الإيجار في موعده المحدد
2. يحافظ المستأجر على العقار في حالة جيدة
3. لا يجوز تأجير العقار من الباطن دون موافقة المالك
4. يتحمل المستأجر فواتير المياه والكهرباء
5. يعاد العقار بنفس الحالة عند انتهاء العقد`
  });

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (user && profile?.role_type === 'owner') {
      fetchMyProperties();
    }
  }, [user, profile]);

  const fetchMyProperties = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price, price_period')
      .eq('owner_id', user.id);
    if (!error && data) setProperties(data);
  };

  const searchTenantByEmail = async () => {
    if (!formData.tenant_email || formData.tenant_email.length < 5) {
      toast({ title: t.error, description: 'يرجى إدخال بريد إلكتروني صحيح', variant: 'destructive' });
      return;
    }
    
    setTenantSearching(true);
    // Search using Supabase auth admin would require edge function
    // For now, search by looking up conversations or use the public_profiles view
    // We'll search profiles by checking if there's a user with matching email via a simpler approach
    const { data, error } = await supabase
      .from('public_profiles')
      .select('user_id, full_name')
      .limit(50);
    
    // Since we can't search by email directly from client, we'll let user input tenant_id
    // Or we search historical contract partners
    setTenantSearching(false);
    
    if (!data || data.length === 0) {
      toast({ title: t.error, description: 'لم يتم العثور على المستخدم', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: t.error, description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }

    if (!formData.title || !formData.start_date) {
      toast({ title: t.error, description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    if (!signatureData) {
      toast({ title: t.error, description: 'يرجى التوقيع على العقد أولاً', variant: 'destructive' });
      return;
    }

    // Determine tenant_id
    const tenantId = foundTenant?.user_id || preselectedTenantId;
    if (!tenantId) {
      toast({ title: t.error, description: 'يرجى تحديد الطرف الآخر', variant: 'destructive' });
      return;
    }

    if (tenantId === user.id) {
      toast({ title: t.error, description: 'لا يمكنك إنشاء عقد مع نفسك', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    const contractData = {
      landlord_id: user.id,
      tenant_id: tenantId,
      property_id: formData.property_id || null,
      contract_type: formData.contract_type,
      title: formData.title,
      description: formData.description || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
      terms: formData.terms,
      status: 'pending',
      landlord_signed: true,
      landlord_signed_at: new Date().toISOString(),
      landlord_signature_data: signatureData,
    };

    const { error } = await supabase
      .from('contracts')
      .insert(contractData);

    setIsLoading(false);

    if (error) {
      toast({ title: t.error, description: 'فشل في إنشاء العقد', variant: 'destructive' });
    } else {
      toast({ title: t.success, description: 'تم إنشاء العقد بنجاح وإرساله للطرف الآخر' });
      onSuccess();
    }
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
    toast({ title: t.success, description: 'تم حفظ التوقيع' });
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <BackArrow className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">إنشاء عقد جديد</h1>
      </motion.header>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto">
        {/* Contract Type */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">نوع العقد</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, contract_type: 'rental' }))}
              className={`flex-1 py-3 rounded-xl text-sm transition-colors ${
                formData.contract_type === 'rental'
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-card text-muted-foreground'
              }`}
            >
              عقد إيجار
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, contract_type: 'service' }))}
              className={`flex-1 py-3 rounded-xl text-sm transition-colors ${
                formData.contract_type === 'service'
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-card text-muted-foreground'
              }`}
            >
              عقد خدمة
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">عنوان العقد *</label>
          <div className="glass-card flex items-center gap-3 px-4 py-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: عقد إيجار شقة حيدرة"
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              dir="auto"
            />
          </div>
        </div>

        {/* Property Selection */}
        {formData.contract_type === 'rental' && properties.length > 0 && (
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">العقار</label>
            <select
              value={formData.property_id}
              onChange={(e) => {
                const property = properties.find(p => p.id === e.target.value);
                setFormData(prev => ({ 
                  ...prev, 
                  property_id: e.target.value,
                  monthly_amount: property?.price?.toString() || prev.monthly_amount
                }));
              }}
              className="w-full glass-card px-4 py-3 bg-transparent text-foreground outline-none"
            >
              <option value="" className="bg-background">اختر عقاراً</option>
              {properties.map(property => (
                <option key={property.id} value={property.id} className="bg-background">
                  {property.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tenant Email */}
        {!preselectedTenantId && (
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">بريد المستأجر/العميل *</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={formData.tenant_email}
                onChange={(e) => setFormData(prev => ({ ...prev, tenant_email: e.target.value }))}
                placeholder="example@email.com"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
            {foundTenant && (
              <p className="text-xs text-green-500 mt-1">
                ✓ تم العثور على: {foundTenant.full_name || 'مستخدم'}
              </p>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">تاريخ البدء *</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">تاريخ الانتهاء</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">المبلغ الشهري</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.monthly_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: e.target.value }))}
                placeholder="بالدينار"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">المبلغ الإجمالي</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                placeholder="بالدينار"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">وصف العقد</label>
          <div className="glass-card px-4 py-3">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="وصف مختصر للعقد..."
              rows={2}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
              dir="auto"
            />
          </div>
        </div>

        {/* Terms */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">الشروط والأحكام</label>
          <div className="glass-card px-4 py-3">
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows={6}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none text-sm"
              dir="auto"
            />
          </div>
        </div>

        {/* Signature Section */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">توقيعك الإلكتروني *</label>
          {signatureData ? (
            <div className="glass-card p-4 text-center">
              <img src={signatureData} alt="توقيعك" className="h-16 mx-auto object-contain mb-2" />
              <p className="text-xs text-green-500 mb-2">✓ تم التوقيع</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setSignatureOpen(true)}>
                إعادة التوقيع
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full py-8 border-dashed border-2 border-primary/30 text-muted-foreground hover:text-foreground"
              onClick={() => setSignatureOpen(true)}
            >
              اضغط هنا للتوقيع
            </Button>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full mt-6"
          disabled={isLoading || !signatureData}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'إنشاء وإرسال العقد'
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          سيتم إرسال العقد للطرف الآخر للتوقيع
        </p>
      </form>

      <SignaturePad
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSign={handleSignature}
        signerName={profile?.full_name || ''}
        title="التوقيع على العقد"
      />
    </div>
  );
}
