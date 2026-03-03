import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Upload, CheckCircle, Clock, XCircle, AlertCircle, Camera, FileText, CreditCard, Building2, Loader2 } from 'lucide-react';
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
  const { getSignedProofUrl } = usePaymentProofUrl();
  const [arrabons, setArrabons] = useState<Arrabon[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedProofUrls, setSignedProofUrls] = useState<Record<string, string | null>>({});
  
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

  // Load signed URLs for payment proofs whenever arrabons change
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
      // Fetch arrabons
      const { data: arrabonData, error: arrabonError } = await supabase
        .from('arrabons')
        .select('*')
        .order('created_at', { ascending: false });

      if (arrabonError) throw arrabonError;
      setArrabons(arrabonData || []);

      // Fetch contracts for the form
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, monthly_amount, landlord_id, tenant_id')
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`);

      if (contractError) throw contractError;
      setContracts(contractData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
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

    // Store the file path only (not a public URL) since bucket is private
    return fileName;
  };

  const handleSubmitArrabon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) {
      toast({
        title: 'خطأ',
        description: 'يرجى رفع صورة إثبات الدفع',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload payment proof
      const proofUrl = await uploadPaymentProof(selectedFile);

      // Get contract details
      const contract = contracts.find(c => c.id === formData.contract_id);
      if (!contract) throw new Error('العقد غير موجود');

      // Create arrabon record
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
        title: 'تم الإرسال',
        description: 'تم إرسال إثبات العربون للمراجعة'
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
        title: 'خطأ',
        description: 'فشل في إرسال العربون',
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
        title: action === 'verify' ? 'تم التحقق' : 'تم الرفض',
        description: action === 'verify' ? 'تم التحقق من العربون بنجاح' : 'تم رفض العربون'
      });

      fetchData();
    } catch (error) {
      console.error('Error updating arrabon:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة العربون',
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
        title: 'تم التسليم',
        description: 'تم تأكيد تسليم المفاتيح وإطلاق العربون'
      });

      fetchData();
    } catch (error) {
      console.error('Error releasing arrabon:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة العربون',
        variant: 'destructive'
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400', label: 'في الانتظار' };
      case 'submitted':
        return { icon: AlertCircle, color: 'bg-blue-500/20 text-blue-400', label: 'قيد المراجعة' };
      case 'verified':
        return { icon: CheckCircle, color: 'bg-green-500/20 text-green-400', label: 'تم التحقق' };
      case 'rejected':
        return { icon: XCircle, color: 'bg-red-500/20 text-red-400', label: 'مرفوض' };
      case 'released':
        return { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400', label: 'تم التسليم' };
      default:
        return { icon: Clock, color: 'bg-muted text-muted-foreground', label: status };
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'baridimob': return 'بريدي موب';
      case 'ccp': return 'CCP';
      case 'cash': return 'نقدي';
      default: return method;
    }
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
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">نظام العربون</h1>
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
                <h3 className="font-bold text-lg">نظام العربون الآمن</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ارفع صورة التحويل عبر بريدي موب أو CCP وسيتم التحقق منها قبل تأكيد الحجز
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
            إرسال عربون جديد
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
                  إرسال إثبات الدفع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitArrabon} className="space-y-4">
                  {/* Contract Selection */}
                  <div className="space-y-2">
                    <Label>اختر العقد</Label>
                    <Select
                      value={formData.contract_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contract_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العقد" />
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

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>مبلغ العربون (دج)</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="أدخل المبلغ"
                      required
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>طريقة الدفع</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baridimob">بريدي موب</SelectItem>
                        <SelectItem value="ccp">CCP</SelectItem>
                        <SelectItem value="cash">نقدي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transaction Reference */}
                  <div className="space-y-2">
                    <Label>رقم العملية (اختياري)</Label>
                    <Input
                      value={formData.payment_reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
                      placeholder="رقم التحويل أو العملية"
                    />
                  </div>

                  {/* Payment Proof Upload */}
                  <div className="space-y-2">
                    <Label>صورة إثبات الدفع *</Label>
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
                            إزالة الصورة
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground mb-2">اضغط لرفع صورة التحويل</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG حتى 5MB</p>
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

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>ملاحظات (اختياري)</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="أي ملاحظات إضافية..."
                      rows={3}
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !selectedFile}
                      className="flex-1 bg-primary"
                    >
                      {isSubmitting ? 'جاري الإرسال...' : 'إرسال العربون'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Arrabons List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">سجل العربون</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : arrabons.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد عربونات حتى الآن</p>
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
                          <h3 className="font-bold">{arrabon.amount.toLocaleString()} دج</h3>
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
                          رقم العملية: {arrabon.payment_reference}
                        </p>
                      )}

                      {arrabon.payment_proof_url && signedProofUrls[arrabon.id] && (
                        <div className="mb-3">
                          <img
                            src={signedProofUrls[arrabon.id]!}
                            alt="Payment proof"
                            className="max-h-32 rounded-lg border border-border"
                          />
                          <p className="text-xs text-muted-foreground mt-1">⚠️ رابط آمن ينتهي خلال 5 دقائق</p>
                        </div>
                      )}

                      {arrabon.rejection_reason && (
                        <div className="p-3 bg-red-500/10 rounded-lg mb-3">
                          <p className="text-sm text-red-400">
                            سبب الرفض: {arrabon.rejection_reason}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {new Date(arrabon.created_at).toLocaleDateString('ar-DZ')}
                      </p>

                      {/* Owner Actions */}
                      {canVerify && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleVerifyArrabon(arrabon.id, 'verify')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تأكيد الاستلام
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => {
                              const reason = prompt('سبب الرفض:');
                              if (reason) handleVerifyArrabon(arrabon.id, 'reject', reason);
                            }}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
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
                          تأكيد التسليم وإطلاق العربون
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
