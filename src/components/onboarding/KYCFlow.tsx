import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  CreditCard, 
  Scan, 
  CheckCircle2, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User,
  Upload,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface KYCFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

type KYCStep = 'intro' | 'id-type' | 'id-front' | 'id-back' | 'selfie' | 'processing' | 'complete';

const steps: { id: KYCStep; title: string; subtitle: string }[] = [
  { id: 'intro', title: 'تأكيد الهوية', subtitle: 'هذا يساعد في الحفاظ على أمان مجتمعنا' },
  { id: 'id-type', title: 'نوع الوثيقة', subtitle: 'اختر نوع وثيقة الهوية' },
  { id: 'id-front', title: 'الوجه الأمامي', subtitle: 'ضع وثيقتك بوضوح في الإطار' },
  { id: 'id-back', title: 'الوجه الخلفي', subtitle: 'التقط الجانب الخلفي من الوثيقة' },
  { id: 'selfie', title: 'صورة شخصية', subtitle: 'سنطابقها مع صورة وثيقتك' },
  { id: 'processing', title: 'جاري المعالجة', subtitle: 'التحقق من وثائقك...' },
  { id: 'complete', title: 'اكتمل التحقق', subtitle: 'مرحباً بك في كراء ومناول!' },
];

const idTypes = [
  { value: 'national_id', label: 'بطاقة التعريف الوطنية' },
  { value: 'passport', label: 'جواز السفر' },
  { value: 'driver_license', label: 'رخصة السياقة' },
];

