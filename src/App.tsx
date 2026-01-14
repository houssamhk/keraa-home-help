import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { RoleSelection } from "@/components/onboarding/RoleSelection";
import { KYCFlow } from "@/components/onboarding/KYCFlow";
import { AIVoiceHub } from "@/components/home/AIVoiceHub";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { LeafletMap } from "@/components/map/LeafletMap";
import { AuthPage } from "@/pages/AuthPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PropertiesPage } from "@/pages/PropertiesPage";
import { PropertyDetailPage } from "@/pages/PropertyDetailPage";
import { HandymenPage } from "@/pages/HandymenPage";
import { ChatPage } from "@/pages/ChatPage";
import { OwnerDashboard } from "@/pages/OwnerDashboard";
import { AddPropertyPage } from "@/pages/AddPropertyPage";
import { HandymanDashboard } from "@/pages/HandymanDashboard";
import { HandymanDetailPage } from "@/pages/HandymanDetailPage";
import { ContractsPage } from "@/pages/ContractsPage";
import { CreateContractPage } from "@/pages/CreateContractPage";
import ArrabonPage from "@/pages/ArrabonPage";
import AlertsPage from "@/pages/AlertsPage";
import { BillsPage } from "@/pages/BillsPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/user";

const queryClient = new QueryClient();

type AppScreen = 
  | 'splash' | 'auth' | 'role-selection' | 'kyc' | 'home' | 'map' 
  | 'settings' | 'properties' | 'property-detail' | 'handymen' | 'handyman-detail' | 'chat'
  | 'owner-dashboard' | 'add-property' | 'handyman-dashboard'
  | 'contracts' | 'create-contract' | 'arrabon' | 'alerts' | 'bills'
  | 'admin' | 'appointments' | 'profile' | 'favorites';

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

function AppContent() {
  const { user, profile, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [chatUserId, setChatUserId] = useState<string | undefined>();
  const [editPropertyId, setEditPropertyId] = useState<string | undefined>();
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [selectedHandymanId, setSelectedHandymanId] = useState<string | undefined>();
  const [createContractPropertyId, setCreateContractPropertyId] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle splash screen completion and initial routing
  const handleSplashComplete = () => {
    setIsInitialized(true);
    determineInitialScreen();
  };

  // Determine which screen to show based on auth state
  const determineInitialScreen = () => {
    if (isLoading) return;

    if (!user) {
      // Not logged in - show auth
      setCurrentScreen('auth');
    } else if (!profile?.role_type) {
      // Logged in but no role selected
      setCurrentScreen('role-selection');
    } else {
      // Logged in with role - go to home (KYC is optional, can be done later)
      setCurrentScreen('home');
    }
  };

  // Re-evaluate screen when auth state changes (after initialization)
  useEffect(() => {
    if (!isInitialized || isLoading) return;
    
    // If user logs out, go to auth
    if (!user && currentScreen !== 'auth' && currentScreen !== 'splash') {
      setCurrentScreen('auth');
    }
  }, [user, isLoading, isInitialized, currentScreen]);

  const handleAuthSuccess = () => {
    // After login/signup, check if role is set
    if (profile?.role_type) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('role-selection');
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    // Role will be saved in RoleSelection component
    // Then show KYC with skip option
    setCurrentScreen('kyc');
  };

  const handleKYCComplete = () => {
    setCurrentScreen('home');
  };

  const handleKYCSkip = () => {
    // User skipped KYC - still go to home but they'll have restrictions
    setCurrentScreen('home');
  };

  const handleNavigate = (route: string) => {
    const routeMap: Record<string, AppScreen> = {
      '/map': 'map', '/properties': 'properties', '/handymen': 'handymen',
      '/settings': 'settings', '/chat': 'chat', '/owner-dashboard': 'owner-dashboard',
      '/handyman-dashboard': 'handyman-dashboard', '/contracts': 'contracts',
      '/arrabon': 'arrabon', '/alerts': 'alerts', '/bills': 'bills',
      '/admin': 'admin', '/appointments': 'appointments', '/profile': 'profile',
      '/kyc': 'kyc', '/favorites': 'favorites'
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

  // Check if user needs KYC for certain actions
  const needsKYC = user && profile && !profile.kyc_verified;

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
            onBack={() => setCurrentScreen('role-selection')}
            onSkip={handleKYCSkip}
          />
        );
      case 'home': 
        return (
          <AIVoiceHub 
            userName={profile?.full_name || user?.email?.split('@')[0] || "ضيف"} 
            onNavigate={handleNavigate}
            needsKYC={needsKYC}
          />
        );
      case 'map': 
        return (
          <LeafletMap 
            onBack={() => setCurrentScreen('home')} 
            onViewProperty={(id) => {
              // Fetch property and navigate
              setCurrentScreen('properties');
            }}
          />
        );
      case 'settings': 
        return <SettingsPage onBack={() => setCurrentScreen('home')} />;
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
      default: 
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">{renderScreen()}</AnimatePresence>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <InstallPrompt />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;