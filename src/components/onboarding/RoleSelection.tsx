import { useState } from "react";
import { motion } from "framer-motion";
import { Home, Wrench, Search, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { UserRole } from "@/types/user";

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const { t, dir } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const roles = [
    {
      id: "tenant" as UserRole,
      title: t.roleSelection.tenant.title,
      subtitle: t.roleSelection.tenant.subtitle,
      icon: Search,
      features: t.roleSelection.tenant.features,
    },
    {
      id: "owner" as UserRole,
      title: t.roleSelection.owner.title,
      subtitle: t.roleSelection.owner.subtitle,
      icon: Home,
      features: t.roleSelection.owner.features,
    },
    {
      id: "provider" as UserRole,
      title: t.roleSelection.provider.title,
      subtitle: t.roleSelection.provider.subtitle,
      icon: Wrench,
      features: t.roleSelection.provider.features,
    },
  ];

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
    setIsLoading(true);

    try {
      // Save role to profile
      const { error } = await updateProfile({ role_type: role });
      
      if (error) {
        throw error;
      }

      toast({
        title: t.roleSelection.rolesSaved,
        description: t.roleSelection.rolesSavedDesc
      });

      onSelectRole(role);
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || "حدث خطأ أثناء حفظ نوع الحساب",
        variant: "destructive"
      });
      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset" dir={dir}>
      {/* Header */}
      <motion.div 
        className={`px-6 pt-12 pb-6 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-serif text-3xl font-bold text-foreground">
          {t.roleSelection.title.split('كراء و مناول').length > 1 ? (
            <>
              {t.roleSelection.title.split('كراء و مناول')[0]}
              <span className="gold-text">كراء و مناول</span>
              {t.roleSelection.title.split('كراء و مناول')[1]}
            </>
          ) : (
            <span>{t.roleSelection.title}</span>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t.roleSelection.subtitle}
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto">
        {roles.map((role, index) => (
          <motion.button
            key={role.id}
            onClick={() => handleRoleSelect(role.id)}
            disabled={isLoading}
            className="w-full text-right group disabled:opacity-50"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`elevated-card p-5 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-gold/20 ${
              selectedRole === role.id ? 'border-primary bg-primary/5' : ''
            }`}>
              <div className="flex items-start gap-4">
                {/* Arrow or Loader */}
                <div className="shrink-0 mt-2">
                  {isLoading && selectedRole === role.id ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all rotate-180" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {role.subtitle}
                  </p>
                  
                  {/* Features */}
                  <ul className="mt-3 space-y-1.5">
                    {role.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
                        {feature}
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <role.icon className="w-7 h-7 text-primary" />
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <motion.div 
        className="px-6 pb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-center text-xs text-muted-foreground">
          بالمتابعة، أنت توافق على{" "}
          <button className="text-primary hover:underline">شروط الخدمة</button>
          {" "}و{" "}
          <button className="text-primary hover:underline">سياسة الخصوصية</button>
        </p>
      </motion.div>
    </div>
  );
}