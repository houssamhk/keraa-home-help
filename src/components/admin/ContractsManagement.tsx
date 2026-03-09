import { useState, useEffect } from 'react';
import { FileText, Search, Loader2, Eye, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Contract {
  id: string;
  title: string;
  contract_type: string;
  status: string;
  landlord_id: string;
  tenant_id: string;
  property_id: string | null;
  start_date: string;
  end_date: string | null;
  monthly_amount: number | null;
  total_amount: number | null;
  landlord_signed: boolean;
  tenant_signed: boolean;
  created_at: string;
}

export function ContractsManagement() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setContracts(data);
    setLoading(false);
  };

  const handleUpdateStatus = async (contractId: string, newStatus: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('contracts')
      .update({ status: newStatus })
      .eq('id', contractId);
    
    if (!error) {
      toast.success('تم تحديث حالة العقد');
      fetchContracts();
      setDetailDialog(false);
    } else {
      toast.error('فشل في تحديث العقد');
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">نشط</Badge>;
      case 'signed': return <Badge className="bg-green-600">موقع</Badge>;
      case 'pending': return <Badge variant="secondary">معلق</Badge>;
      case 'completed': return <Badge variant="outline">مكتمل</Badge>;
      case 'cancelled': return <Badge variant="destructive">ملغي</Badge>;
      case 'expired': return <Badge variant="destructive">منتهي</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active' || c.status === 'signed').length,
    pending: contracts.filter(c => c.status === 'pending').length,
    expired: contracts.filter(c => c.status === 'expired' || c.status === 'cancelled').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">إجمالي</p>
        </CardContent></Card>
        <Card className="border-green-500/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{stats.active}</p>
          <p className="text-xs text-muted-foreground">نشطة</p>
        </CardContent></Card>
        <Card className="border-yellow-500/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">معلقة</p>
        </CardContent></Card>
        <Card className="border-destructive/30"><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{stats.expired}</p>
          <p className="text-xs text-muted-foreground">منتهية/ملغية</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالعنوان..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="signed">موقع</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            العقود ({filteredContracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredContracts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">لا توجد عقود</p>
          )}
          {filteredContracts.map((contract) => (
            <div key={contract.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-foreground">{contract.title}</p>
                  {getStatusBadge(contract.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{contract.contract_type === 'rental' ? 'إيجار' : 'خدمة'}</span>
                  <span>{format(new Date(contract.start_date), 'dd/MM/yyyy')}</span>
                  {contract.monthly_amount && <span>{contract.monthly_amount.toLocaleString()} دج/شهر</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span>{contract.landlord_signed ? '✅ المالك وقّع' : '⏳ المالك لم يوقع'}</span>
                  <span>{contract.tenant_signed ? '✅ المستأجر وقّع' : '⏳ المستأجر لم يوقع'}</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedContract(contract); setDetailDialog(true); }}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تفاصيل العقد
            </DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <h3 className="font-bold">{selectedContract.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">النوع: </span>{selectedContract.contract_type === 'rental' ? 'إيجار' : 'خدمة'}</div>
                  <div><span className="text-muted-foreground">الحالة: </span>{getStatusBadge(selectedContract.status)}</div>
                  <div><span className="text-muted-foreground">البداية: </span>{format(new Date(selectedContract.start_date), 'dd/MM/yyyy')}</div>
                  <div><span className="text-muted-foreground">النهاية: </span>{selectedContract.end_date ? format(new Date(selectedContract.end_date), 'dd/MM/yyyy') : '-'}</div>
                  {selectedContract.monthly_amount && <div><span className="text-muted-foreground">شهري: </span>{selectedContract.monthly_amount.toLocaleString()} دج</div>}
                  {selectedContract.total_amount && <div><span className="text-muted-foreground">إجمالي: </span>{selectedContract.total_amount.toLocaleString()} دج</div>}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">المالك:</span>
                <code className="text-xs bg-muted px-1 rounded">{selectedContract.landlord_id.slice(0, 8)}...</code>
                {selectedContract.landlord_signed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">المستأجر:</span>
                <code className="text-xs bg-muted px-1 rounded">{selectedContract.tenant_id.slice(0, 8)}...</code>
                {selectedContract.tenant_signed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
              </div>

              {/* Admin Actions */}
              <div className="border-t border-border pt-4">
                <h4 className="font-medium text-sm mb-2">إجراءات المسؤول:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedContract.status !== 'active' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedContract.id, 'active')} disabled={processing}>
                      <CheckCircle className="w-4 h-4 ml-1" />تفعيل
                    </Button>
                  )}
                  {selectedContract.status !== 'cancelled' && (
                    <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedContract.id, 'cancelled')} disabled={processing}>
                      <XCircle className="w-4 h-4 ml-1" />إلغاء
                    </Button>
                  )}
                  {selectedContract.status !== 'completed' && (
                    <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(selectedContract.id, 'completed')} disabled={processing}>
                      إنهاء
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
