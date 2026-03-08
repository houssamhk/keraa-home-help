import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, ArrowLeft, Plus, Zap, Flame, Droplets, Wifi, Home, 
  Wrench, MoreHorizontal, Check, AlertCircle, Calendar,
  Filter, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, isPast, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';

interface Bill {
  id: string;
  bill_type: string;
  title: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
  notes: string | null;
  recurring: boolean;
}

interface BillsPageProps {
  onBack: () => void;
}

export function BillsPage({ onBack }: BillsPageProps) {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const billTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
    electricity: { icon: Zap, label: t.billsPage.electricity, color: 'text-yellow-500' },
    gas: { icon: Flame, label: t.billsPage.gas, color: 'text-orange-500' },
    water: { icon: Droplets, label: t.billsPage.water, color: 'text-blue-500' },
    internet: { icon: Wifi, label: t.billsPage.internet, color: 'text-purple-500' },
    rent: { icon: Home, label: t.billsPage.rent, color: 'text-primary' },
    maintenance: { icon: Wrench, label: t.billsPage.maintenance, color: 'text-green-500' },
    other: { icon: MoreHorizontal, label: t.billsPage.other, color: 'text-muted-foreground' }
  };

  const paymentMethods = [
    { value: 'cash', label: t.billsPage.cash },
    { value: 'ccp', label: t.billsPage.ccp },
    { value: 'baridimob', label: t.billsPage.baridimob },
    { value: 'bank_transfer', label: t.billsPage.bankTransfer }
  ];

  const [formData, setFormData] = useState({
    bill_type: 'electricity',
    title: '',
    amount: '',
    due_date: '',
    recurring: false,
    notes: ''
  });

  useEffect(() => {
    if (user) fetchBills();
  }, [user]);

  const fetchBills = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (error) {
      toast.error(t.billsPage.errorLoading);
    } else {
      const updatedBills = (data || []).map(bill => {
        if (bill.status === 'pending' && isPast(new Date(bill.due_date)) && !isToday(new Date(bill.due_date))) {
          return { ...bill, status: 'overdue' };
        }
        return bill;
      });
      setBills(updatedBills);
    }
    setIsLoading(false);
  };

  const handleAddBill = async () => {
    if (!user || !formData.title || !formData.amount || !formData.due_date) {
      toast.error(t.requiredFields);
      return;
    }
    const { error } = await supabase.from('bills').insert({
      user_id: user.id,
      bill_type: formData.bill_type,
      title: formData.title,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date,
      recurring: formData.recurring,
      notes: formData.notes || null
    });
    if (error) {
      toast.error(t.billsPage.errorAdding);
    } else {
      toast.success(t.billsPage.addedSuccess);
      setIsAddOpen(false);
      setFormData({ bill_type: 'electricity', title: '', amount: '', due_date: '', recurring: false, notes: '' });
      fetchBills();
    }
  };

  const handleMarkAsPaid = async (billId: string, paymentMethod: string) => {
    const { error } = await supabase
      .from('bills')
      .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0], payment_method: paymentMethod })
      .eq('id', billId);
    if (error) {
      toast.error(t.billsPage.errorUpdating);
    } else {
      toast.success(t.billsPage.paidSuccess);
      fetchBills();
    }
  };

  const getFilteredBills = () => {
    switch (selectedTab) {
      case 'pending': return bills.filter(b => b.status === 'pending');
      case 'overdue': return bills.filter(b => b.status === 'overdue');
      case 'paid': return bills.filter(b => b.status === 'paid');
      default: return bills;
    }
  };

  const filteredBills = getFilteredBills();
  const totalPending = bills.filter(b => b.status === 'pending' || b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0);
  const totalPaidThisMonth = bills.filter(b => b.status === 'paid' && b.paid_date && new Date(b.paid_date).getMonth() === new Date().getMonth()).reduce((sum, b) => sum + b.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-500/20 text-green-500">{t.billsPage.paid}</Badge>;
      case 'overdue': return <Badge className="bg-destructive/20 text-destructive">{t.billsPage.overdue}</Badge>;
      default: return <Badge className="bg-yellow-500/20 text-yellow-500">{t.billsPage.pending}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={onBack}><BackArrow className="w-5 h-5" /></Button>
            <h1 className="font-serif text-2xl font-bold text-foreground">{t.billsPage.title}</h1>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{t.billsPage.addBill}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>{t.billsPage.addNewBill}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t.billsPage.billType}</Label>
                  <Select value={formData.bill_type} onValueChange={(value) => setFormData({ ...formData, bill_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(billTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2"><config.icon className={`w-4 h-4 ${config.color}`} />{config.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.billsPage.billTitle}</Label>
                  <Input placeholder={t.billsPage.billTitlePlaceholder} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.billsPage.amount}</Label>
                  <Input type="number" placeholder="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.billsPage.dueDate}</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t.billsPage.recurringBill}</Label>
                  <Switch checked={formData.recurring} onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.notesOptional}</Label>
                  <Input placeholder={t.anyAdditionalNotes} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleAddBill}>{t.billsPage.addTheBill}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-destructive" /><span className="text-sm text-muted-foreground">{t.billsPage.due}</span></div>
              <p className="text-xl font-bold text-foreground">{totalPending.toLocaleString()} {t.currency}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Check className="w-4 h-4 text-green-500" /><span className="text-sm text-muted-foreground">{t.billsPage.paidThisMonth}</span></div>
              <p className="text-xl font-bold text-foreground">{totalPaidThisMonth.toLocaleString()} {t.currency}</p>
            </CardContent>
          </Card>
        </div>
      </motion.header>

      <div className="px-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">{t.all}</TabsTrigger>
            <TabsTrigger value="pending">{t.billsPage.pending}</TabsTrigger>
            <TabsTrigger value="overdue">{t.billsPage.overdue}</TabsTrigger>
            <TabsTrigger value="paid">{t.billsPage.paid}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-20">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t.billsPage.noBills}</p>
            <p className="text-sm text-muted-foreground mt-2">{t.billsPage.addFirstBill}</p>
          </div>
        ) : (
          filteredBills.map((bill, index) => {
            const config = billTypeConfig[bill.bill_type] || billTypeConfig.other;
            const Icon = config.icon;
            return (
              <motion.div key={bill.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className={`${bill.status === 'overdue' ? 'border-destructive/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${config.color}`}><Icon className="w-5 h-5" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-foreground">{bill.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{format(new Date(bill.due_date), 'd MMMM yyyy', { locale: ar })}</span>
                              {bill.recurring && <Badge variant="outline" className="text-xs">{t.billsPage.recurring}</Badge>}
                            </div>
                          </div>
                          {getStatusBadge(bill.status)}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-lg font-bold text-primary">{bill.amount.toLocaleString()} {t.currency}</p>
                          {bill.status !== 'paid' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1"><Check className="w-3 h-3" />{t.billsPage.markAsPaid}</Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xs">
                                <DialogHeader><DialogTitle>{t.billsPage.markAsPaidTitle}</DialogTitle></DialogHeader>
                                <div className="space-y-3 mt-4">
                                  <p className="text-sm text-muted-foreground">{t.billsPage.selectPaymentMethod}</p>
                                  {paymentMethods.map((method) => (
                                    <Button key={method.value} variant="outline" className="w-full justify-start" onClick={() => handleMarkAsPaid(bill.id, method.value)}>{method.label}</Button>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
