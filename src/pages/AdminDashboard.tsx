import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Users, Home, Calendar, Shield, Search, 
  CheckCircle, XCircle, Clock, Eye, Trash2, UserCheck,
  Building, FileText, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
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
  submitted_at: string | null;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
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
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setKycRequests(data);
      setStats(prev => ({ 
        ...prev, 
        pendingKYC: data.filter(k => k.status === 'submitted').length 
      }));
    }
  };

  const handleKYCAction = async (kycId: string, userId: string, action: 'verified' | 'rejected') => {
    const { error } = await supabase
      .from('kyc_verifications')
      .update({ 
        status: action,
        verified_at: action === 'verified' ? new Date().toISOString() : null
      })
      .eq('id', kycId);

    if (!error) {
      // Update profile kyc_verified status
      if (action === 'verified') {
        await supabase
          .from('profiles')
          .update({ kyc_verified: true })
          .eq('user_id', userId);
      }
      toast.success(action === 'verified' ? 'تم التحقق بنجاح' : 'تم الرفض');
      fetchKYCRequests();
      fetchUsers();
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
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="users" className="text-xs">المستخدمين</TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">العقارات</TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs">المواعيد</TabsTrigger>
            <TabsTrigger value="kyc" className="text-xs">التحقق</TabsTrigger>
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
                      {kyc.status === 'submitted' && (
                        <div className="flex gap-2">
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
                        </div>
                      )}
                    </div>
                  ))}
                  {kycRequests.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
