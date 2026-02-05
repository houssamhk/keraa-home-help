import { motion } from 'framer-motion';
import { Home, Search, MessageCircle, User, Briefcase, FileText, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/user';

interface MobileBottomNavProps {
  currentScreen: string;
  onNavigate: (route: string) => void;
  userRole?: UserRole;
}

interface NavItem {
  id: string;
  route: string;
  icon: React.ElementType;
  label: string;
}

export function MobileBottomNav({ currentScreen, onNavigate, userRole }: MobileBottomNavProps) {
  // Define nav items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { id: 'home', route: '/home', icon: Home, label: 'الرئيسية' },
      { id: 'properties', route: '/properties', icon: Search, label: 'العقارات' },
    ];

    // Add role-specific items
    if (userRole === 'owner') {
      baseItems.push({ id: 'owner-dashboard', route: '/owner-dashboard', icon: Briefcase, label: 'عقاراتي' });
    } else if (userRole === 'handyman') {
      baseItems.push({ id: 'handyman-dashboard', route: '/handyman-dashboard', icon: Wrench, label: 'طلباتي' });
    } else {
      baseItems.push({ id: 'contracts', route: '/contracts', icon: FileText, label: 'عقودي' });
    }

    // Common items
    baseItems.push(
      { id: 'chat', route: '/chat', icon: MessageCircle, label: 'المحادثات' },
      { id: 'profile', route: '/profile', icon: User, label: 'حسابي' }
    );

    return baseItems;
  };

  const navItems = getNavItems();

  const isActive = (item: NavItem) => {
    if (item.id === 'home' && currentScreen === 'home') return true;
    if (item.id === 'properties' && (currentScreen === 'properties' || currentScreen === 'favorites')) return true;
    if (item.id === 'chat' && currentScreen === 'chat') return true;
    if (item.id === 'profile' && (currentScreen === 'profile' || currentScreen === 'settings')) return true;
    if (item.id === 'owner-dashboard' && currentScreen === 'owner-dashboard') return true;
    if (item.id === 'handyman-dashboard' && currentScreen === 'handyman-dashboard') return true;
    if (item.id === 'contracts' && currentScreen === 'contracts') return true;
    return false;
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border mobile-nav z-50"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.route)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              
              <Icon 
                className={cn(
                  'w-5 h-5 mb-0.5 transition-transform duration-200',
                  active && 'scale-110'
                )} 
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
