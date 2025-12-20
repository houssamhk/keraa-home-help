import { motion } from "framer-motion";
import { Home, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/user";

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

const roles = [
  {
    id: "tenant" as UserRole,
    title: "I'm Looking for a Home",
    subtitle: "Rent properties & hire handymen",
    icon: Home,
    features: [
      "Browse 360° virtual tours",
      "Secure rental contracts",
      "Book trusted handymen"
    ],
  },
  {
    id: "provider" as UserRole,
    title: "I'm a Provider",
    subtitle: "List properties or offer services",
    icon: Wrench,
    features: [
      "List your properties",
      "Offer handyman services",
      "Secure escrow payments"
    ],
  },
];

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Header */}
      <motion.div 
        className="px-6 pt-12 pb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Welcome to{" "}
          <span className="gold-text">Keraa & Mounawil</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          How would you like to use the app?
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="flex-1 px-6 pb-8 space-y-4">
        {roles.map((role, index) => (
          <motion.button
            key={role.id}
            onClick={() => onSelectRole(role.id)}
            className="w-full text-left group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="elevated-card p-6 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-gold/20">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <role.icon className="w-7 h-7 text-primary" />
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
                  <ul className="mt-4 space-y-2">
                    {role.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arrow */}
                <div className="shrink-0 mt-2">
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <motion.div 
        className="px-6 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <button className="text-primary hover:underline">Terms of Service</button>
          {" "}and{" "}
          <button className="text-primary hover:underline">Privacy Policy</button>
        </p>
      </motion.div>
    </div>
  );
}
