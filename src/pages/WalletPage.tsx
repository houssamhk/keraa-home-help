import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft,
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock,
  TrendingUp,
  History,
  Plus,
  Minus,
  Loader2,
  CreditCard,
  Upload,
  Copy,
  CheckCircle2,
  Globe,
  Smartphone,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';
import { createSatimPayment, MANUAL_PAYMENT_METHODS, type ManualPaymentMethod } from '@/services/paymentService';

interface WalletPageProps {
  onBack: () => void;
}

interface WalletData {
  id: string;
  balance: number;
  pending_balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

type PaymentCategory = 'online' | 'manual';
type ManualMethod = ManualPaymentMethod;

const transactionTypes: Record<string, { label: string; icon: typeof ArrowUpCircle; color: string }> = {
  deposit: { label: 'إيداع', icon: ArrowDownCircle, color: 'text-green-400' },
  withdrawal: { label: 'سحب', icon: ArrowUpCircle, color: 'text-red-400' },
  escrow_hold: { label: 'حجز عربون', icon: Clock, color: 'text-yellow-400' },
  escrow_release: { label: 'تحرير عربون', icon: TrendingUp, color: 'text-blue-400' },
  payment: { label: 'دفع', icon: CreditCard, color: 'text-purple-400' },
  refund: { label: 'استرداد', icon: ArrowDownCircle, color: 'text-green-400' },
  transfer_in: { label: 'تحويل وارد', icon: ArrowDownCircle, color: 'text-green-400' },
  transfer_out: { label: 'تحويل صادر', icon: ArrowUpCircle, color: 'text-red-400' }
};

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export function WalletPage({ onBack }: WalletPageProps) {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory | null>(null);
  const [selectedManual, setSelectedManual] = useState<ManualMethod | null>(null);
  const [depositStep, setDepositStep] = useState<'amount' | 'category' | 'method' | 'proof' | 'processing' | 'done'>('amount');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check for payment callback status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const ref = params.get('ref');
    
    if (paymentStatus) {
      switch (paymentStatus) {
        case 'success':
          toast.success('تم الدفع بنجاح! ✅ سيتم تحديث رصيدك.');
          break;
        case 'failed':
          toast.error('فشلت عملية الدفع. يرجى المحاولة مرة أخرى.');
          break;
        case 'pending':
          toast.info('عملية الدفع قيد المعالجة...');
          break;
        case 'error':
          toast.error('حدث خطأ في معالجة الدفع.');
          break;
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    setIsLoading(true);

    let { data: walletData } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!walletData) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: user.id })
        .select()
        .single();
      walletData = newWallet;
    }

    if (walletData) {
      setWallet(walletData);
      fetchTransactions(walletData.id);
    }
    setIsLoading(false);
  };

  const fetchTransactions = async (walletId: string) => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setTransactions(data);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('تم النسخ');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setProofUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/deposit-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('payment-proofs')
      .upload(path, file);

    if (error) {
      toast.error('فشل رفع الإثبات');
      setProofUploading(false);
      return;
    }

    setProofUrl(path);
    setProofUploading(false);
    toast.success('تم رفع الإثبات بنجاح');
  };

  // دفع إلكتروني عبر SATIM
  const handleOnlinePayment = async () => {
    if (!wallet || !amount) return;
    
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 100) {
      toast.error('الحد الأدنى للإيداع 100 دج');
      return;
    }

    setIsProcessing(true);
    setDepositStep('processing');

    try {
      const result = await createSatimPayment({
        amount: depositAmount,
        payment_type: 'wallet_deposit',
        reference_id: wallet.id,
        description: `شحن المحفظة - ${depositAmount} دج`,
      });

      if (result.redirect_url) {
        // Redirect to SATIM payment page
        toast.info('جاري توجيهك لصفحة الدفع...');
        window.location.href = result.redirect_url;
      } else if (result.mode === 'development') {
        // SATIM not yet configured
        toast.info(result.message || 'بوابة الدفع الإلكتروني غير مفعلة حالياً');
        setDepositStep('category');
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل في إنشاء عملية الدفع');
      setDepositStep('category');
    } finally {
      setIsProcessing(false);
    }
  };

  // دفع يدوي (CCP, BaridiMob, Dahabia)
  const handleSubmitManualDeposit = async () => {
    if (!wallet || !amount || !selectedManual || !user) return;
    
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 100) {
      toast.error('الحد الأدنى للإيداع 100 دج');
      return;
    }

    setIsProcessing(true);

    try {
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'deposit',
        amount: depositAmount,
        description: `إيداع عبر ${MANUAL_PAYMENT_METHODS[selectedManual].label}`,
        status: 'pending'
      });

      await supabase.from('payment_history').insert({
        user_id: user.id,
        payment_type: 'wallet_deposit',
        reference_id: wallet.id,
        amount: depositAmount,
        payment_method: selectedManual,
        payment_reference: paymentReference || null,
        payment_proof_url: proofUrl || null,
        status: 'pending'
      });

      setDepositStep('done');
      toast.success('تم إرسال طلب الإيداع للمراجعة');
    } catch (error) {
      toast.error('فشل في إرسال الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet || !amount || !selectedManual) return;
    
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (withdrawAmount > wallet.balance) {
      toast.error('رصيد غير كافٍ');
      return;
    }

    setIsProcessing(true);

    try {
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'withdrawal',
        amount: withdrawAmount,
        description: `سحب إلى ${MANUAL_PAYMENT_METHODS[selectedManual].label} - ${paymentReference}`,
        status: 'pending'
      });

      toast.success('تم إرسال طلب السحب. سيتم معالجته خلال 24-48 ساعة');
      resetDialog();
      setShowWithdrawDialog(false);
      fetchWallet();
    } catch (error) {
      toast.error('فشل في عملية السحب');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setAmount('');
    setPaymentCategory(null);
    setSelectedManual(null);
    setDepositStep('amount');
    setPaymentReference('');
    setProofUrl(null);
  };

  const openDepositDialog = () => {
    resetDialog();
    setShowDepositDialog(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3 flex-shrink-0"
      >
        <div className="flex items-center gap-3 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <BackArrow className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-xl font-bold text-foreground">{t.walletPage.title}</h1>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-5 bg-gradient-to-br from-primary/20 to-accent/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-6 h-6 text-primary" />
            <span className="text-muted-foreground text-sm">الرصيد المتاح</span>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">
            {wallet?.balance?.toLocaleString('ar-DZ') || 0}
            <span className="text-sm text-muted-foreground mr-1">دج</span>
          </p>
          {wallet && wallet.pending_balance > 0 && (
            <p className="text-xs text-yellow-400 flex items-center gap-1 mb-3">
              <Clock className="w-3 h-3" />
              {wallet.pending_balance.toLocaleString('ar-DZ')} دج محجوز
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <Button variant="gold" className="flex-1 gap-2 h-10" onClick={openDepositDialog}>
              <Plus className="w-4 h-4" />
              شحن المحفظة
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10"
              onClick={() => { resetDialog(); setShowWithdrawDialog(true); }}
              disabled={!wallet || wallet.balance <= 0}
            >
              <Minus className="w-4 h-4" />
              سحب
            </Button>
          </div>
        </motion.div>
      </motion.header>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">سجل المعاملات</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const txType = transactionTypes[tx.type] || transactionTypes.deposit;
              const Icon = txType.icon;
              const isIncoming = ['deposit', 'refund', 'transfer_in', 'escrow_release'].includes(tx.type);

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isIncoming ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <Icon className={`w-4 h-4 ${txType.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{txType.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </p>
                    {tx.status === 'pending' && (
                      <span className="text-[10px] text-yellow-400">⏳ قيد المراجعة</span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-sm ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                      {isIncoming ? '+' : '-'}{tx.amount.toLocaleString('ar-DZ')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">دج</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={(open) => { if (!open) resetDialog(); setShowDepositDialog(open); }}>
        <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              شحن المحفظة
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {/* Step 1: Amount */}
            {depositStep === 'amount' && (
              <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">المبلغ (دج)</label>
                  <div className="glass-card px-4 py-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="w-full bg-transparent border-none outline-none text-foreground text-lg"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => setAmount(String(qa))}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        amount === String(qa)
                          ? 'bg-primary text-primary-foreground'
                          : 'glass-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {qa.toLocaleString('ar-DZ')} دج
                    </button>
                  ))}
                </div>
                <Button
                  variant="gold"
                  className="w-full"
                  onClick={() => setDepositStep('category')}
                  disabled={!amount || parseFloat(amount) < 100}
                >
                  التالي - اختر طريقة الدفع
                </Button>
              </motion.div>
            )}

            {/* Step 2: Payment Category (Online vs Manual) */}
            {depositStep === 'category' && (
              <motion.div key="category" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  المبلغ: <span className="text-foreground font-bold">{parseFloat(amount).toLocaleString('ar-DZ')} دج</span>
                </p>

                {/* Online Payment - SATIM */}
                <button
                  onClick={() => { setPaymentCategory('online'); handleOnlinePayment(); }}
                  className="w-full glass-card p-4 text-right border border-transparent hover:border-primary/30 transition-all bg-gradient-to-br from-blue-500/10 to-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-primary/20 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">الدفع الإلكتروني</p>
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">فوري</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">CIB / البطاقة الذهبية (Dahabia)</p>
                    </div>
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <CreditCard className="w-3 h-3" /> CIB
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <CreditCard className="w-3 h-3" /> Dahabia
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                      <Shield className="w-3 h-3" /> SATIM آمن
                    </div>
                  </div>
                </button>

                {/* Manual Payment Options */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">أو التحويل اليدوي</span>
                  </div>
                </div>

                {(Object.keys(MANUAL_PAYMENT_METHODS) as ManualMethod[]).map((method) => {
                  const info = MANUAL_PAYMENT_METHODS[method];
                  return (
                    <button
                      key={method}
                      onClick={() => { 
                        setPaymentCategory('manual');
                        setSelectedManual(method);
                        setDepositStep('proof');
                      }}
                      className="w-full glass-card p-3 text-right border border-transparent hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{info.label}</p>
                          <p className="text-[10px] text-muted-foreground">تحويل يدوي - مراجعة خلال 24 ساعة</p>
                        </div>
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}

                <Button variant="glass" className="w-full" onClick={() => setDepositStep('amount')}>
                  رجوع
                </Button>
              </motion.div>
            )}

            {/* Step 3: Upload Proof (Manual only) */}
            {depositStep === 'proof' && selectedManual && (
              <motion.div key="proof" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 mt-4">
                <div className={`glass-card p-4 bg-gradient-to-br ${MANUAL_PAYMENT_METHODS[selectedManual].color} border`}>
                  <p className="text-xs text-muted-foreground mb-1">حوّل المبلغ إلى:</p>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-foreground font-medium text-sm">{MANUAL_PAYMENT_METHODS[selectedManual].accountName}</p>
                  </div>
                  <div className="flex items-center justify-between glass-card p-2 rounded-lg">
                    <p className="text-foreground font-mono text-sm">{MANUAL_PAYMENT_METHODS[selectedManual].accountNumber}</p>
                    <button
                      onClick={() => copyToClipboard(MANUAL_PAYMENT_METHODS[selectedManual].accountNumber, 'account')}
                      className="text-primary p-1"
                    >
                      {copiedField === 'account' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    المبلغ: <span className="text-foreground font-bold">{parseFloat(amount).toLocaleString('ar-DZ')} دج</span>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">{MANUAL_PAYMENT_METHODS[selectedManual].instructions}</p>

                {/* Payment Reference */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">رقم العملية (اختياري)</label>
                  <div className="glass-card px-3 py-2">
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="رقم التحويل أو المرجع"
                      className="w-full bg-transparent border-none outline-none text-foreground text-sm"
                    />
                  </div>
                </div>

                {/* Upload Proof */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">إثبات الدفع</label>
                  {proofUrl ? (
                    <div className="glass-card p-3 flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">تم رفع الإثبات بنجاح</span>
                    </div>
                  ) : (
                    <label className="glass-card p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/30 border border-transparent transition-all">
                      {proofUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">اضغط لرفع صورة أو لقطة شاشة</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadProof} disabled={proofUploading} />
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="glass" className="flex-1" onClick={() => setDepositStep('category')}>
                    رجوع
                  </Button>
                  <Button
                    variant="gold"
                    className="flex-1"
                    onClick={handleSubmitManualDeposit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال طلب الإيداع'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Processing Step */}
            {depositStep === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">جاري تجهيز الدفع...</h3>
                <p className="text-sm text-muted-foreground">
                  سيتم توجيهك لصفحة الدفع الآمنة
                </p>
              </motion.div>
            )}

            {/* Done Step */}
            {depositStep === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">تم إرسال الطلب</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  سيتم مراجعة إثبات الدفع وشحن محفظتك خلال فترة قصيرة
                </p>
                <Button variant="gold" className="w-full" onClick={() => { resetDialog(); setShowDepositDialog(false); fetchWallet(); }}>
                  تم
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={(open) => { if (!open) resetDialog(); setShowWithdrawDialog(open); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-primary" />
              سحب من المحفظة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              الرصيد المتاح: <span className="text-foreground font-bold">{wallet?.balance?.toLocaleString('ar-DZ')} دج</span>
            </p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">المبلغ (دج)</label>
              <div className="glass-card px-3 py-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="w-full bg-transparent border-none outline-none text-foreground text-lg"
                  dir="ltr"
                  max={wallet?.balance}
                />
              </div>
            </div>

            {/* Withdraw method */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">طريقة الاستلام</label>
              <div className="space-y-2">
                {(Object.keys(MANUAL_PAYMENT_METHODS) as ManualMethod[]).map((method) => {
                  const info = MANUAL_PAYMENT_METHODS[method];
                  return (
                    <button
                      key={method}
                      onClick={() => setSelectedManual(method)}
                      className={`w-full glass-card p-3 text-right flex items-center gap-3 border transition-all ${
                        selectedManual === method ? 'border-primary/50 bg-primary/5' : 'border-transparent'
                      }`}
                    >
                      <span className="text-xl">{info.icon}</span>
                      <span className="text-sm font-medium text-foreground">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedManual && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  رقم حسابك ({MANUAL_PAYMENT_METHODS[selectedManual].label})
                </label>
                <div className="glass-card px-3 py-2">
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="رقم حسابك لاستلام المبلغ"
                    className="w-full bg-transparent border-none outline-none text-foreground text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="glass" className="flex-1" onClick={() => { resetDialog(); setShowWithdrawDialog(false); }}>
                إلغاء
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                onClick={handleWithdraw}
                disabled={isProcessing || !amount || !selectedManual || !paymentReference}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد السحب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
