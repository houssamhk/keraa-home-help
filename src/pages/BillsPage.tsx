import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Plus, Zap, Flame, Droplets, Wifi, Home, 
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
import { format, isPast, isToday, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

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

const billTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  electricity: { icon: Zap, label: 'كهرباء', color: 'text-yellow-500' },
  gas: { icon: Flame, label: 'غاز', color: 'text-orange-500' },
  water: { icon: Droplets, label: 'ماء', color: 'text-blue-500' },
  internet: { icon: Wifi, label: 'إنترنت', color: 'text-purple-500' },
  rent: { icon: Home, label: 'إيجار', color: 'text-primary' },
  maintenance: { icon: Wrench, label: 'صيانة', color: 'text-green-500' },
  other: { icon: MoreHorizontal, label: 'أخرى', color: 'text-muted-foreground' }
};

const paymentMethods = [
  { value: 'cash', label: 'نقداً' },
  { value: 'ccp', label: 'CCP' },
  { value: 'baridimob', label: 'BaridiMob' },
  { value: 'bank_transfer', label: 'تحويل بنكي' }
];

export function BillsPage({ onBack }: BillsPageProps) {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState({
    bill_type: 'electricity',
    title: '',
    amount: '',
    due_date: '',
    recurring: false,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchBills();
    }
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
      console.error('Error fetching bills:', error);
      toast.error('خطأ في تحميل الفواتير');
    } else {
      // Update overdue status
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
      toast.error('يرجى ملء جميع الحقول المطلوبة');
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
      console.error('Error adding bill:', error);
      toast.error('خطأ في إضافة الفاتورة');
    } else {
      toast.success('تم إضافة الفاتورة بنجاح');
      setIsAddOpen(false);
      setFormData({
        bill_type: 'electricity',
        title: '',
        amount: '',
        due_date: '',
        recurring: false,
        notes: ''
      });
      fetchBills();
    }
  };

  const handleMarkAsPaid = async (billId: string, paymentMethod: string) => {
    const { error } = await supabase
      .from('bills')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod
      })
      .eq('id', billId);

    if (error) {
      toast.error('خطأ في تحديث الفاتورة');
    } else {
      toast.success('تم تسجيل الدفع بنجاح');
      fetchBills();
    }
  };

  const getFilteredBills = () => {
    switch (selectedTab) {
      case 'pending':
        return bills.filter(b => b.status === 'pending');
      case 'overdue':
        return bills.filter(b => b.status === 'overdue');
      case 'paid':
        return bills.filter(b => b.status === 'paid');
      default:
        return bills;
    }
  };

  const filteredBills = getFilteredBills();

  const totalPending = bills
    .filter(b => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalPaidThisMonth = bills
    .filter(b => b.status === 'paid' && b.paid_date && new Date(b.paid_date).getMonth() === new Date().getMonth())
    .reduce((sum, b) => sum + b.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-500">مدفوعة</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive/20 text-destructive">متأخرة</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-500">معلقة</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={onBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="font-serif text-2xl font-bold text-foreground">الفواتير</h1>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>إضافة فاتورة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>نوع الفاتورة</Label>
                  <Select
                    value={formData.bill_type}
                    onValueChange={(value) => setFormData({ ...formData, bill_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(billTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className={`w-4 h-4 ${config.color}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    placeholder="مثال: فاتورة كهرباء شهر ديسمبر"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>المبلغ (دج)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>فاتورة متكررة</Label>
                  <Switch
                    checked={formData.recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Input
                    placeholder="أي ملاحظات إضافية"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button className="w-full" onClick={handleAddBill}>
                  إضافة الفاتورة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-muted-foreground">مستحقة</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {totalPending.toLocaleString('ar-DZ')} دج
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">مدفوعة هذا الشهر</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {totalPaidThisMonth.toLocaleString('ar-DZ')} دج
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="px-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="pending">معلقة</TabsTrigger>
            <TabsTrigger value="overdue">متأخرة</TabsTrigger>
            <TabsTrigger value="paid">مدفوعة</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bills List */}
      <div className="px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-20">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد فواتير</p>
            <p className="text-sm text-muted-foreground mt-2">
              أضف فاتورتك الأولى لتتبع مصاريفك
            </p>
          </div>
        ) : (
          filteredBills.map((bill, index) => {
            const config = billTypeConfig[bill.bill_type] || billTypeConfig.other;
            const Icon = config.icon;
            
            return (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`${bill.status === 'overdue' ? 'border-destructive/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-foreground">{bill.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(bill.due_date), 'd MMMM yyyy', { locale: ar })}
                              </span>
                              {bill.recurring && (
                                <Badge variant="outline" className="text-xs">متكررة</Badge>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(bill.status)}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-lg font-bold text-primary">
                            {bill.amount.toLocaleString('ar-DZ')} دج
                          </p>
                          {bill.status !== 'paid' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1">
                                  <Check className="w-3 h-3" />
                                  تسجيل الدفع
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xs">
                                <DialogHeader>
                                  <DialogTitle>تسجيل دفع الفاتورة</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                  <p className="text-sm text-muted-foreground">
                                    اختر طريقة الدفع:
                                  </p>
                                  {paymentMethods.map((method) => (
                                    <Button
                                      key={method.value}
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => handleMarkAsPaid(bill.id, method.value)}
                                    >
                                      {method.label}
                                    </Button>
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