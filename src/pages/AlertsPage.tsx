import { useState, useEffect } from 'react';
import { Bell, Trash2, ToggleLeft, ToggleRight, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchAlertDialog } from '@/components/alerts/SearchAlertDialog';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SearchAlert {
  id: string;
  name: string;
  city: string | null;
  property_type: string | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  min_price: number | null;
  max_price: number | null;
  amenities: string[] | null;
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
}

const propertyTypeLabels: Record<string, string> = {
  apartment: 'شقة',
  villa: 'فيلا',
  house: 'دار',
  studio: 'ستوديو',
};

const amenityLabels: Record<string, string> = {
  heating: 'تدفئة',
  ac: 'تكييف',
  pool: 'مسبح',
  garage: 'كراج',
  garden: 'حديقة',
  balcony: 'شرفة',
  elevator: 'مصعد',
  wifi: 'إنترنت',
  furnished: 'مفروشة',
};

export default function AlertsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('search_alerts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      toast.error('حدث خطأ أثناء جلب التنبيهات');
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const toggleAlert = async (alertId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('search_alerts')
      .update({ is_active: !currentStatus })
      .eq('id', alertId);

    if (error) {
      toast.error('حدث خطأ أثناء تحديث التنبيه');
    } else {
      setAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, is_active: !currentStatus } : a)
      );
      toast.success(currentStatus ? 'تم إيقاف التنبيه' : 'تم تفعيل التنبيه');
    }
  };

  const deleteAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('search_alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      toast.error('حدث خطأ أثناء حذف التنبيه');
    } else {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('تم حذف التنبيه');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">🔔 رادار البحث</h1>
        <SearchAlertDialog />
      </div>

      {/* Description */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            أنشئ تنبيهات لتصلك إشعارات فورية عند إضافة عقارات تطابق معاييرك
          </p>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell className="h-16 w-16 mb-4 opacity-50" />
          <p className="text-lg mb-4">لا توجد تنبيهات محفوظة</p>
          <SearchAlertDialog />
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`transition-opacity ${!alert.is_active && 'opacity-60'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className={`h-5 w-5 ${alert.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    {alert.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAlert(alert.id, alert.is_active)}
                    >
                      {alert.is_active ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {alert.city && (
                    <Badge variant="secondary">{alert.city}</Badge>
                  )}
                  {alert.property_type && (
                    <Badge variant="secondary">
                      {propertyTypeLabels[alert.property_type] || alert.property_type}
                    </Badge>
                  )}
                  {(alert.min_bedrooms || alert.max_bedrooms) && (
                    <Badge variant="secondary">
                      {alert.min_bedrooms && alert.max_bedrooms
                        ? `${alert.min_bedrooms}-${alert.max_bedrooms} غرف`
                        : alert.min_bedrooms
                        ? `${alert.min_bedrooms}+ غرف`
                        : `حتى ${alert.max_bedrooms} غرف`}
                    </Badge>
                  )}
                  {(alert.min_price || alert.max_price) && (
                    <Badge variant="secondary">
                      {alert.min_price && alert.max_price
                        ? `${alert.min_price.toLocaleString()}-${alert.max_price.toLocaleString()} دج`
                        : alert.min_price
                        ? `من ${alert.min_price.toLocaleString()} دج`
                        : `حتى ${alert.max_price?.toLocaleString()} دج`}
                    </Badge>
                  )}
                  {alert.amenities?.map((amenity) => (
                    <Badge key={amenity} variant="outline">
                      {amenityLabels[amenity] || amenity}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    أنشئ {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ar })}
                  </span>
                  {alert.last_notified_at && (
                    <span>
                      آخر إشعار {formatDistanceToNow(new Date(alert.last_notified_at), { addSuffix: true, locale: ar })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
