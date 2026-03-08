import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, CheckCircle, Clock, XCircle, AlertCircle, Camera, FileText, CreditCard, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentProofUrl } from '@/hooks/usePaymentProofUrl';
import { useLanguage } from '@/i18n/LanguageContext';

interface ArrabonPageProps {
  onBack: () => void;
  contractId?: string;
}

interface Arrabon {
  id: string;
  contract_id: string;
  amount: number;
  payment_method: string;
  payment_proof_url: string | null;
  payment_reference: string | null;
  status: string;
  submitted_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  tenant_id: string;
  owner_id: string;
}

interface Contract {
  id: string;
  title: string;
  monthly_amount: number | null;
  landlord_id: string;
  tenant_id: string;
}

const ArrabonPage: React.FC<ArrabonPageProps> = ({ onBack, contractId }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t, dir, language } = useLanguage();
  const { getSignedProofUrl } = usePaymentProofUrl();
  const [arrabons, setArrabons] = useState<Arrabon[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedProofUrls, setSignedProofUrls] = useState<Record<string, string | null>>({});
  
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const [formData, setFormData] = useState({
    contract_id: contractId || '',
    amount: '',
    payment_method: 'baridimob',
    payment_reference: '',
    notes: ''
  });

  const isOwner = profile?.role_type === 'owner';
  const isTenant = profile?.role_type === 'tenant';

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    const loadSignedUrls = async () => {
      const urls: Record<string, string | null> = {};
      await Promise.all(
        arrabons
          .filter(a => a.payment_proof_url)
          .map(async (a) => {
            urls[a.id] = await getSignedProofUrl(a.payment_proof_url);
          })
      );
      setSignedProofUrls(urls);
    };
    if (arrabons.length > 0) loadSignedUrls();
  }, [arrabons, getSignedProofUrl]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const { data: arrabonData, error: arrabonError } = await supabase
        .from('arrabons')
        .select('*')
        .order('created_at', { ascending: false });

      if (arrabonError) throw arrabonError;
      setArrabons(arrabonData || []);

      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, monthly_amount, landlord_id, tenant_id')
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`);

      if (contractError) throw contractError;
      setContracts(contractData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t.error,
        description: t.arrabonPage.loadFailed,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadPaymentProof = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    return fileName;
  };

  const handleSubmitArrabon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) {
      toast({
        title: t.error,
        description: t.arrabonPage.uploadProofRequired,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const proofUrl = await uploadPaymentProof(selectedFile);
      const contract = contracts.find(c => c.id === formData.contract_id);
      if (!contract) throw new Error(t.arrabonPage.contractNotFound);

      const { error } = await supabase
        .from('arrabons')
        .insert({
          contract_id: formData.contract_id,
          tenant_id: user.id,
          owner_id: contract.landlord_id,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          payment_proof_url: proofUrl,
          payment_reference: formData.payment_reference || null,
          notes: formData.notes || null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: t.send,
        description: t.arrabonPage.sentSuccess
      });

      setShowForm(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({
        contract_id: '',
        amount: '',
        payment_method: 'baridimob',
        payment_reference: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error submitting arrabon:', error);
      toast({
        title: t.error,
        description: t.arrabonPage.sendFailed,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyArrabon = async (arrabonId: string, action: 'verify' | 'reject', reason?: string) => {
    try {
      const updateData: Record<string, unknown> = {
        status: action === 'verify' ? 'verified' : 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: user!.id
      };

      if (action === 'reject' && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('arrabons')
        .update(updateData)
        .eq('id', arrabonId);

      if (error) throw error;

      toast({
        title: action === 'verify' ? t.arrabonPage.verified : t.arrabonPage.rejected,
        description: action === 'verify' ? t.arrabonPage.verifiedSuccess : t.arrabonPage.rejectedDesc
      });

      fetchData();
    } catch (error) {
      console.error('Error updating arrabon:', error);
      toast({
        title: t.error,
        description: t.arrabonPage.updateFailed,
        variant: 'destructive'
      });
    }
  };

  const handleReleaseArrabon = async (arrabonId: string) => {
    try {
      const { error } = await supabase
        .from('arrabons')
        .update({
          status: 'released',
          released_at: new Date().toISOString()
        })
        .eq('id', arrabonId);

      if (error) throw error;

      toast({
        title: t.arrabonPage.delivered,
        description: t.arrabonPage.deliveredDesc
      });

      fetchData();
    } catch (error) {
      console.error('Error releasing arrabon:', error);
      toast({
        title: t.error,
        description: t.arrabonPage.updateFailed,
        variant: 'destructive'
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400', label: t.arrabonPage.statusPending };
      case 'submitted':
        return { icon: AlertCircle, color: 'bg-blue-500/20 text-blue-400', label: t.arrabonPage.statusSubmitted };
      case 'verified':
        return { icon: CheckCircle, color: 'bg-green-500/20 text-green-400', label: t.arrabonPage.statusVerified };
      case 'rejected':
        return { icon: XCircle, color: 'bg-red-500/20 text-red-400', label: t.arrabonPage.statusRejected };
      case 'released':
        return { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400', label: t.arrabonPage.statusReleased };
      default:
        return { icon: Clock, color: 'bg-muted text-muted-foreground', label: status };
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'baridimob': return t.arrabonPage.baridimob;
      case 'ccp': return t.arrabonPage.ccpTransfer;
      case 'cash': return t.arrabonPage.cashPayment;
      default: return method;
    }
  };

  const formatDate = (dateStr: string) => {
    const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 backdrop-blur-xl border-b border-border p-4"
      >
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <BackArrow className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{t.arrabonPage.title}</h1>
          <div className="w-10" />
        </div>
      </motion.div>

      <div className="p-4 space-y-6">
        {/* Info Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t.arrabonPage.secureSystem}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.arrabonPage.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Arrabon Button (Tenant Only) */}
        {isTenant && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Upload className="w-4 h-4 ml-2" />
            {t.arrabonPage.sendNew}
          </Button>
        )}

        {/* Arrabon Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t.arrabonPage.submitProof}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitArrabon} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.arrabonPage.selectContract}</Label>
                    <Select
                      value={formData.contract_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contract_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.arrabonPage.selectContract} />
                      </SelectTrigger>
                      <SelectContent>
                        {contracts.map(contract => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.arrabonPage.arrabonAmount}</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder={t.arrabonPage.enterAmount}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t.arrabonPage.paymentMethod}</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baridimob">{t.arrabonPage.baridimob}</SelectItem>
                        <SelectItem value="ccp">{t.arrabonPage.ccpTransfer}</SelectItem>
                        <SelectItem value="cash">{t.arrabonPage.cashPayment}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.arrabonPage.transactionRef}</Label>
                    <Input
                      value={formData.payment_reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
                      placeholder={t.arrabonPage.transactionRefPlaceholder}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t.arrabonPage.paymentProof}</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                      {previewUrl ? (
                        <div className="space-y-3">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                            }}
                          >
                            {t.arrabonPage.removeImage}
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground mb-2">{t.arrabonPage.clickToUpload}</p>
                          <p className="text-xs text-muted-foreground">{t.arrabonPage.fileTypes}</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.notesOptional}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t.anyAdditionalNotes}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !selectedFile}
                      className="flex-1 bg-primary"
                    >
                      {isSubmitting ? t.arrabonPage.sending : t.arrabonPage.sendArrabon}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Arrabons List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{t.arrabonPage.record}</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : arrabons.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t.arrabonPage.noArrabons}</p>
              </CardContent>
            </Card>
          ) : (
            arrabons.map((arrabon) => {
              const statusConfig = getStatusConfig(arrabon.status);
              const StatusIcon = statusConfig.icon;
              const canVerify = isOwner && arrabon.status === 'submitted';
              const canRelease = isOwner && arrabon.status === 'verified';

              return (
                <motion.div
                  key={arrabon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold">{arrabon.amount.toLocaleString()} {t.currency}</h3>
                          <p className="text-sm text-muted-foreground">
                            {getPaymentMethodLabel(arrabon.payment_method)}
                          </p>
                        </div>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {arrabon.payment_reference && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {t.arrabonPage.transactionNumber}: {arrabon.payment_reference}
                        </p>
                      )}

                      {arrabon.payment_proof_url && signedProofUrls[arrabon.id] && (
                        <div className="mb-3">
                          <img
                            src={signedProofUrls[arrabon.id]!}
                            alt="Payment proof"
                            className="max-h-32 rounded-lg border border-border"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{t.arrabonPage.secureLink}</p>
                        </div>
                      )}

                      {arrabon.rejection_reason && (
                        <div className="p-3 bg-red-500/10 rounded-lg mb-3">
                          <p className="text-sm text-red-400">
                            {t.arrabonPage.rejectionReason} {arrabon.rejection_reason}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {formatDate(arrabon.created_at)}
                      </p>

                      {canVerify && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleVerifyArrabon(arrabon.id, 'verify')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            {t.arrabonPage.confirmReceipt}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => {
                              const reason = prompt(t.arrabonPage.rejectionReason);
                              if (reason) handleVerifyArrabon(arrabon.id, 'reject', reason);
                            }}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            {t.reject}
                          </Button>
                        </div>
                      )}

                      {canRelease && (
                        <Button
                          size="sm"
                          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleReleaseArrabon(arrabon.id)}
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          {t.arrabonPage.confirmDelivery}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ArrabonPage;
