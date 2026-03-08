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
    terms: ''
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
      toast({ title: t.error, description: t.createContractPage.validEmail, variant: 'destructive' });
      return;
    }
    
    setTenantSearching(true);
    const { data, error } = await supabase
      .from('public_profiles')
      .select('user_id, full_name')
      .limit(50);
    
    setTenantSearching(false);
    
    if (!data || data.length === 0) {
      toast({ title: t.error, description: t.createContractPage.userNotFound, variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: t.error, description: t.loginRequired, variant: 'destructive' });
      return;
    }

    if (!formData.title || !formData.start_date) {
      toast({ title: t.error, description: t.requiredFields, variant: 'destructive' });
      return;
    }

    if (!signatureData) {
      toast({ title: t.error, description: t.createContractPage.signFirst, variant: 'destructive' });
      return;
    }

    const tenantId = foundTenant?.user_id || preselectedTenantId;
    if (!tenantId) {
      toast({ title: t.error, description: t.createContractPage.specifyOtherParty, variant: 'destructive' });
      return;
    }

    if (tenantId === user.id) {
      toast({ title: t.error, description: t.createContractPage.cannotSelfContract, variant: 'destructive' });
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
      toast({ title: t.error, description: t.createContractPage.createFailed, variant: 'destructive' });
    } else {
      toast({ title: t.success, description: t.createContractPage.createSuccess });
      onSuccess();
    }
  };

  const handleSignature = (data: string) => {
    setSignatureData(data);
    toast({ title: t.success, description: t.createContractPage.signatureSaved });
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
        <h1 className="font-serif text-2xl font-bold text-foreground">{t.createContractPage.title}</h1>
      </motion.header>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto">
        {/* Contract Type */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.contractType}</label>
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
              {t.createContractPage.rentalContract}
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
              {t.createContractPage.serviceContract}
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.contractTitle}</label>
          <div className="glass-card flex items-center gap-3 px-4 py-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t.createContractPage.contractTitlePlaceholder}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              dir="auto"
            />
          </div>
        </div>

        {/* Property Selection */}
        {formData.contract_type === 'rental' && properties.length > 0 && (
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.property}</label>
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
              <option value="" className="bg-background">{t.createContractPage.selectProperty}</option>
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
            <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.tenantEmail}</label>
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
                ✓ {t.createContractPage.foundUser} {foundTenant.full_name || t.createContractPage.user}
              </p>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.startDate}</label>
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
            <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.endDate}</label>
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
            <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.monthlyAmount}</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.monthly_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: e.target.value }))}
                placeholder={t.createContractPage.inDZD}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.totalAmount}</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                placeholder={t.createContractPage.inDZD}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.description}</label>
          <div className="glass-card px-4 py-3">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t.createContractPage.descriptionPlaceholder}
              rows={2}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
              dir="auto"
            />
          </div>
        </div>

        {/* Terms */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.termsAndConditions}</label>
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
          <label className="text-sm text-muted-foreground mb-2 block">{t.createContractPage.yourSignature}</label>
          {signatureData ? (
            <div className="glass-card p-4 text-center">
              <img src={signatureData} alt="signature" className="h-16 mx-auto object-contain mb-2" />
              <p className="text-xs text-green-500 mb-2">{t.createContractPage.signed}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setSignatureOpen(true)}>
                {t.createContractPage.resignButton}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full py-8 border-dashed border-2 border-primary/30 text-muted-foreground hover:text-foreground"
              onClick={() => setSignatureOpen(true)}
            >
              {t.createContractPage.clickToSign}
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
            t.createContractPage.createAndSend
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {t.createContractPage.willBeSent}
        </p>
      </form>

      <SignaturePad
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSign={handleSignature}
        signerName={profile?.full_name || ''}
        title={t.createContractPage.signContractTitle}
      />
    </div>
  );
}
