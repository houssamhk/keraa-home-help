import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  CreditCard, 
  Scan, 
  CheckCircle2, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface KYCFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

type KYCStep = 'intro' | 'id-front' | 'id-back' | 'selfie' | 'processing' | 'complete';

const steps: { id: KYCStep; title: string; subtitle: string }[] = [
  { id: 'intro', title: 'Verify Your Identity', subtitle: 'This helps keep our community safe' },
  { id: 'id-front', title: 'ID Front Side', subtitle: 'Position your ID clearly in the frame' },
  { id: 'id-back', title: 'ID Back Side', subtitle: 'Capture the back of your ID' },
  { id: 'selfie', title: 'Take a Selfie', subtitle: 'We\'ll match it with your ID photo' },
  { id: 'processing', title: 'Processing', subtitle: 'Verifying your documents...' },
  { id: 'complete', title: 'Verification Complete', subtitle: 'Welcome to Keraa & Mounawil!' },
];

export function KYCFlow({ onComplete, onBack }: KYCFlowProps) {
  const [currentStep, setCurrentStep] = useState<KYCStep>('intro');
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const stepData = steps[currentStepIndex];

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
      
      // Simulate processing
      if (steps[nextIndex].id === 'processing') {
        setTimeout(() => {
          setCurrentStep('complete');
        }, 2500);
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep onContinue={goToNextStep} />;
      case 'id-front':
      case 'id-back':
        return <IDCaptureStep type={currentStep} onCapture={goToNextStep} />;
      case 'selfie':
        return <SelfieStep onCapture={goToNextStep} />;
      case 'processing':
        return <ProcessingStep />;
      case 'complete':
        return <CompleteStep onContinue={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Header */}
      <motion.div 
        className="px-6 pt-6 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {currentStep !== 'complete' && currentStep !== 'processing' && (
          <button 
            onClick={currentStep === 'intro' ? onBack : () => setCurrentStep(steps[currentStepIndex - 1].id)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}
      </motion.div>

      {/* Progress bar */}
      {currentStep !== 'intro' && currentStep !== 'complete' && (
        <div className="px-6 pb-6">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex) / (steps.length - 2)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Title */}
      <motion.div 
        className="px-6 pb-6"
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-serif text-2xl font-bold text-foreground">
          {stepData.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {stepData.subtitle}
        </p>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep}
          className="flex-1 px-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function IntroStep({ onContinue }: { onContinue: () => void }) {
  const features = [
    { icon: ShieldCheck, title: 'Bank-Level Security', desc: 'Your data is encrypted and protected' },
    { icon: CreditCard, title: 'Government ID Required', desc: 'National ID, Passport, or Driver\'s License' },
    { icon: User, title: 'Liveness Check', desc: 'A quick selfie to verify it\'s really you' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            className="elevated-card p-4 flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="pb-8 pt-4">
        <Button onClick={onContinue} variant="gold" size="lg" className="w-full">
          Start Verification
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function IDCaptureStep({ type, onCapture }: { type: 'id-front' | 'id-back'; onCapture: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Camera viewfinder placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-sm aspect-[1.6/1]">
          {/* ID frame */}
          <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-2xl" />
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {type === 'id-front' ? 'Position front of ID here' : 'Position back of ID here'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Capture button */}
      <div className="pb-8 pt-4 flex flex-col items-center gap-4">
        <Button 
          onClick={onCapture} 
          variant="gold" 
          size="iconXl"
          className="shadow-gold"
        >
          <Camera className="w-8 h-8" />
        </Button>
        <p className="text-muted-foreground text-sm">Tap to capture</p>
      </div>
    </div>
  );
}

function SelfieStep({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Camera viewfinder placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Oval frame for face */}
          <div className="w-64 h-80 border-4 border-primary rounded-[50%] flex items-center justify-center">
            <div className="text-center">
              <User className="w-20 h-20 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm px-8">
                Position your face within the oval
              </p>
            </div>
          </div>
          
          {/* Scan line animation */}
          <motion.div 
            className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ top: ['20%', '80%', '20%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Capture button */}
      <div className="pb-8 pt-4 flex flex-col items-center gap-4">
        <Button 
          onClick={onCapture} 
          variant="gold" 
          size="iconXl"
          className="shadow-gold"
        >
          <Camera className="w-8 h-8" />
        </Button>
        <p className="text-muted-foreground text-sm">Hold still and tap to capture</p>
      </div>
    </div>
  );
}

function ProcessingStep() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Scan className="w-12 h-12 text-primary" />
      </motion.div>
      <p className="text-muted-foreground mt-6 text-center">
        Analyzing your documents...<br />
        This may take a moment.
      </p>
    </div>
  );
}

function CompleteStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-14 h-14 text-green-500" />
      </motion.div>
      
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
          You're Verified!
        </h2>
        <p className="text-muted-foreground">
          Your identity has been confirmed.<br />
          You now have full access to the app.
        </p>
      </motion.div>

      <motion.div 
        className="w-full mt-auto pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onContinue} variant="gold" size="lg" className="w-full">
          Continue to Home
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}
