import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wrench, Inbox, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceRequestCard } from '@/components/handymen/ServiceRequestCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceRequestsPageProps {
  onBack: () => void;
  onChat?: (userId: string) => void;
}

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

export function ServiceRequestsPage({ onBack, onChat }: ServiceRequestsPageProps) {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [handymanId, setHandymanId] = useState<string | null>(null);

  // Determine if user is a handyman
  const isHandyman = profile?.role_type === 'provider';

  useEffect(() => {
    if (user) {
      if (isHandyman) {
        fetchHandymanId();
      } else {
        fetchRequests();
      }
    }
  }, [user, isHandyman]);

  const fetchHandymanId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('handymen')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setHandymanId(data.id);
      fetchRequests(data.id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchRequests = async (hId?: string) => {
    if (!user) return;
    setIsLoading(true);

    let query = supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (isHandyman && hId) {
      query = query.eq('handyman_id', hId);
    } else {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Fetch profiles for each request
      const enrichedRequests = await Promise.all(
        data.map(async (req) => {
          // Get client profile
          const { data: clientProfile } = await supabase
            .from('public_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', req.client_id)
            .maybeSingle();

          // Get handyman profile
          const { data: handyman } = await supabase
            .from('handymen')
            .select('user_id')
            .eq('id', req.handyman_id)
            .maybeSingle();

          let handymanProfile = null;
          if (handyman?.user_id) {
            const { data: hProfile } = await supabase
              .from('public_profiles')
              .select('full_name')
              .eq('user_id', handyman.user_id)
              .maybeSingle();
            handymanProfile = hProfile;
          }

          return {
            ...req,
            client_profile: clientProfile,
            handyman_profile: handymanProfile
          };
        })
      );

      setRequests(enrichedRequests);
    }

    setIsLoading(false);
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return req.status === 'pending';
    if (activeTab === 'active') return ['accepted', 'in_progress'].includes(req.status);
    if (activeTab === 'completed') return req.status === 'completed';
    if (activeTab === 'cancelled') return req.status === 'cancelled';
    return true;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    active: requests.filter(r => ['accepted', 'in_progress'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4"
      >
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {isHandyman ? 'طلبات الخدمة' : 'طلباتي'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isHandyman ? 'إدارة طلبات الخدمة الواردة' : 'متابعة طلبات الخدمة'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">قيد الانتظار</p>
          </div>
          <div className="glass-card p-3 text-center">
            <Wrench className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.active}</p>
            <p className="text-xs text-muted-foreground">نشطة</p>
          </div>
          <div className="glass-card p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">مكتملة</p>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="w-full mb-4 grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">انتظار</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">نشطة</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">مكتملة</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد طلبات</p>
              </div>
            ) : (
              filteredRequests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ServiceRequestCard
                    request={request}
                    viewAs={isHandyman ? 'handyman' : 'client'}
                    onUpdate={() => fetchRequests(handymanId || undefined)}
                    onChat={onChat}
                  />
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
