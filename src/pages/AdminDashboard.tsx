import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Users, Home, Calendar, Shield, Search, 
  CheckCircle, XCircle, Clock, Eye, Trash2, UserCheck,
  Building, FileText, Bell, Image, Loader2, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useKycDocuments } from '@/hooks/useKycDocuments';
import { PaymentManagement } from '@/components/admin/PaymentManagement';
import { SupportRequestsManagement } from '@/components/admin/SupportRequestsManagement';
import { DemandHeatmap } from '@/components/admin/DemandHeatmap';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AdminDashboardProps {
  onBack: () => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role_type: string | null;
  kyc_verified: boolean;
  created_at: string;
}

interface Property {
  id: string;
  title: string;
  city: string;
  price: number;
  owner_id: string;
  is_available: boolean;
  created_at: string;
}

interface Appointment {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface KYCVerification {
  id: string;
  user_id: string;
  status: string;
  id_type: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  submitted_at: string | null;
}

interface SignedKycUrls {
  idFrontUrl: string | null;
  idBackUrl: string | null;
  selfieUrl: string | null;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const { getSignedUrls, loading: kycDocsLoading } = useKycDocuments();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [kycRequests, setKycRequests] = useState<KYCVerification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    pendingAppointments: 0,
    pendingKYC: 0
  });
  
  // KYC Document Viewer State
  const [kycViewerOpen, setKycViewerOpen] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<KYCVerification | null>(null);
  const [signedUrls, setSignedUrls] = useState<SignedKycUrls | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchProperties(),
      fetchAppointments(),
      fetchKYCRequests()
    ]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUsers(data);
      setStats(prev => ({ ...prev, totalUsers: data.length }));
    }
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProperties(data);
      setStats(prev => ({ ...prev, totalProperties: data.length }));
    }
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });
    
    if (!error && data) {
      setAppointments(data);
      setStats(prev => ({ 
        ...prev, 
        pendingAppointments: data.filter(a => a.status === 'pending').length 
      }));
    }
  };

  const fetchKYCRequests = async () => {
    const { data, error } = await supabase
      .from('kyc_verifications')
      .select('id, user_id, status, id_type, id_front_url, id_back_url, selfie_url, submitted_at')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setKycRequests(data);
      setStats(prev => ({ 
        ...prev, 
        pendingKYC: data.filter(k => k.status === 'submitted').length 
      }));
    }
  };

  // View KYC documents using secure signed URLs (expire in 5 minutes)
  const handleViewKycDocuments = async (kyc: KYCVerification) => {
    setSelectedKyc(kyc);
    setKycViewerOpen(true);
    setLoadingDocs(true);
    setSignedUrls(null);
    
    try {
      // Use secure audit-logged function to access KYC documents
      const { data: kycData, error: rpcError } = await supabase
        .rpc('admin_get_kyc_verification', { target_user_id: kyc.user_id })
        .maybeSingle();
      
      if (rpcError) throw rpcError;
      
      const urls = await getSignedUrls({
        id_front_url: kycData?.id_front_url || kyc.id_front_url,
        id_back_url: kycData?.id_back_url || kyc.id_back_url,
        selfie_url: kycData?.selfie_url || kyc.selfie_url,
      });
      setSignedUrls(urls);
    } catch (error) {
      console.error('Error loading KYC documents:', error);
      toast.error('فشل في تحميل الوثائق');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Close KYC viewer and clear sensitive URLs from memory
  const handleCloseKycViewer = () => {
    setKycViewerOpen(false);
    setSelectedKyc(null);
    // Clear signed URLs from memory for security
    setSignedUrls(null);
  };

  const handleKYCAction = async (kycId: string, userId: string, action: 'verified' | 'rejected') => {
    // Prompt for rejection reason if rejecting
    let reason: string | null = null;
    if (action === 'rejected') {
      reason = prompt('أدخل سبب الرفض:');
      if (!reason) {
        toast.error('يجب إدخال سبب الرفض');
        return;
      }
    }

    // Use secure RPC function with audit logging
    const { error } = await supabase.rpc('admin_verify_kyc', {
      target_user_id: userId,
      new_status: action,
      reason: reason,
    });

    if (!error) {
      toast.success(action === 'verified' ? 'تم التحقق بنجاح' : 'تم الرفض');
      fetchKYCRequests();
      fetchUsers();
    } else {
      toast.error('فشل في تحديث الحالة');
    }
  };

  const handleAppointmentAction = async (appointmentId: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);

    if (!error) {
      toast.success(status === 'confirmed' ? 'تم تأكيد الموعد' : 'تم إلغاء الموعد');
      fetchAppointments();
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (!error) {
      toast.success('تم حذف العقار');
      fetchProperties();
    }
  };

  const handleTogglePropertyAvailability = async (propertyId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('properties')
      .update({ is_available: !currentStatus })
      .eq('id', propertyId);

    if (!error) {
      toast.success(currentStatus ? 'تم إخفاء العقار' : 'تم إظهار العقار');
      fetchProperties();
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const filteredProperties = properties.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Shield className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">غير مصرح</h1>
        <p className="text-muted-foreground mb-6">ليس لديك صلاحية الوصول لهذه الصفحة</p>
        <Button onClick={onBack}>العودة للرئيسية</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">لوحة التحكم</h1>
              <p className="text-xs text-muted-foreground">إدارة النظام</p>
            </div>
          </div>
          <Shield className="w-8 h-8 text-primary" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">المستخدمين</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Building className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalProperties}</p>
                <p className="text-xs text-muted-foreground">العقارات</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pendingAppointments}</p>
                <p className="text-xs text-muted-foreground">مواعيد معلقة</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pendingKYC}</p>
                <p className="text-xs text-muted-foreground">طلبات تحقق</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-4">
            <TabsTrigger value="users" className="text-xs">المستخدمين</TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">العقارات</TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs">المواعيد</TabsTrigger>
            <TabsTrigger value="kyc" className="text-xs">التحقق</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">المدفوعات</TabsTrigger>
            <TabsTrigger value="support" className="text-xs">الطلبات</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs">الخريطة</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  المستخدمين ({filteredUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">الهاتف</TableHead>
                        <TableHead className="text-right">الدور</TableHead>
                        <TableHead className="text-right">التحقق</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || 'غير محدد'}
                          </TableCell>
                          <TableCell>{user.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.role_type === 'owner' ? 'مالك' : 
                               user.role_type === 'provider' ? 'حرفي' : 'مستأجر'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.kyc_verified ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  العقارات ({filteredProperties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredProperties.map((property) => (
                    <div 
                      key={property.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{property.title}</p>
                        <p className="text-sm text-muted-foreground">{property.city}</p>
                        <p className="text-sm text-primary font-bold">
                          {property.price.toLocaleString()} دج
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={property.is_available ? "outline" : "secondary"}
                          onClick={() => handleTogglePropertyAvailability(property.id, property.is_available)}
                        >
                          {property.is_available ? <Eye className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProperty(property.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  المواعيد ({appointments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div 
                      key={appointment.id}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(appointment.appointment_date), 'dd MMMM yyyy', { locale: ar })}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {appointment.appointment_time}
                          </span>
                        </div>
                        <Badge 
                          variant={
                            appointment.status === 'confirmed' ? 'default' :
                            appointment.status === 'cancelled' ? 'destructive' : 'secondary'
                          }
                        >
                          {appointment.status === 'confirmed' ? 'مؤكد' :
                           appointment.status === 'cancelled' ? 'ملغي' : 'معلق'}
                        </Badge>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground mb-2">{appointment.notes}</p>
                      )}
                      {appointment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAppointmentAction(appointment.id, 'confirmed')}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAppointmentAction(appointment.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            إلغاء
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">لا توجد مواعيد</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  طلبات التحقق ({kycRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {kycRequests.map((kyc) => (
                    <div 
                      key={kyc.id}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {kyc.id_type === 'national_id' ? 'بطاقة وطنية' :
                             kyc.id_type === 'passport' ? 'جواز سفر' : 'رخصة قيادة'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {kyc.submitted_at ? format(new Date(kyc.submitted_at), 'dd/MM/yyyy HH:mm') : '-'}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            kyc.status === 'verified' ? 'default' :
                            kyc.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {kyc.status === 'verified' ? 'مُتحقق' :
                           kyc.status === 'rejected' ? 'مرفوض' : 
                           kyc.status === 'submitted' ? 'قيد المراجعة' : 'معلق'}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* View Documents Button - uses secure signed URLs */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewKycDocuments(kyc)}
                        >
                          <Image className="w-4 h-4 ml-1" />
                          عرض الوثائق
                        </Button>
                        {kyc.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleKYCAction(kyc.id, kyc.user_id, 'verified')}
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleKYCAction(kyc.id, kyc.user_id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 ml-1" />
                              رفض
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {kycRequests.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>

          {/* Support Requests Tab */}
          <TabsContent value="support">
            <SupportRequestsManagement />
          </TabsContent>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap">
            <DemandHeatmap />
          </TabsContent>
        </Tabs>

        {/* KYC Document Viewer Dialog - Uses Secure Signed URLs */}
        <Dialog open={kycViewerOpen} onOpenChange={handleCloseKycViewer}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                مراجعة وثائق التحقق
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                ⚠️ هذه الروابط آمنة وتنتهي صلاحيتها خلال 5 دقائق
              </p>
            </DialogHeader>
            
            {loadingDocs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="mr-2">جاري تحميل الوثائق...</span>
              </div>
            ) : signedUrls ? (
              <div className="space-y-4">
                {/* ID Front */}
                <div>
                  <h4 className="font-medium mb-2 text-foreground">الوجه الأمامي للهوية</h4>
                  {signedUrls.idFrontUrl ? (
                    <img 
                      src={signedUrls.idFrontUrl} 
                      alt="ID Front" 
                      className="w-full max-h-64 object-contain rounded-lg border border-border"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">غير متوفر</p>
                  )}
                </div>
                
                {/* ID Back */}
                <div>
                  <h4 className="font-medium mb-2 text-foreground">الوجه الخلفي للهوية</h4>
                  {signedUrls.idBackUrl ? (
                    <img 
                      src={signedUrls.idBackUrl} 
                      alt="ID Back" 
                      className="w-full max-h-64 object-contain rounded-lg border border-border"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">غير متوفر</p>
                  )}
                </div>
                
                {/* Selfie */}
                <div>
                  <h4 className="font-medium mb-2 text-foreground">الصورة الشخصية</h4>
                  {signedUrls.selfieUrl ? (
                    <img 
                      src={signedUrls.selfieUrl} 
                      alt="Selfie" 
                      className="w-full max-h-64 object-contain rounded-lg border border-border"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">غير متوفر</p>
                  )}
                </div>
                
                {/* Action buttons in dialog */}
                {selectedKyc?.status === 'submitted' && (
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleKYCAction(selectedKyc.id, selectedKyc.user_id, 'verified');
                        handleCloseKycViewer();
                      }}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      قبول التحقق
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => {
                        handleKYCAction(selectedKyc.id, selectedKyc.user_id, 'rejected');
                        handleCloseKycViewer();
                      }}
                    >
                      <XCircle className="w-4 h-4 ml-1" />
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                فشل في تحميل الوثائق
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
