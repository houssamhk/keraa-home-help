import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Loader2,
  Pen,
  Star,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ReviewDialog } from '@/components/reviews/ReviewDialog';
import { exportContractToPdf } from '@/utils/contractPdfExport';

interface Contract {
  id: string;
  title: string;
  description: string | null;
  contract_type: 'rental' | 'service';
  start_date: string;
  end_date: string | null;
  monthly_amount: number | null;
  total_amount: number | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  landlord_signed: boolean;
  tenant_signed: boolean;
  landlord_id: string;
  tenant_id: string;
  created_at: string;
}

interface ContractsPageProps {
  onBack: () => void;
  onCreateContract: () => void;
}

export function ContractsPage({ onBack, onCreateContract }: ContractsPageProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setContracts(data as Contract[]);
    }
    setIsLoading(false);
  };

  const signContract = async (contractId: string, isLandlord: boolean) => {
    const updateField = isLandlord ? {
      landlord_signed: true,
      landlord_signed_at: new Date().toISOString()
    } : {
      tenant_signed: true,
      tenant_signed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('contracts')
      .update(updateField)
      .eq('id', contractId);

    if (!error) {
      // Check if both parties signed
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        const bothSigned = isLandlord 
          ? contract.tenant_signed 
          : contract.landlord_signed;
        
        if (bothSigned) {
          await supabase
            .from('contracts')
            .update({ status: 'active' })
            .eq('id', contractId);
        }
      }
      
      fetchContracts();
      toast({
        title: 'تم التوقيع',
        description: 'تم توقيع العقد بنجاح'
      });
    }
  };

  const getStatusConfig = (status: Contract['status']) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'في انتظار التوقيع' };
      case 'active':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', label: 'ساري المفعول' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/20', label: 'مكتمل' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'ملغي' };
      case 'disputed':
        return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/20', label: 'متنازع عليه' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
    }
  };

  const filteredContracts = contracts.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
            <h1 className="font-serif text-2xl font-bold text-foreground">العقود</h1>
          </div>
          <Button variant="gold" size="sm" onClick={onCreateContract} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>إنشاء عقد</span>
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'pending', label: 'قيد الانتظار' },
            { id: 'active', label: 'ساري' },
            { id: 'completed', label: 'مكتمل' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.header>

      {/* Contracts List */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-8 text-center"
          >
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">لا توجد عقود</p>
            <p className="text-sm text-muted-foreground mb-4">
              {filter === 'all' 
                ? 'أنشئ أول عقد لك الآن' 
                : 'لا توجد عقود في هذه الحالة'}
            </p>
            {filter === 'all' && (
              <Button variant="gold" onClick={onCreateContract} className="gap-2">
                <Plus className="w-4 h-4" />
                <span>إنشاء عقد</span>
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract, index) => {
              const statusConfig = getStatusConfig(contract.status);
              const StatusIcon = statusConfig.icon;
              const isLandlord = contract.landlord_id === user?.id;
              const hasSigned = isLandlord ? contract.landlord_signed : contract.tenant_signed;
              const canSign = contract.status === 'pending' && !hasSigned;

              return (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-foreground">{contract.title}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {contract.contract_type === 'rental' ? 'عقد إيجار' : 'عقد خدمة'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(contract.start_date)}
                    </span>
                    {contract.monthly_amount && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {contract.monthly_amount.toLocaleString('ar-DZ')} دج/شهر
                      </span>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="flex items-center gap-4 text-xs mb-3">
                    <span className={contract.landlord_signed ? 'text-green-500' : 'text-muted-foreground'}>
                      المالك: {contract.landlord_signed ? '✓ موقّع' : 'لم يوقّع'}
                    </span>
                    <span className={contract.tenant_signed ? 'text-green-500' : 'text-muted-foreground'}>
                      المستأجر: {contract.tenant_signed ? '✓ موقّع' : 'لم يوقّع'}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="flex gap-2">
                    {canSign && (
                      <Button
                        variant="gold"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => signContract(contract.id, isLandlord)}
                      >
                        <Pen className="w-4 h-4" />
                        <span>توقيع العقد</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        exportContractToPdf(
                          contract as any,
                          { name: isLandlord ? (profile?.full_name || 'المالك') : 'الطرف الآخر', role: 'landlord' },
                          { name: !isLandlord ? (profile?.full_name || 'المستأجر') : 'الطرف الآخر', role: 'tenant' }
                        );
                        toast({
                          title: 'تم تصدير العقد',
                          description: 'تم حفظ العقد كملف PDF'
                        });
                      }}
                    >
                      <Download className="w-4 h-4" />
                      <span>تصدير PDF</span>
                    </Button>
                    {contract.status === 'completed' && (
                      <ReviewDialog
                        contractId={contract.id}
                        reviewedId={isLandlord ? contract.tenant_id : contract.landlord_id}
                        reviewedName={isLandlord ? 'المستأجر' : 'المالك'}
                        reviewerRole={isLandlord ? 'owner' : 'tenant'}
                        onSuccess={fetchContracts}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
