import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock,
  TrendingUp,
  History,
  Plus,
  Minus,
  Loader2,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

export function WalletPage({ onBack }: WalletPageProps) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWallet();
    }
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    setIsLoading(true);

    // Get or create wallet
    let { data: walletData, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!walletData) {
      // Create wallet
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (!createError) {
        walletData = newWallet;
      }
    }

    if (walletData) {
      setWallet(walletData);
      fetchTransactions(walletData.id);
    }

    setIsLoading(false);
  };

  const fetchTransactions = async (walletId: string) => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data);
    }
  };

  const handleDeposit = async () => {
    if (!wallet || !amount) return;
    
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    setIsProcessing(true);

    try {
      // Create transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'deposit',
          amount: depositAmount,
          description: 'إيداع في المحفظة',
          status: 'completed'
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance + depositAmount })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      toast.success(`تم إيداع ${depositAmount.toLocaleString('ar-DZ')} دج بنجاح`);
      setShowDepositDialog(false);
      setAmount('');
      fetchWallet();
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('فشل في عملية الإيداع');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet || !amount) return;
    
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
      // Create transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount: withdrawAmount,
          description: 'سحب من المحفظة',
          status: 'pending'
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - withdrawAmount })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      toast.success('تم إرسال طلب السحب. سيتم معالجته قريباً');
      setShowWithdrawDialog(false);
      setAmount('');
      fetchWallet();
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('فشل في عملية السحب');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-6">
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">المحفظة</h1>
            <p className="text-sm text-muted-foreground">إدارة رصيدك ومعاملاتك</p>
          </div>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 bg-gradient-to-br from-primary/20 to-accent/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-8 h-8 text-primary" />
            <span className="text-muted-foreground">الرصيد المتاح</span>
          </div>
          <p className="text-4xl font-bold text-foreground mb-2">
            {wallet?.balance?.toLocaleString('ar-DZ') || 0}
            <span className="text-lg text-muted-foreground mr-2">دج</span>
          </p>
          {wallet && wallet.pending_balance > 0 && (
            <p className="text-sm text-yellow-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {wallet.pending_balance.toLocaleString('ar-DZ')} دج محجوز
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="gold"
              className="flex-1 gap-2"
              onClick={() => setShowDepositDialog(true)}
            >
              <Plus className="w-4 h-4" />
              إيداع
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setShowWithdrawDialog(true)}
              disabled={!wallet || wallet.balance <= 0}
            >
              <Minus className="w-4 h-4" />
              سحب
            </Button>
          </div>
        </motion.div>
      </motion.header>

      {/* Transactions */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">سجل المعاملات</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const txType = transactionTypes[tx.type] || transactionTypes.deposit;
              const Icon = txType.icon;
              const isIncoming = ['deposit', 'refund', 'transfer_in', 'escrow_release'].includes(tx.type);

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-4 flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isIncoming ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <Icon className={`w-5 h-5 ${txType.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{txType.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-muted-foreground mt-1">{tx.description}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                      {isIncoming ? '+' : '-'}{tx.amount.toLocaleString('ar-DZ')}
                    </p>
                    <p className="text-xs text-muted-foreground">دج</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              إيداع في المحفظة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
            <p className="text-xs text-muted-foreground">
              ملاحظة: هذه نسخة تجريبية. في الإصدار النهائي سيتم الربط مع بوابة دفع حقيقية.
            </p>
            <div className="flex gap-3">
              <Button variant="glass" className="flex-1" onClick={() => setShowDepositDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="gold"
                className="flex-1 gap-2"
                onClick={handleDeposit}
                disabled={isProcessing || !amount}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الإيداع'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-primary" />
              سحب من المحفظة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              الرصيد المتاح: <span className="text-foreground font-bold">{wallet?.balance?.toLocaleString('ar-DZ')} دج</span>
            </div>
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
                  max={wallet?.balance}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم معالجة طلب السحب خلال 24-48 ساعة
            </p>
            <div className="flex gap-3">
              <Button variant="glass" className="flex-1" onClick={() => setShowWithdrawDialog(false)}>
                إلغاء
              </Button>
              <Button
                variant="gold"
                className="flex-1 gap-2"
                onClick={handleWithdraw}
                disabled={isProcessing || !amount}
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
