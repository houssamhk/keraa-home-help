import { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle, XCircle, Clock, Search, Eye, 
  Download, Filter, Calendar, DollarSign, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PaymentRecord {
  id: string;
  user_id: string;
  payment_type: string;
  reference_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

interface FeaturedListing {
  id: string;
  property_id: string;
  user_id: string;
  duration_days: number;
  price_paid: number;
  payment_method: string;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: string;
  created_at: string;
}

interface AgencySubscription {
  id: string;
  user_id: string;
  agency_name: string;
  package_id: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

interface VerificationRequest {
  id: string;
  requester_id: string;
  property_id: string;
  service_id: string;
  price_paid: number;
  payment_method: string;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: string;
  created_at: string;
}

export function PaymentManagement() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>([]);
  const [agencySubscriptions, setAgencySubscriptions] = useState<AgencySubscription[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialogs
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<{ type: string; id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pendingPayments: 0,
    totalPending: 0,
    approvedToday: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchAllPayments();
  }, []);

  const fetchAllPayments = async () => {
    setIsLoading(true);
    
    await Promise.all([
      fetchPaymentHistory(),
      fetchFeaturedListings(),
      fetchAgencySubscriptions(),
      fetchVerificationRequests()
    ]);
    
    setIsLoading(false);
  };

  const fetchPaymentHistory = async () => {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPayments(data);
      
      const pending = data.filter(p => p.status === 'pending');
      const today = new Date().toISOString().split('T')[0];
      const approvedToday = data.filter(p => 
        p.status === 'verified' && 
        p.verified_at?.startsWith(today)
      );
      
      setStats(prev => ({
        ...prev,
        pendingPayments: pending.length,
        totalPending: pending.reduce((sum, p) => sum + p.amount, 0),
        approvedToday: approvedToday.length,
        totalRevenue: data.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0)
      }));
    }
  };

  const fetchFeaturedListings = async () => {
    const { data, error } = await supabase
      .from('featured_listings')
      .select('*')
      .in('status', ['pending', 'active', 'expired'])
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setFeaturedListings(data);
    }
  };

  const fetchAgencySubscriptions = async () => {
    const { data, error } = await supabase
      .from('agency_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAgencySubscriptions(data);
    }
  };

  const fetchVerificationRequests = async () => {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setVerificationRequests(data);
    }
  };

  const handleViewProof = (proofUrl: string | null) => {
    if (proofUrl) {
      setSelectedProofUrl(proofUrl);
      setProofDialogOpen(true);
    } else {
      toast.error('لا يوجد إثبات دفع');
    }
  };

  const handleApprovePayment = async (type: string, id: string) => {
    setProcessingAction(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      
      if (type === 'featured') {
        const listing = featuredListings.find(f => f.id === id);
        if (listing) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + listing.duration_days);
          
          await supabase
            .from('featured_listings')
            .update({ 
              status: 'active',
              starts_at: now,
              expires_at: expiresAt.toISOString(),
              verified_at: now,
              verified_by: user?.id
            })
            .eq('id', id);
        }
      } else if (type === 'agency') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        
        await supabase
          .from('agency_subscriptions')
          .update({ 
            status: 'active',
            starts_at: now,
            expires_at: expiresAt.toISOString(),
            verified_at: now,
            verified_by: user?.id,
            last_payment_at: now
          })
          .eq('id', id);
      } else if (type === 'verification') {
        await supabase
          .from('verification_requests')
          .update({ 
            status: 'paid',
            paid_at: now
          })
          .eq('id', id);
      } else if (type === 'payment') {
        await supabase
          .from('payment_history')
          .update({ 
            status: 'verified',
            verified_at: now,
            verified_by: user?.id
          })
          .eq('id', id);
      }
      
      toast.success('تم اعتماد الدفع بنجاح');
      fetchAllPayments();
    } catch (error) {
      toast.error('حدث خطأ أثناء اعتماد الدفع');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      toast.error('يرجى إدخال سبب الرفض');
      return;
    }
    
    setProcessingAction(true);
    
    try {
      const { type, id } = selectedPayment;
      
      if (type === 'featured') {
        await supabase
          .from('featured_listings')
          .update({ status: 'rejected' })
          .eq('id', id);
      } else if (type === 'agency') {
        await supabase
          .from('agency_subscriptions')
          .update({ 
            status: 'rejected',
            rejection_reason: rejectionReason
          })
          .eq('id', id);
      } else if (type === 'verification') {
        await supabase
          .from('verification_requests')
          .update({ status: 'cancelled' })
          .eq('id', id);
      } else if (type === 'payment') {
        await supabase
          .from('payment_history')
          .update({ 
            status: 'rejected',
            rejection_reason: rejectionReason
          })
          .eq('id', id);
      }
      
      toast.success('تم رفض الدفع');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedPayment(null);
      fetchAllPayments();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض الدفع');
    } finally {
      setProcessingAction(false);
    }
  };

  const openRejectDialog = (type: string, id: string) => {
    setSelectedPayment({ type, id });
    setRejectDialogOpen(true);
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'featured_listing': return 'تمييز إعلان';
      case 'agency_subscription': return 'اشتراك وكالة';
      case 'verification_service': return 'خدمة توثيق';
      case 'wallet_deposit': return 'إيداع محفظة';
      default: return type;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'wallet': return 'المحفظة';
      case 'ccp': return 'CCP';
      case 'baridimob': return 'BaridiMob';
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />معلق</Badge>;
      case 'verified':
      case 'active':
      case 'paid':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 ml-1" />مُعتمد</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingFeatured = featuredListings.filter(f => f.status === 'pending' && f.payment_method !== 'wallet');
  const pendingAgency = agencySubscriptions.filter(a => a.status === 'pending');
  const pendingVerification = verificationRequests.filter(v => v.status === 'pending' && v.payment_method !== 'wallet');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pendingPayments}</p>
              <p className="text-xs text-muted-foreground">مدفوعات معلقة</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/20 to-accent/10 border-accent/30">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-accent-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">دج معلق</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/10 border-secondary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-secondary-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.approvedToday}</p>
              <p className="text-xs text-muted-foreground">اعتمادات اليوم</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-muted/40 to-muted/20 border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="بحث بالمرجع..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="pending" className="text-xs relative">
            المعلقة
            {(pendingFeatured.length + pendingAgency.length + pendingVerification.length) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                {pendingFeatured.length + pendingAgency.length + pendingVerification.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="featured" className="text-xs">التمييز</TabsTrigger>
          <TabsTrigger value="agency" className="text-xs">الوكالات</TabsTrigger>
          <TabsTrigger value="verification" className="text-xs">التوثيق</TabsTrigger>
        </TabsList>

        {/* Pending Payments Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                المدفوعات المعلقة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pending Featured Listings */}
              {pendingFeatured.map((listing) => (
                <div key={listing.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="mb-1">تمييز إعلان</Badge>
                      <p className="text-sm text-muted-foreground">
                        {listing.duration_days} يوم - {listing.price_paid.toLocaleString()} دج
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPaymentMethodLabel(listing.payment_method)} 
                        {listing.payment_reference && ` - ${listing.payment_reference}`}
                      </p>
                    </div>
                    {getStatusBadge(listing.status)}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => handleViewProof(listing.payment_proof_url)}>
                      <Eye className="w-4 h-4 ml-1" />
                      إثبات الدفع
                    </Button>
                    <Button size="sm" onClick={() => handleApprovePayment('featured', listing.id)} disabled={processingAction}>
                      <CheckCircle className="w-4 h-4 ml-1" />
                      اعتماد
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openRejectDialog('featured', listing.id)}>
                      <XCircle className="w-4 h-4 ml-1" />
                      رفض
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending Agency Subscriptions */}
              {pendingAgency.map((sub) => (
                <div key={sub.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="mb-1">اشتراك وكالة</Badge>
                      <p className="font-medium">{sub.agency_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sub.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </p>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleApprovePayment('agency', sub.id)} disabled={processingAction}>
                      <CheckCircle className="w-4 h-4 ml-1" />
                      اعتماد
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openRejectDialog('agency', sub.id)}>
                      <XCircle className="w-4 h-4 ml-1" />
                      رفض
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending Verification Requests */}
              {pendingVerification.map((req) => (
                <div key={req.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="mb-1">خدمة توثيق</Badge>
                      <p className="text-sm text-muted-foreground">
                        {req.price_paid.toLocaleString()} دج
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPaymentMethodLabel(req.payment_method)}
                        {req.payment_reference && ` - ${req.payment_reference}`}
                      </p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => handleViewProof(req.payment_proof_url)}>
                      <Eye className="w-4 h-4 ml-1" />
                      إثبات الدفع
                    </Button>
                    <Button size="sm" onClick={() => handleApprovePayment('verification', req.id)} disabled={processingAction}>
                      <CheckCircle className="w-4 h-4 ml-1" />
                      اعتماد
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openRejectDialog('verification', req.id)}>
                      <XCircle className="w-4 h-4 ml-1" />
                      رفض
                    </Button>
                  </div>
                </div>
              ))}

              {pendingFeatured.length === 0 && pendingAgency.length === 0 && pendingVerification.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد مدفوعات معلقة</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Featured Listings Tab */}
        <TabsContent value="featured">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">طلبات التمييز ({featuredListings.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {featuredListings.map((listing) => (
                <div key={listing.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{listing.duration_days} يوم</p>
                    <p className="text-sm text-primary">{listing.price_paid.toLocaleString()} دج</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(listing.created_at), 'dd/MM/yyyy', { locale: ar })}
                    </p>
                  </div>
                  {getStatusBadge(listing.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agency Tab */}
        <TabsContent value="agency">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">اشتراكات الوكالات ({agencySubscriptions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agencySubscriptions.map((sub) => (
                <div key={sub.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sub.agency_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ar })}
                    </p>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">طلبات التوثيق ({verificationRequests.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {verificationRequests.map((req) => (
                <div key={req.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary">{req.price_paid.toLocaleString()} دج</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.created_at), 'dd/MM/yyyy', { locale: ar })}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إثبات الدفع</DialogTitle>
          </DialogHeader>
          {selectedProofUrl ? (
            <img 
              src={selectedProofUrl} 
              alt="Payment Proof" 
              className="w-full rounded-lg"
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">لا يوجد إثبات</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الدفع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>سبب الرفض</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض الدفع..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectPayment}
              disabled={processingAction || !rejectionReason.trim()}
            >
              {processingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
