import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useAdminRole } from "@/hooks/useAdminRole";
import type { UserRole } from "@/types/user";

// Lazy load all pages
const RoleSelection = lazy(() => import("@/components/onboarding/RoleSelection").then(m => ({ default: m.RoleSelection })));
const KYCFlow = lazy(() => import("@/components/onboarding/KYCFlow").then(m => ({ default: m.KYCFlow })));
const AIVoiceHub = lazy(() => import("@/components/home/AIVoiceHub").then(m => ({ default: m.AIVoiceHub })));
const LeafletMap = lazy(() => import("@/components/map/LeafletMap").then(m => ({ default: m.LeafletMap })));
const AuthPage = lazy(() => import("@/pages/AuthPage").then(m => ({ default: m.AuthPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const PropertiesPage = lazy(() => import("@/pages/PropertiesPage").then(m => ({ default: m.PropertiesPage })));
const PropertyDetailPage = lazy(() => import("@/pages/PropertyDetailPage").then(m => ({ default: m.PropertyDetailPage })));
const HandymenPage = lazy(() => import("@/pages/HandymenPage").then(m => ({ default: m.HandymenPage })));
const ChatPage = lazy(() => import("@/pages/ChatPage").then(m => ({ default: m.ChatPage })));
const OwnerDashboard = lazy(() => import("@/pages/OwnerDashboard").then(m => ({ default: m.OwnerDashboard })));
const AddPropertyPage = lazy(() => import("@/pages/AddPropertyPage").then(m => ({ default: m.AddPropertyPage })));
const HandymanDashboard = lazy(() => import("@/pages/HandymanDashboard").then(m => ({ default: m.HandymanDashboard })));
const HandymanDetailPage = lazy(() => import("@/pages/HandymanDetailPage").then(m => ({ default: m.HandymanDetailPage })));
const ContractsPage = lazy(() => import("@/pages/ContractsPage").then(m => ({ default: m.ContractsPage })));
const CreateContractPage = lazy(() => import("@/pages/CreateContractPage").then(m => ({ default: m.CreateContractPage })));
const ArrabonPage = lazy(() => import("@/pages/ArrabonPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const BillsPage = lazy(() => import("@/pages/BillsPage").then(m => ({ default: m.BillsPage })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AppointmentsPage = lazy(() => import("@/pages/AppointmentsPage").then(m => ({ default: m.AppointmentsPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const FavoritesPage = lazy(() => import("@/pages/FavoritesPage").then(m => ({ default: m.FavoritesPage })));
const ServiceRequestsPage = lazy(() => import("@/pages/ServiceRequestsPage").then(m => ({ default: m.ServiceRequestsPage })));
const WalletPage = lazy(() => import("@/pages/WalletPage").then(m => ({ default: m.WalletPage })));
const AgencyDashboard = lazy(() => import("@/pages/AgencyDashboard").then(m => ({ default: m.AgencyDashboard })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

type AppScreen = 
  | 'splash' | 'auth' | 'role-selection' | 'kyc' | 'home' | 'map' 
  | 'settings' | 'properties' | 'property-detail' | 'handymen' | 'handyman-detail' | 'chat'
  | 'owner-dashboard' | 'add-property' | 'handyman-dashboard'
  | 'contracts' | 'create-contract' | 'arrabon' | 'alerts' | 'bills'
  | 'admin' | 'appointments' | 'profile' | 'favorites' | 'service-requests' | 'wallet'
  | 'agency-dashboard';

const SCREENS_WITH_NAV: AppScreen[] = [
  'home', 'properties', 'handymen', 'chat', 'profile', 'favorites',
  'owner-dashboard', 'handyman-dashboard', 'contracts', 'wallet'
];

interface PropertyData {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  price_period: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  images: string[];
  amenities?: string[];
  description?: string;
  owner_id?: string;
}

// Loading spinner for lazy components
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { user, profile, isLoading } = useAuth();
  const { isAdmin } = useAdminRole();
  useTheme();
  
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [chatUserId, setChatUserId] = useState<string | undefined>();
  const [editPropertyId, setEditPropertyId] = useState<string | undefined>();
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [selectedHandymanId, setSelectedHandymanId] = useState<string | undefined>();
  const [createContractPropertyId, setCreateContractPropertyId] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNative] = useState(() => typeof window !== 'undefined' && Capacitor.isNativePlatform());

  const handleSplashComplete = () => {
    setIsInitialized(true);
    determineInitialScreen();
  };

  const determineInitialScreen = () => {
    if (isLoading) return;
    if (!user) {
      setCurrentScreen('auth');
    } else {
      // Always go to home - profile will load async
      // Role selection is only shown for new signups via handleAuthSuccess
      setCurrentScreen('home');
    }
  };

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!user && currentScreen !== 'auth' && currentScreen !== 'splash') {
      setCurrentScreen('auth');
    }
  }, [user, isLoading, isInitialized, currentScreen]);

  // When profile loads after auth, redirect from role-selection if role already set
  useEffect(() => {
    if (!isInitialized || isLoading || !user || !profile) return;
    if (currentScreen === 'role-selection' && profile.role_type && profile.role_type !== 'tenant') {
      setCurrentScreen('home');
    }
    // Also handle post-auth: if stuck on auth but user+profile are ready
    if (currentScreen === 'auth' && profile.role_type) {
      setCurrentScreen('home');
    }
  }, [profile, user, isLoading, isInitialized, currentScreen]);

  const handleAuthSuccess = () => {
    // Profile may not be loaded yet - go to a loading state
    // The useEffect above will handle redirecting once profile loads
    if (profile?.role_type && profile.role_type !== 'tenant') {
      setCurrentScreen('home');
    } else {
      // Wait for profile to load, temporarily show home
      // The role-selection check will happen via useEffect when profile loads
      setCurrentScreen('role-selection');
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    setCurrentScreen('kyc');
  };

  const handleKYCComplete = () => setCurrentScreen('home');
  const handleKYCSkip = () => setCurrentScreen('home');

  const handleNavigate = (route: string) => {
    // Role-based route guards
    const userRole = profile?.role_type;
    if (route === '/owner-dashboard' && userRole !== 'owner') return;
    if (route === '/add-property' && userRole !== 'owner') return;
    if (route === '/handyman-dashboard' && userRole !== 'handyman') return;
    if (route === '/admin' && !isAdmin) return;
    if (route === '/agency-dashboard' && userRole !== 'owner') return;

    if (route.startsWith('/property/')) {
      const propertyId = route.replace('/property/', '');
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.from('properties').select('*').eq('id', propertyId).maybeSingle().then(({ data }) => {
          if (data) {
            setSelectedProperty(data as PropertyData);
            setCurrentScreen('property-detail');
          }
        });
      });
      return;
    }
    if (route.startsWith('/handyman/')) {
      const handymanId = route.replace('/handyman/', '');
      setSelectedHandymanId(handymanId);
      setCurrentScreen('handyman-detail');
      return;
    }

    const routeMap: Record<string, AppScreen> = {
      '/map': 'map', '/properties': 'properties', '/handymen': 'handymen',
      '/settings': 'settings', '/chat': 'chat', '/owner-dashboard': 'owner-dashboard',
      '/handyman-dashboard': 'handyman-dashboard', '/contracts': 'contracts',
      '/arrabon': 'arrabon', '/alerts': 'alerts', '/bills': 'bills',
      '/admin': 'admin', '/appointments': 'appointments', '/profile': 'profile',
      '/kyc': 'kyc', '/favorites': 'favorites', '/service-requests': 'service-requests',
      '/wallet': 'wallet', '/agency-dashboard': 'agency-dashboard', '/home': 'home'
    };
    setChatUserId(undefined);
    setCurrentScreen(routeMap[route] || 'home');
  };

  const handleViewProperty = (property: PropertyData) => {
    setSelectedProperty(property);
    setCurrentScreen('property-detail');
  };

  const handleChatFromProperty = (ownerId: string) => {
    setChatUserId(ownerId);
    setCurrentScreen('chat');
  };

  const handleCreateContractFromProperty = (propertyId: string) => {
    setCreateContractPropertyId(propertyId);
    setCurrentScreen('create-contract');
  };

  const needsKYC = user && profile && !profile.kyc_verified;
  const showBottomNav = user && SCREENS_WITH_NAV.includes(currentScreen);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash': 
        return <SplashScreen onComplete={handleSplashComplete} />;
      case 'auth': 
        return <AuthPage onSuccess={handleAuthSuccess} />;
      case 'role-selection': 
        return <RoleSelection onSelectRole={handleRoleSelect} />;
      case 'kyc': 
        return (
          <KYCFlow 
            onComplete={handleKYCComplete} 
            onBack={() => setCurrentScreen(profile?.role_type ? 'settings' : 'role-selection')}
            onSkip={() => setCurrentScreen(profile?.role_type ? 'settings' : 'home')}
          />
        );
      case 'home': 
        return (
          <AIVoiceHub 
            userName={profile?.full_name || user?.email?.split('@')[0] || "ضيف"} 
            onNavigate={handleNavigate}
            needsKYC={needsKYC}
            userRole={profile?.role_type}
            isAdmin={isAdmin}
          />
        );
      case 'map': 
        return (
          <LeafletMap 
            onBack={() => setCurrentScreen('home')} 
            onViewProperty={(id) => setCurrentScreen('properties')}
          />
        );
      case 'settings': 
        return <SettingsPage onBack={() => setCurrentScreen('home')} onStartKYC={() => setCurrentScreen('kyc')} />;
      case 'profile':
        return <ProfilePage onBack={() => setCurrentScreen('home')} onNavigate={handleNavigate} />;
      case 'properties': 
        return <PropertiesPage onBack={() => setCurrentScreen('home')} onViewProperty={handleViewProperty} />;
      case 'favorites':
        return <FavoritesPage onBack={() => setCurrentScreen('home')} onViewProperty={handleViewProperty} />;
      case 'property-detail': 
        return selectedProperty ? (
          <PropertyDetailPage 
            property={selectedProperty}
            onBack={() => setCurrentScreen('properties')}
            onChat={handleChatFromProperty}
            onCreateContract={handleCreateContractFromProperty}
            onArrabon={() => setCurrentScreen('arrabon')}
            needsKYC={needsKYC}
          />
        ) : null;
      case 'handymen': 
        return <HandymenPage onBack={() => setCurrentScreen('home')} onChat={(id) => { setChatUserId(id); setCurrentScreen('chat'); }} onViewHandyman={(id) => { setSelectedHandymanId(id); setCurrentScreen('handyman-detail'); }} />;
      case 'handyman-detail':
        return selectedHandymanId ? (
          <HandymanDetailPage 
            handymanId={selectedHandymanId}
            onBack={() => setCurrentScreen('handymen')}
            onChat={(id) => { setChatUserId(id); setCurrentScreen('chat'); }}
          />
        ) : null;
      case 'chat': 
        return <ChatPage onBack={() => setCurrentScreen(selectedProperty ? 'property-detail' : 'home')} otherUserId={chatUserId} />;
      case 'owner-dashboard': 
        return <OwnerDashboard onBack={() => setCurrentScreen('home')} onAddProperty={() => setCurrentScreen('add-property')} onEditProperty={(id) => { setEditPropertyId(id); setCurrentScreen('add-property'); }} />;
      case 'add-property': 
        return <AddPropertyPage onBack={() => setCurrentScreen('owner-dashboard')} onSuccess={() => setCurrentScreen('owner-dashboard')} editPropertyId={editPropertyId} />;
      case 'handyman-dashboard': 
        return <HandymanDashboard onBack={() => setCurrentScreen('home')} />;
      case 'contracts': 
        return <ContractsPage onBack={() => setCurrentScreen('home')} onCreateContract={() => setCurrentScreen('create-contract')} />;
      case 'create-contract': 
        return <CreateContractPage onBack={() => setCurrentScreen('contracts')} onSuccess={() => setCurrentScreen('contracts')} preselectedPropertyId={createContractPropertyId} />;
      case 'arrabon': 
        return <ArrabonPage onBack={() => setCurrentScreen(selectedProperty ? 'property-detail' : 'home')} />;
      case 'alerts': 
        return <AlertsPage onBack={() => setCurrentScreen('home')} />;
      case 'bills': 
        return <BillsPage onBack={() => setCurrentScreen('home')} />;
      case 'admin': 
        return <AdminDashboard onBack={() => setCurrentScreen('home')} />;
      case 'appointments': 
        return <AppointmentsPage onBack={() => setCurrentScreen('home')} />;
      case 'service-requests':
        return <ServiceRequestsPage onBack={() => setCurrentScreen('home')} onChat={(id) => { setChatUserId(id); setCurrentScreen('chat'); }} />;
      case 'wallet':
        return <WalletPage onBack={() => setCurrentScreen('home')} />;
      case 'agency-dashboard':
        return <AgencyDashboard onBack={() => setCurrentScreen('home')} />;
      default: 
        return null;
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <div className={`flex-1 overflow-hidden ${showBottomNav ? 'pb-16' : ''}`}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <div className="h-full overflow-auto">{renderScreen()}</div>
          </Suspense>
        </AnimatePresence>
      </div>
      
      {showBottomNav && (
        <MobileBottomNav 
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          userRole={profile?.role_type as UserRole}
        />
      )}
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            {!Capacitor.isNativePlatform() && <InstallPrompt />}
            <AppContent />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
