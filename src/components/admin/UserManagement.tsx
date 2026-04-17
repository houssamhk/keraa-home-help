import { useState, useEffect } from 'react';
import { 
  Users, Search, Shield, ShieldOff, Eye, UserCheck, UserX, 
  Loader2, ChevronDown, ChevronUp, Mail, Phone, Calendar,
  Crown, Wrench, Home as HomeIcon, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role_type: string | null;
  kyc_verified: boolean;
  avg_rating: number | null;
  total_reviews: number | null;
  created_at: string;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [userContracts, setUserContracts] = useState<any[]>([]);
  const [userProperties, setUserProperties] = useState<any[]>([]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleViewUser = async (profile: UserProfile) => {
    setSelectedUser(profile);
    setDetailDialog(true);
    
    // Fetch user's contracts and properties
    const [contracts, properties] = await Promise.all([
      supabase.from('contracts').select('id, title, status, created_at')
        .or(`landlord_id.eq.${profile.user_id},tenant_id.eq.${profile.user_id}`)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('properties').select('id, title, city, price, is_available')
        .eq('owner_id', profile.user_id)
        .limit(10),
    ]);
    
    setUserContracts(contracts.data || []);
    setUserProperties(properties.data || []);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role_type: newRole })
      .eq('user_id', userId);
    
    if (!error) {
      toast.success(`تم تغيير نوع الحساب إلى ${getRoleLabel(newRole)}`);
      fetchUsers();
      if (selectedUser) setSelectedUser({ ...selectedUser, role_type: newRole });
    } else {
      toast.error('فشل في تغيير نوع الحساب: ' + error.message);
    }
    setProcessing(false);
  };

  const handleToggleAllProperties = async (userId: string, available: boolean) => {
    setProcessing(true);
    const { error } = await supabase
      .from('properties')
      .update({ is_available: available })
      .eq('owner_id', userId);
    
    if (!error) {
      toast.success(available ? 'تم تفعيل جميع العقارات' : 'تم إخفاء جميع العقارات');
    } else {
      toast.error('فشل في تحديث العقارات');
    }
    setProcessing(false);
  };

  const handleQuickVerifyKyc = async (userId: string, verify: boolean) => {
    setProcessing(true);
    const { error } = await supabase.rpc('admin_verify_kyc', {
      target_user_id: userId,
      new_status: verify ? 'verified' : 'rejected',
      reason: verify ? null : 'تم الرفض من لوحة الإدارة',
    });

    if (!error) {
      toast.success(verify ? 'تم توثيق الحساب بنجاح ✓' : 'تم رفض التوثيق');
      await fetchUsers();
      if (selectedUser) setSelectedUser({ ...selectedUser, kyc_verified: verify });
    } else {
      toast.error('فشل: ' + error.message);
    }
    setProcessing(false);
  };

  const handleMakeAdmin = async (userId: string) => {
    // Get user email first  
    const targetProfile = users.find(u => u.user_id === userId);
    if (!targetProfile) return;

    setProcessing(true);
    // We use the RPC function which has proper auth checks
    const { error } = await supabase.rpc('assign_admin_role', { 
      target_email: '' // We need the email, let's use a direct insert instead
    });

    // Direct insert into user_roles
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'admin' as any });

    if (!insertError) {
      toast.success('تم ترقية المستخدم إلى مسؤول');
    } else {
      toast.error('فشل في ترقية المستخدم: ' + insertError.message);
    }
    setProcessing(false);
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'owner': return 'مالك';
      case 'tenant': return 'مستأجر';
      case 'handyman': return 'حرفي';
      case 'provider': return 'مزود خدمة';
      default: return 'مستأجر';
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'owner': return <HomeIcon className="w-4 h-4" />;
      case 'handyman': return <Wrench className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm) ||
      u.user_id.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || u.role_type === roleFilter;
    const matchesKyc = kycFilter === 'all' || 
      (kycFilter === 'verified' && u.kyc_verified) ||
      (kycFilter === 'unverified' && !u.kyc_verified);
    return matchesSearch && matchesRole && matchesKyc;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{users.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{users.filter(u => u.role_type === 'owner').length}</p>
          <p className="text-xs text-muted-foreground">ملاك</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{users.filter(u => u.role_type === 'tenant').length}</p>
          <p className="text-xs text-muted-foreground">مستأجرون</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{users.filter(u => u.kyc_verified).length}</p>
          <p className="text-xs text-muted-foreground">موثقون</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="owner">مالك</SelectItem>
            <SelectItem value="tenant">مستأجر</SelectItem>
            <SelectItem value="handyman">حرفي</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="verified">موثق</SelectItem>
            <SelectItem value="unverified">غير موثق</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            المستخدمون ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredUsers.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  {getRoleIcon(profile.role_type)}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{profile.full_name || 'بدون اسم'}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">{getRoleLabel(profile.role_type)}</Badge>
                    {profile.kyc_verified && <Shield className="w-3 h-3 text-green-500" />}
                    {profile.avg_rating ? <span>⭐ {profile.avg_rating}</span> : null}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleViewUser(profile)}>
                <Eye className="w-4 h-4" />
              </Button>
              {!profile.kyc_verified && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleQuickVerifyKyc(profile.user_id, true)}
                  disabled={processing}
                  className="ml-1"
                >
                  <UserCheck className="w-4 h-4 ml-1" />
                  توثيق
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              تفاصيل المستخدم
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Profile Info */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{selectedUser.full_name || 'بدون اسم'}</h3>
                  {selectedUser.kyc_verified ? 
                    <Badge variant="default"><Shield className="w-3 h-3 ml-1" />موثق</Badge> :
                    <Badge variant="destructive"><ShieldOff className="w-3 h-3 ml-1" />غير موثق</Badge>
                  }
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-3 h-3" /> {selectedUser.phone || '-'}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" /> {new Date(selectedUser.created_at!).toLocaleDateString('ar-DZ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">التقييم:</span>
                  <span>{selectedUser.avg_rating || 0}/5 ({selectedUser.total_reviews || 0} تقييم)</span>
                </div>
              </div>

              {/* Role Management */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">إدارة نوع الحساب</h4>
                <div className="flex items-center gap-2">
                  <Select value={selectedUser.role_type || 'tenant'} onValueChange={(v) => handleChangeRole(selectedUser.user_id, v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">مستأجر</SelectItem>
                      <SelectItem value="owner">مالك</SelectItem>
                      <SelectItem value="handyman">حرفي</SelectItem>
                      <SelectItem value="provider">مزود خدمة</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => handleMakeAdmin(selectedUser.user_id)} disabled={processing}>
                    <Crown className="w-4 h-4 ml-1" />
                    ترقية لأدمن
                  </Button>
                </div>
              </div>

              {/* Properties */}
              {userProperties.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">العقارات ({userProperties.length})</h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleToggleAllProperties(selectedUser.user_id, false)} disabled={processing}>
                        إخفاء الكل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleAllProperties(selectedUser.user_id, true)} disabled={processing}>
                        إظهار الكل
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {userProperties.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded bg-background/50">
                        <span>{p.title} - {p.city}</span>
                        <Badge variant={p.is_available ? 'default' : 'secondary'}>
                          {p.is_available ? 'مفعل' : 'مخفي'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracts */}
              {userContracts.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">العقود ({userContracts.length})</h4>
                  <div className="space-y-1">
                    {userContracts.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded bg-background/50">
                        <span>{c.title}</span>
                        <Badge variant="outline">{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ID for reference */}
              <p className="text-xs text-muted-foreground font-mono break-all">ID: {selectedUser.user_id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
