import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Play, 
  MessageSquare,
  Star,
  Loader2,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceRequest {
  id: string;
  handyman_id: string;
  client_id: string;
  service_type: string;
  description: string;
  preferred_date: string;
  preferred_time: string | null;
  address: string | null;
  status: string;
  estimated_price: number | null;
  final_price: number | null;
  created_at: string;
  client_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    phone?: string | null;
  } | null;
  handyman_profile?: {
    full_name: string | null;
  } | null;
}

interface ServiceRequestCardProps {
  request: ServiceRequest;
  viewAs: 'client' | 'handyman';
  onUpdate?: () => void;
  onChat?: (userId: string) => void;
}

const serviceTypes: Record<string, { label: string; icon: string }> = {
  plumbing: { label: 'سباكة', icon: '🔧' },
  electrical: { label: 'كهرباء', icon: '⚡' },
  painting: { label: 'دهان', icon: '🎨' },
  cleaning: { label: 'تنظيف', icon: '🧹' },
  carpentry: { label: 'نجارة', icon: '🪚' },
  ac: { label: 'تكييف', icon: '❄️' },
  gardening: { label: 'بستنة', icon: '🌱' },
  moving: { label: 'نقل', icon: '📦' },
  other: { label: 'أخرى', icon: '🔨' }
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400'
};

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  in_progress: 'جاري التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

export function ServiceRequestCard({ request, viewAs, onUpdate, onChat }: ServiceRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(request.estimated_price?.toString() || '');

  const handleStatusChange = async (newStatus: string, additionalData?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const updateData: Record<string, unknown> = { 
        status: newStatus,
        ...additionalData
      };

      if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      // Send notification
      const notifyUserId = viewAs === 'handyman' ? request.client_id : request.handyman_id;
      await supabase.from('notifications').insert({
        user_id: notifyUserId,
        type: 'service_update',
        title: 'تحديث طلب الخدمة',
        message: `تم تحديث حالة طلب الخدمة إلى: ${statusLabels[newStatus]}`,
        data: { request_id: request.id, new_status: newStatus }
      });

      toast.success('تم تحديث حالة الطلب');
      onUpdate?.();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('فشل في تحديث الحالة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptWithPrice = async () => {
    if (!estimatedPrice) {
      toast.error('يرجى إدخال السعر المقدر');
      return;
    }
    await handleStatusChange('accepted', { estimated_price: parseFloat(estimatedPrice) });
  };

  const service = serviceTypes[request.service_type] || serviceTypes.other;

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-xl">{service.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{service.label}</h3>
            <p className="text-xs text-muted-foreground">
              {viewAs === 'handyman' 
                ? request.client_profile?.full_name || 'عميل'
                : request.handyman_profile?.full_name || 'حرفي'
              }
            </p>
          </div>
        </div>
        <Badge className={statusColors[request.status]}>
          {statusLabels[request.status]}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {request.description}
      </p>

      {/* Details */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(request.preferred_date), 'dd MMM yyyy', { locale: ar })}
        </span>
        {request.preferred_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {request.preferred_time}
          </span>
        )}
        {request.address && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {request.address}
          </span>
        )}
      </div>

      {/* Price */}
      {(request.estimated_price || request.final_price) && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-primary/10 rounded-lg">
          <span className="text-sm text-muted-foreground">السعر:</span>
          <span className="font-bold text-primary">
            {(request.final_price || request.estimated_price)?.toLocaleString('ar-DZ')} دج
          </span>
          {request.final_price && request.estimated_price && request.final_price !== request.estimated_price && (
            <span className="text-xs text-muted-foreground line-through">
              {request.estimated_price.toLocaleString('ar-DZ')}
            </span>
          )}
        </div>
      )}

      {/* Actions based on status and role */}
      <div className="flex gap-2 flex-wrap">
        {/* Handyman Actions */}
        {viewAs === 'handyman' && (
          <>
            {request.status === 'pending' && (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="السعر المقدر (دج)"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    className="flex-1 glass-card px-3 py-2 text-sm bg-transparent border-none outline-none text-foreground"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    className="flex-1 gap-1"
                    onClick={handleAcceptWithPrice}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    قبول
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => handleStatusChange('cancelled', { cancellation_reason: 'رفض من الحرفي' })}
                    disabled={isLoading}
                  >
                    <XCircle className="w-3 h-3" />
                    رفض
                  </Button>
                </div>
              </div>
            )}
            {request.status === 'accepted' && (
              <Button
                size="sm"
                variant="gold"
                className="flex-1 gap-1"
                onClick={() => handleStatusChange('in_progress')}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                بدء العمل
              </Button>
            )}
            {request.status === 'in_progress' && (
              <Button
                size="sm"
                variant="gold"
                className="flex-1 gap-1"
                onClick={() => handleStatusChange('completed')}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                إتمام العمل
              </Button>
            )}
          </>
        )}

        {/* Client Actions */}
        {viewAs === 'client' && (
          <>
            {request.status === 'pending' && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                onClick={() => handleStatusChange('cancelled', { cancellation_reason: 'إلغاء من العميل' })}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                إلغاء الطلب
              </Button>
            )}
          </>
        )}

        {/* Chat button for both */}
        {onChat && request.status !== 'cancelled' && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onChat(viewAs === 'handyman' ? request.client_id : request.handyman_id)}
          >
            <MessageSquare className="w-3 h-3" />
            محادثة
          </Button>
        )}
      </div>
    </div>
  );
}