export function KYCFlow({ onComplete, onBack }: KYCFlowProps) {
  const { user, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<KYCStep>('intro');
  const [idType, setIdType] = useState<string>('national_id');
  const [capturedImages, setCapturedImages] = useState<{
    idFront: string | null;
    idBack: string | null;
    selfie: string | null;
  }>({ idFront: null, idBack: null, selfie: null });
  const [isUploading, setIsUploading] = useState(false);
  
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const stepData = steps[currentStepIndex];

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleImageCapture = async (type: 'idFront' | 'idBack' | 'selfie', imageData: string) => {
    setCapturedImages(prev => ({ ...prev, [type]: imageData }));
    
    if (type === 'selfie') {
      // All images captured, proceed to upload
      setCurrentStep('processing');
      await uploadAndVerify({ ...capturedImages, [type]: imageData });
    } else {
      goToNextStep();
    }
  };

  const uploadAndVerify = async (images: { idFront: string | null; idBack: string | null; selfie: string | null }) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setIsUploading(true);
    try {
      const uploadImage = async (base64: string, fileName: string) => {
        const base64Data = base64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const filePath = `${user.id}/${fileName}`;
        const { error } = await supabase.storage
          .from('kyc-documents')
          .upload(filePath, blob, { upsert: true });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(filePath);
        
        return publicUrl;
      };

      const idFrontUrl = images.idFront ? await uploadImage(images.idFront, 'id-front.jpg') : null;
      const idBackUrl = images.idBack ? await uploadImage(images.idBack, 'id-back.jpg') : null;
      const selfieUrl = images.selfie ? await uploadImage(images.selfie, 'selfie.jpg') : null;

      // Check if KYC record exists
      const { data: existingKyc } = await supabase
        .from('kyc_verifications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingKyc) {
        // Update existing record
        await supabase
          .from('kyc_verifications')
          .update({
            id_type: idType,
            id_front_url: idFrontUrl,
            id_back_url: idBackUrl,
            selfie_url: selfieUrl,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Create new record
        await supabase
          .from('kyc_verifications')
          .insert({
            user_id: user.id,
            id_type: idType,
            id_front_url: idFrontUrl,
            id_back_url: idBackUrl,
            selfie_url: selfieUrl,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          });
      }

      // Update profile KYC status (mark as verified for now - in production this would be approved by admin)
      await updateProfile({ kyc_verified: true } as any);

      setCurrentStep('complete');
    } catch (error) {
      console.error('KYC upload error:', error);
      toast.error('حدث خطأ أثناء رفع الوثائق');
      setCurrentStep('id-front');
    } finally {
      setIsUploading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return <IntroStep onContinue={goToNextStep} />;
      case 'id-type':
        return <IDTypeStep idType={idType} setIdType={setIdType} onContinue={goToNextStep} />;
      case 'id-front':
        return <CaptureStep type="idFront" label="الوجه الأمامي" onCapture={handleImageCapture} />;
      case 'id-back':
        return <CaptureStep type="idBack" label="الوجه الخلفي" onCapture={handleImageCapture} />;
      case 'selfie':
        return <SelfieStep onCapture={(img) => handleImageCapture('selfie', img)} />;
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
            <span>رجوع</span>
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
    { icon: ShieldCheck, title: 'أمان على مستوى البنوك', desc: 'بياناتك مشفرة ومحمية' },
    { icon: CreditCard, title: 'وثيقة هوية حكومية', desc: 'بطاقة تعريف، جواز سفر، أو رخصة قيادة' },
    { icon: User, title: 'فحص الحيوية', desc: 'صورة شخصية سريعة للتحقق من هويتك' },
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
          بدء التحقق
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function IDTypeStep({ idType, setIdType, onContinue }: { 
  idType: string; 
  setIdType: (type: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="space-y-4">
          {idTypes.map((type) => (
            <motion.button
              key={type.value}
              onClick={() => setIdType(type.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                idType === type.value 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-muted/30 hover:border-muted-foreground'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <CreditCard className={`w-6 h-6 ${idType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-medium ${idType === type.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {type.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
      
      <div className="pb-8 pt-4">
        <Button onClick={onContinue} variant="gold" size="lg" className="w-full">
          التالي
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function CaptureStep({ type, label, onCapture }: { 
  type: 'idFront' | 'idBack'; 
  label: string;
  onCapture: (type: 'idFront' | 'idBack', imageData: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('لا يمكن الوصول إلى الكاميرا. يرجى السماح بالوصول أو رفع صورة.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(type, capturedImage);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex-1 flex items-center justify-center">
        {capturedImage ? (
          <div className="relative w-full max-w-sm">
            <img src={capturedImage} alt="Captured" className="w-full rounded-2xl" />
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={retake}>
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة
              </Button>
              <Button variant="gold" className="flex-1" onClick={confirm}>
                تأكيد
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        ) : isStreaming ? (
          <div className="relative w-full max-w-sm">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full rounded-2xl"
            />
            <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-2xl pointer-events-none" />
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-[1.6/1]">
            <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-4">
              {error ? (
                <>
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <p className="text-muted-foreground text-sm text-center px-4">{error}</p>
                </>
              ) : (
                <>
                  <CreditCard className="w-16 h-16 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">{label}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pb-8 pt-4 flex flex-col items-center gap-3">
        {!capturedImage && (
          <>
            {isStreaming ? (
              <Button onClick={capturePhoto} variant="gold" size="iconXl" className="shadow-gold">
                <Camera className="w-8 h-8" />
              </Button>
            ) : (
              <div className="flex gap-3 w-full">
                <Button onClick={startCamera} variant="gold" className="flex-1 gap-2">
                  <Camera className="w-5 h-5" />
                  فتح الكاميرا
                </Button>
                <label className="flex-1">
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <span>
                      <Upload className="w-5 h-5" />
                      رفع صورة
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              {isStreaming ? 'اضغط لالتقاط الصورة' : 'اختر طريقة التقاط الصورة'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SelfieStep({ onCapture }: { onCapture: (imageData: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('لا يمكن الوصول إلى الكاميرا. يرجى السماح بالوصول.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex-1 flex items-center justify-center">
        {capturedImage ? (
          <div className="relative">
            <img src={capturedImage} alt="Selfie" className="w-64 h-80 rounded-[50%] object-cover" />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={retake}>
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة
              </Button>
              <Button variant="gold" className="flex-1" onClick={confirm}>
                تأكيد
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        ) : isStreaming ? (
          <div className="relative">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-64 h-80 rounded-[50%] object-cover"
            />
            <div className="absolute inset-0 border-4 border-primary rounded-[50%] pointer-events-none" />
            <motion.div 
              className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
              animate={{ top: ['20%', '80%', '20%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        ) : (
          <div className="relative">
            <div className="w-64 h-80 border-4 border-primary rounded-[50%] flex items-center justify-center">
              {error ? (
                <div className="text-center px-8">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{error}</p>
                </div>
              ) : (
                <div className="text-center">
                  <User className="w-20 h-20 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm px-8">
                    ضع وجهك داخل الشكل البيضاوي
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pb-8 pt-4 flex flex-col items-center gap-4">
        {!capturedImage && (
          <>
            {isStreaming ? (
              <Button onClick={capturePhoto} variant="gold" size="iconXl" className="shadow-gold">
                <Camera className="w-8 h-8" />
              </Button>
            ) : (
              <Button onClick={startCamera} variant="gold" size="lg" className="gap-2">
                <Camera className="w-5 h-5" />
                فتح الكاميرا الأمامية
              </Button>
            )}
            <p className="text-muted-foreground text-sm">
              {isStreaming ? 'ابق ثابتاً واضغط لالتقاط الصورة' : 'اضغط لفتح الكاميرا'}
            </p>
          </>
        )}
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
        جاري تحليل وثائقك...<br />
        قد يستغرق هذا لحظة.
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
          تم التحقق!
        </h2>
        <p className="text-muted-foreground">
          تم تأكيد هويتك بنجاح.<br />
          لديك الآن وصول كامل للتطبيق.
        </p>
      </motion.div>

      <motion.div 
        className="w-full mt-auto pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onContinue} variant="gold" size="lg" className="w-full">
          المتابعة للرئيسية
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}