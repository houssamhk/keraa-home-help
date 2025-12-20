import { useState } from "react";
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
import type { UserRole } from "@/types/user";

const queryClient = new QueryClient();

type AppScreen = 'splash' | 'role-selection' | 'kyc' | 'home' | 'map';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("Guest");

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    setCurrentScreen('kyc');
  };

  const handleKYCComplete = () => {
    setUserName("Yassine");
    setCurrentScreen('home');
  };

  const handleNavigate = (route: string) => {
    if (route === '/map' || route === '/properties' || route === '/handymen') {
      setCurrentScreen('map');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={() => setCurrentScreen('role-selection')} />;
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
        return <AIVoiceHub userName={userName} onNavigate={handleNavigate} />;
      case 'map':
        return <InteractiveMap onBack={() => setCurrentScreen('home')} />;
      default:
        return null;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background">
          <AnimatePresence mode="wait">
            {renderScreen()}
          </AnimatePresence>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
