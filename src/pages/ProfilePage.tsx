import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, User, Star, Settings, Shield, MapPin, Phone, Mail, Calendar, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserReputationCard } from '@/components/reviews/UserReputationCard';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_type: string | null;
  kyc_verified: boolean | null;
  avg_rating: number;
  total_reviews: number;
  reputation_badges: string[];
  created_at: string;
}

interface ProfilePageProps {
  userId?: string; // If not provided, show current user's profile
  onBack: () => void;
  onSettings?: () => void;
  onNavigate?: (route: string) => void;
}

export function ProfilePage({ userId, onBack, onSettings, onNavigate }: ProfilePageProps) {
  const { user, profile: currentUserProfile } = useAuth();
  const { favorites } = useFavorites();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [contractsCount, setContractsCount] = useState(0);

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
      fetchStats();
    }
  }, [targetUserId]);

  const fetchProfile = async () => {
    if (!targetUserId) return;

    // Use the secure get_safe_profile function instead of direct table access
    // This ensures phone is only visible to: owner, admins, or with mutual consent
    const { data, error } = await supabase
      .rpc('get_safe_profile', { target_user_id: targetUserId })
      .maybeSingle();

    if (!error && data) {
      // Fetch created_at - use public_profiles for other users, profiles for own
      const { data: profileMeta } = isOwnProfile 
        ? await supabase
            .from('profiles')
            .select('created_at')
            .eq('user_id', targetUserId)
            .maybeSingle()
        : { data: null };
      
      setProfile({
        ...data,
        id: data.user_id, // Map user_id to id for compatibility
        created_at: profileMeta?.created_at || new Date().toISOString(),
      } as UserProfile);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!targetUserId) return;

    // Fetch properties count
    const { count: propCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', targetUserId);

    setPropertiesCount(propCount || 0);

    // Fetch contracts count
    const { count: contractCount } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .or(`landlord_id.eq.${targetUserId},tenant_id.eq.${targetUserId}`);

    setContractsCount(contractCount || 0);
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'owner': return 'مالك عقارات';
      case 'tenant': return 'مستأجر';
      case 'handyman': return 'حرفي';
      default: return 'مستخدم';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-b from-primary/20 to-background p-4 pb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">الملف الشخصي</h1>
          {isOwnProfile && onSettings && (
            <Button variant="ghost" size="icon" onClick={onSettings}>
              <Settings className="w-5 h-5" />
            </Button>
          )}
          {!isOwnProfile && <div className="w-10" />}
        </div>

        {/* Profile Header */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center mb-4 border-4 border-background">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name || ''} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold mb-1">{profile?.full_name || 'مستخدم'}</h2>
          
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{getRoleLabel(profile?.role_type)}</Badge>
            {profile?.kyc_verified && (
              <Badge variant="default" className="gap-1 bg-green-600">
                <Shield className="w-3 h-3" />
                موثق
              </Badge>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.avg_rating?.toFixed(1) || '0'}</p>
              <p className="text-xs text-muted-foreground">التقييم</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.total_reviews || 0}</p>
              <p className="text-xs text-muted-foreground">تقييم</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{contractsCount}</p>
              <p className="text-xs text-muted-foreground">عقد</p>
            </div>
            {profile?.role_type === 'owner' && (
              <div className="text-center">
                <p className="text-2xl font-bold">{propertiesCount}</p>
                <p className="text-xs text-muted-foreground">عقار</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content Tabs */}
      <div className="px-4 -mt-4">
        <Tabs defaultValue="reputation" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="reputation" className="flex-1">السمعة</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">التقييمات</TabsTrigger>
            <TabsTrigger value="info" className="flex-1">المعلومات</TabsTrigger>
          </TabsList>

          <TabsContent value="reputation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  نقاط السمعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserReputationCard
                  avgRating={profile?.avg_rating || 0}
                  totalReviews={profile?.total_reviews || 0}
                  badges={profile?.reputation_badges || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>التقييمات</CardTitle>
              </CardHeader>
              <CardContent>
                {targetUserId && <ReviewsList userId={targetUserId} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="mt-4 space-y-4">
            {/* Favorites Quick Link - Only for own profile */}
            {isOwnProfile && (
              <Card 
                className="bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => onNavigate?.('/favorites')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">المفضلة</p>
                        <p className="text-xs text-muted-foreground">{favorites.size} عقار</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground rotate-180" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-4">
                {profile?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span>عضو منذ {new Date(profile?.created_at || '').toLocaleDateString('ar-DZ')}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
