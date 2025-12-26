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
import { InteractiveMap } from "@/components/map/InteractiveMap";
import { AuthPage } from "@/pages/AuthPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PropertiesPage } from "@/pages/PropertiesPage";
import { PropertyDetailPage } from "@/pages/PropertyDetailPage";
import { HandymenPage } from "@/pages/HandymenPage";
import { ChatPage } from "@/pages/ChatPage";
import { OwnerDashboard } from "@/pages/OwnerDashboard";
import { AddPropertyPage } from "@/pages/AddPropertyPage";
import { HandymanDashboard } from "@/pages/HandymanDashboard";
import { ContractsPage } from "@/pages/ContractsPage";
import { CreateContractPage } from "@/pages/CreateContractPage";
import ArrabonPage from "@/pages/ArrabonPage";
import AlertsPage from "@/pages/AlertsPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/user";

const queryClient = new QueryClient();

type AppScreen = 
  | 'splash' | 'auth' | 'role-selection' | 'kyc' | 'home' | 'map' 
  | 'settings' | 'properties' | 'property-detail' | 'handymen' | 'chat'
  | 'owner-dashboard' | 'add-property' | 'handyman-dashboard'
  | 'contracts' | 'create-contract' | 'arrabon' | 'alerts';

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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [chatUserId, setChatUserId] = useState<string | undefined>();
  const [editPropertyId, setEditPropertyId] = useState<string | undefined>();
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [createContractPropertyId, setCreateContractPropertyId] = useState<string | undefined>();

  const handleSplashComplete = () => {
    if (user) {
      if (profile?.kyc_verified) {
        setCurrentScreen('home');
      } else if (profile?.role_type) {
        setCurrentScreen('kyc');
      } else {
        setCurrentScreen('role-selection');
      }
    } else {
      setCurrentScreen('auth');
    }
  };

  const handleAuthSuccess = () => {
    if (profile?.kyc_verified) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('role-selection');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    setCurrentScreen('kyc');
  };

  const handleNavigate = (route: string) => {
    const routeMap: Record<string, AppScreen> = {
      '/map': 'map', '/properties': 'properties', '/handymen': 'handymen',
      '/settings': 'settings', '/chat': 'chat', '/owner-dashboard': 'owner-dashboard',
      '/handyman-dashboard': 'handyman-dashboard', '/contracts': 'contracts',
      '/arrabon': 'arrabon', '/alerts': 'alerts'
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash': return <SplashScreen onComplete={handleSplashComplete} />;
      case 'auth': return <AuthPage onSuccess={handleAuthSuccess} />;
      case 'role-selection': return <RoleSelection onSelectRole={handleRoleSelect} />;
      case 'kyc': return <KYCFlow onComplete={() => setCurrentScreen('home')} onBack={() => setCurrentScreen('role-selection')} />;
      case 'home': return <AIVoiceHub userName={profile?.full_name || user?.email?.split('@')[0] || "ضيف"} onNavigate={handleNavigate} />;
      case 'map': return <InteractiveMap onBack={() => setCurrentScreen('home')} />;
      case 'settings': return <SettingsPage onBack={() => setCurrentScreen('home')} />;
      case 'properties': return <PropertiesPage onBack={() => setCurrentScreen('home')} onViewProperty={handleViewProperty} />;
      case 'property-detail': return selectedProperty ? (
        <PropertyDetailPage 
          property={selectedProperty}
          onBack={() => setCurrentScreen('properties')}
          onChat={handleChatFromProperty}
          onCreateContract={handleCreateContractFromProperty}
          onArrabon={() => setCurrentScreen('arrabon')}
        />
      ) : null;
      case 'handymen': return <HandymenPage onBack={() => setCurrentScreen('home')} onChat={(id) => { setChatUserId(id); setCurrentScreen('chat'); }} />;
      case 'chat': return <ChatPage onBack={() => setCurrentScreen(selectedProperty ? 'property-detail' : 'home')} otherUserId={chatUserId} />;
      case 'owner-dashboard': return <OwnerDashboard onBack={() => setCurrentScreen('home')} onAddProperty={() => setCurrentScreen('add-property')} onEditProperty={(id) => { setEditPropertyId(id); setCurrentScreen('add-property'); }} />;
      case 'add-property': return <AddPropertyPage onBack={() => setCurrentScreen('owner-dashboard')} onSuccess={() => setCurrentScreen('owner-dashboard')} editPropertyId={editPropertyId} />;
      case 'handyman-dashboard': return <HandymanDashboard onBack={() => setCurrentScreen('home')} />;
      case 'contracts': return <ContractsPage onBack={() => setCurrentScreen('home')} onCreateContract={() => setCurrentScreen('create-contract')} />;
      case 'create-contract': return <CreateContractPage onBack={() => setCurrentScreen('contracts')} onSuccess={() => setCurrentScreen('contracts')} preselectedPropertyId={createContractPropertyId} />;
      case 'arrabon': return <ArrabonPage onBack={() => setCurrentScreen(selectedProperty ? 'property-detail' : 'home')} />;
      case 'alerts': return <AlertsPage />;
      default: return null;
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
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
