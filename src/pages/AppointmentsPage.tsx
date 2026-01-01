import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Plus, CheckCircle, XCircle, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AppointmentsPageProps {
  onBack: () => void;
  propertyId?: string;
  ownerId?: string;
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

interface Property {
  id: string;
  title: string;
  owner_id: string;
}

export function AppointmentsPage({ onBack, propertyId, ownerId }: AppointmentsPageProps) {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newAppointment, setNewAppointment] = useState({
    property_id: propertyId || '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchProperties();
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .or(`tenant_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('appointment_date', { ascending: true });
    
    if (!error && data) {
      setAppointments(data);
    }
    setIsLoading(false);
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, owner_id')
      .eq('is_available', true);
    
    if (!error && data) {
      setProperties(data);
    }
  };

  const handleCreateAppointment = async () => {
    if (!user || !newAppointment.property_id || !newAppointment.appointment_date || !newAppointment.appointment_time) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const property = properties.find(p => p.id === newAppointment.property_id);
    if (!property) {
      toast.error('العقار غير موجود');
      return;
    }

    const { error } = await supabase
      .from('appointments')
      .insert({
        property_id: newAppointment.property_id,
        tenant_id: user.id,
        owner_id: ownerId || property.owner_id,
        appointment_date: newAppointment.appointment_date,
        appointment_time: newAppointment.appointment_time,
        notes: newAppointment.notes || null
      });

    if (error) {
      toast.error('حدث خطأ أثناء إنشاء الموعد');
      return;
    }

    toast.success('تم حجز الموعد بنجاح');
    setIsDialogOpen(false);
    setNewAppointment({ property_id: '', appointment_date: '', appointment_time: '', notes: '' });
    fetchAppointments();
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (!error) {
      toast.success('تم إلغاء الموعد');
      fetchAppointments();
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointmentId);

    if (!error) {
      toast.success('تم تأكيد الموعد');
      fetchAppointments();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400">مؤكد</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغي</Badge>;
      case 'completed':
        return <Badge variant="secondary">مكتمل</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400">في الانتظار</Badge>;
    }
  };

  const isOwner = (appointment: Appointment) => appointment.owner_id === user?.id;

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
              <h1 className="text-xl font-bold text-foreground">المواعيد</h1>
              <p className="text-xs text-muted-foreground">إدارة مواعيد المعاينة</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 ml-1" />
                موعد جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>حجز موعد معاينة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>العقار</Label>
                  <Select 
                    value={newAppointment.property_id} 
                    onValueChange={(value) => setNewAppointment(prev => ({ ...prev, property_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العقار" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={newAppointment.appointment_date}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, appointment_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>الوقت</Label>
                  <Input
                    type="time"
                    value={newAppointment.appointment_time}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, appointment_time: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>
                
                <Button className="w-full" onClick={handleCreateAppointment}>
                  حجز الموعد
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">لا توجد مواعيد</p>
              <p className="text-sm text-muted-foreground">احجز موعد لمعاينة العقارات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="font-medium">
                        {format(new Date(appointment.appointment_date), 'EEEE, dd MMMM yyyy', { locale: ar })}
                      </span>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="w-4 h-4" />
                    <span>{appointment.appointment_time}</span>
                  </div>
                  
                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground mb-3 bg-muted/50 p-2 rounded">
                      {appointment.notes}
                    </p>
                  )}
                  
                  {appointment.status === 'pending' && (
                    <div className="flex gap-2">
                      {isOwner(appointment) ? (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleConfirmAppointment(appointment.id)}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تأكيد
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleCancelAppointment(appointment.id)}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleCancelAppointment(appointment.id)}
                        >
                          <XCircle className="w-4 h-4 ml-1" />
                          إلغاء
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
