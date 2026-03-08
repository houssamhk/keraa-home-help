import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { z } from 'zod';

interface AuthPageProps {
  onSuccess: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  phone?: string;
  birthDate?: string;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const emailSchema = z.string().trim().email(t.auth.invalidEmail);
  const passwordSchema = z.string().min(6, t.auth.passwordMin);
  const nameSchema = z.string().trim().min(2, t.auth.nameMin).max(100, t.auth.nameTooLong);
  const phoneSchema = z.string().regex(/^(0|\+213)[5-7][0-9]{8}$/, t.auth.invalidPhone);
  const birthDateSchema = z.string().refine((date) => {
    const bd = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - bd.getFullYear();
    return age >= 18 && age <= 100;
  }, t.auth.ageRequired);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }
    try { passwordSchema.parse(password); } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }
    
    if (!isLogin) {
      if (password !== confirmPassword) newErrors.confirmPassword = t.auth.passwordMismatch;
      try { nameSchema.parse(fullName); } catch (e) {
        if (e instanceof z.ZodError) newErrors.name = e.errors[0].message;
      }
      try { phoneSchema.parse(phone); } catch (e) {
        if (e instanceof z.ZodError) newErrors.phone = e.errors[0].message;
      }
      try { birthDateSchema.parse(birthDate); } catch (e) {
        if (e instanceof z.ZodError) newErrors.birthDate = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({ title: t.auth.loginError, description: t.auth.invalidCredentials, variant: 'destructive' });
          } else {
            toast({ title: t.error, description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: t.auth.welcome, description: t.auth.loginSuccess });
          onSuccess();
        }
      } else {
        const { error } = await signUp(email, password, fullName, phone, birthDate);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({ title: t.auth.accountExists, description: t.auth.accountExistsDesc, variant: 'destructive' });
          } else {
            toast({ title: t.error, description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: t.auth.registered, description: t.auth.registeredDesc });
          onSuccess();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-inset">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold gold-text mb-2">{t.auth.title}</h1>
          <p className="text-muted-foreground">
            {isLogin ? t.auth.loginWelcome : t.auth.signupWelcome}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <div className="glass-card flex items-center gap-3 px-4 py-3">
                  <User className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.auth.fullName}
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground" dir="auto" />
                </div>
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <div className="glass-card flex items-center gap-3 px-4 py-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.auth.phone}
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground" dir="ltr" />
                </div>
                {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t.auth.birthDate}</label>
                <div className="glass-card flex items-center gap-3 px-4 py-3">
                  <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className="flex-1 bg-transparent border-none outline-none text-foreground" />
                </div>
                {errors.birthDate && <p className="text-destructive text-sm mt-1">{errors.birthDate}</p>}
              </div>
            </>
          )}

          <div>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.email}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground" dir="ltr" />
            </div>
            {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.password}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground" dir="ltr" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground shrink-0">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
          </div>

          {!isLogin && (
            <div>
              <div className="glass-card flex items-center gap-3 px-4 py-3">
                <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.auth.confirmPassword}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground" dir="ltr" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-muted-foreground hover:text-foreground shrink-0">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          )}

          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? t.auth.login : t.auth.signup}
                <ArrowRight className="w-5 h-5 ms-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-primary transition-colors">
            {isLogin ? t.auth.noAccount : t.auth.hasAccount}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
