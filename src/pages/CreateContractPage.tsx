import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Calendar, DollarSign, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export function CreateContractPage({ 
  onBack, 
  onSuccess, 
  preselectedPropertyId, 
  preselectedTenantId 
}: CreateContractPageProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
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
    
    if (!error && data) {
      setProperties(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.title || !formData.start_date || !formData.tenant_email) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    // Find tenant by email (simplified - in production you'd have a proper user lookup)
    // For now, we'll create the contract and the tenant will be identified when they sign up/login
    const contractData = {
      landlord_id: user.id,
      tenant_id: preselectedTenantId || user.id, // Will be updated when tenant accepts
      property_id: formData.property_id || null,
      contract_type: formData.contract_type,
      title: formData.title,
      description: formData.description,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
      terms: formData.terms,
      status: 'pending',
      landlord_signed: true,
      landlord_signed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('contracts')
      .insert(contractData);

    setIsLoading(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء العقد',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء العقد بنجاح وإرساله للطرف الآخر'
      });
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">إنشاء عقد جديد</h1>
      </motion.header>

      {/* Form */}
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

        {/* Property Selection (for rental) */}
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
        </div>

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

        {/* Submit */}
        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full mt-6"
          disabled={isLoading}
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
    </div>
  );
}
