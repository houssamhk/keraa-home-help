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
import { HandymenPage } from "@/pages/HandymenPage";
import { ChatPage } from "@/pages/ChatPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/user";

const queryClient = new QueryClient();

type AppScreen = 'splash' | 'auth' | 'role-selection' | 'kyc' | 'home' | 'map' | 'settings' | 'properties' | 'handymen' | 'chat';

function AppContent() {
  const { user, profile, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [chatUserId, setChatUserId] = useState<string | undefined>();

  // Handle auth state changes
  useEffect(() => {
    if (!isLoading) {
      if (user && profile) {
        // User is logged in and has profile
        if (profile.kyc_verified) {
          setCurrentScreen('home');
        } else if (profile.role_type) {
          setCurrentScreen('kyc');
        } else {
          setCurrentScreen('role-selection');
        }
      } else if (user && !profile) {
        // User logged in but no profile yet (just signed up)
        setCurrentScreen('role-selection');
      } else if (currentScreen !== 'splash') {
        // Not logged in
        setCurrentScreen('auth');
      }
    }
  }, [user, profile, isLoading]);

  const handleSplashComplete = () => {
    if (user) {
      if (profile?.kyc_verified) {
        setCurrentScreen('home');
      } else {
        setCurrentScreen('role-selection');
      }
    } else {
      setCurrentScreen('auth');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    setCurrentScreen('kyc');
  };

  const handleKYCComplete = () => {
    setCurrentScreen('home');
  };

  const handleNavigate = (route: string) => {
    switch (route) {
      case '/map':
        setCurrentScreen('map');
        break;
      case '/properties':
        setCurrentScreen('properties');
        break;
      case '/handymen':
        setCurrentScreen('handymen');
        break;
      case '/settings':
        setCurrentScreen('settings');
        break;
      case '/chat':
        setCurrentScreen('chat');
        break;
      default:
        setCurrentScreen('home');
    }
  };

  const handleStartChat = (userId: string) => {
    setChatUserId(userId);
    setCurrentScreen('chat');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={handleSplashComplete} />;
      case 'auth':
        return <AuthPage onSuccess={() => setCurrentScreen('role-selection')} />;
      case 'role-selection':
        return <RoleSelection onSelectRole={handleRoleSelect} />;
      case 'kyc':
        return (
          <KYCFlow 
            onComplete={handleKYCComplete} 
            onBack={() => setCurrentScreen('role-selection')} 
          />
        );
      case 'home':
        return (
          <AIVoiceHub 
            userName={profile?.full_name || user?.email?.split('@')[0] || "ضيف"} 
            onNavigate={handleNavigate} 
          />
        );
      case 'map':
        return <InteractiveMap onBack={() => setCurrentScreen('home')} />;
      case 'settings':
        return <SettingsPage onBack={() => setCurrentScreen('home')} />;
      case 'properties':
        return (
          <PropertiesPage 
            onBack={() => setCurrentScreen('home')} 
            onViewProperty={() => {}} 
          />
        );
      case 'handymen':
        return (
          <HandymenPage 
            onBack={() => setCurrentScreen('home')} 
            onChat={handleStartChat}
          />
        );
      case 'chat':
        return (
          <ChatPage 
            onBack={() => setCurrentScreen('home')} 
            otherUserId={chatUserId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>
    </div>
  );
}

const App = () => {
  return (
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
};

export default App;
