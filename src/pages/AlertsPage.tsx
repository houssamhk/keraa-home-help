import { useState, useEffect } from 'react';
import { Bell, Trash2, ToggleLeft, ToggleRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SearchAlertDialog } from '@/components/alerts/SearchAlertDialog';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { fr } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';

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

interface AlertsPageProps {
  onBack?: () => void;
}

export default function AlertsPage({ onBack }: AlertsPageProps) {
  const { user } = useAuth();
  const { t, dir, language } = useLanguage();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const dateLocale = language === 'ar' ? ar : language === 'fr' ? fr : enUS;

  const propertyTypeLabels: Record<string, string> = {
    apartment: t.alertsPage.apartment,
    villa: t.alertsPage.villa,
    house: t.alertsPage.house,
    studio: t.alertsPage.studio,
  };

  const amenityLabels: Record<string, string> = {
    heating: t.alertsPage.heating,
    ac: t.alertsPage.airConditioning,
    pool: t.alertsPage.pool,
    garage: t.alertsPage.garage,
    garden: t.alertsPage.garden,
    balcony: t.alertsPage.balcony,
    elevator: t.alertsPage.elevator,
    wifi: t.alertsPage.wifi,
    furnished: t.alertsPage.furnished,
  };

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('search_alerts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      toast.error(t.alertsPage.fetchError);
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
      toast.error(t.alertsPage.updateError);
    } else {
      setAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, is_active: !currentStatus } : a)
      );
      toast.success(currentStatus ? t.alertsPage.alertStopped : t.alertsPage.alertActivated);
    }
  };

  const deleteAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('search_alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      toast.error(t.alertsPage.deleteError);
    } else {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success(t.alertsPage.alertDeleted);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t.loginRequired}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <BackArrow className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-bold">{t.alertsPage.title}</h1>
        <SearchAlertDialog />
      </div>

      {/* Description */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            {t.alertsPage.description}
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
          <p className="text-lg mb-4">{t.alertsPage.noAlerts}</p>
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
                        ? `${alert.min_bedrooms}-${alert.max_bedrooms} ${t.alertsPage.rooms}`
                        : alert.min_bedrooms
                        ? `${alert.min_bedrooms}+ ${t.alertsPage.rooms}`
                        : `${t.alertsPage.upTo} ${alert.max_bedrooms} ${t.alertsPage.rooms}`}
                    </Badge>
                  )}
                  {(alert.min_price || alert.max_price) && (
                    <Badge variant="secondary">
                      {alert.min_price && alert.max_price
                        ? `${alert.min_price.toLocaleString()}-${alert.max_price.toLocaleString()} ${t.currency}`
                        : alert.min_price
                        ? `${t.alertsPage.from} ${alert.min_price.toLocaleString()} ${t.currency}`
                        : `${t.alertsPage.upTo} ${alert.max_price?.toLocaleString()} ${t.currency}`}
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
                    {t.alertsPage.createdAgo} {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                  {alert.last_notified_at && (
                    <span>
                      {t.alertsPage.lastNotification} {formatDistanceToNow(new Date(alert.last_notified_at), { addSuffix: true, locale: dateLocale })}
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
