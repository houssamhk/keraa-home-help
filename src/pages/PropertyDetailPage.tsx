import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, MapPin, Bed, Bath, Ruler, Heart, MessageCircle, 
  FileText, CreditCard, Share2, Calendar, Home,
  Flame, Snowflake, Car, Trees, Waves, Wifi, Armchair, Flag, Shield
} from 'lucide-react';
import { PropertyMediaGallery } from '@/components/property/PropertyMediaGallery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { usePropertyViews } from '@/hooks/usePropertyViews';
import { ReportDialog } from '@/components/common/ReportDialog';
import { BookViewingDialog } from '@/components/property/BookViewingDialog';
import { VerificationServiceDialog } from '@/components/premium/VerificationServiceDialog';
import { toast } from 'sonner';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | '360';
}

interface Property {
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

// Helper to parse media from images array
const parseMedia = (images: string[]): MediaItem[] => {
  if (!images || images.length === 0) return [];
  
  return images.map(url => {
    if (url.match(/\.(mp4|webm|mov|avi)$/i) || url.includes('/video/')) {
      return { url, type: 'video' as const };
    }
    if (url.includes('360') || url.includes('panorama') || url.includes('pano')) {
      return { url, type: '360' as const };
    }
    return { url, type: 'image' as const };
  });
};

interface PropertyDetailPageProps {
  property: Property;
  onBack: () => void;
  onChat: (ownerId: string) => void;
  onCreateContract: (propertyId: string) => void;
  onArrabon: () => void;
  needsKYC?: boolean;
}

const amenityIcons: Record<string, any> = {
  heating: Flame,
  ac: Snowflake,
  garage: Car,
  garden: Trees,
  pool: Waves,
  wifi: Wifi,
  furnished: Armchair,
  balcony: Home,
  elevator: Home,
};

const amenityLabels: Record<string, string> = {
  heating: 'تدفئة',
  ac: 'تكييف',
  garage: 'كراج',
  garden: 'حديقة',
  pool: 'مسبح',
  wifi: 'واي فاي',
  furnished: 'مفروشة',
  balcony: 'شرفة',
  elevator: 'مصعد',
};

export function PropertyDetailPage({ 
  property, 
  onBack, 
  onChat, 
  onCreateContract,
  onArrabon,
  needsKYC
}: PropertyDetailPageProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { logView } = usePropertyViews();
  const [reportOpen, setReportOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Log view when property is viewed
  useEffect(() => {
    if (property?.id) {
      logView(property.id);
    }
  }, [property?.id, logView]);

  const handleToggleFavorite = async () => {
    await toggleFavorite(property.id);
  };

  const formatPrice = (price: number, period: string) => {
    const periodText = {
      day: 'يوم',
      week: 'أسبوع',
      month: 'شهر',
      year: 'سنة'
    }[period] || 'شهر';
    
    return `${price.toLocaleString('ar-DZ')} دج/${periodText}`;
  };

  const getPropertyTypeText = (type: string) => {
    return {
      apartment: 'شقة',
      house: 'منزل',
      villa: 'فيلا',
      studio: 'استوديو',
      room: 'غرفة'
    }[type] || type;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: property.title,
        text: `${property.title} - ${formatPrice(property.price, property.price_period)}`,
        url: window.location.href
      });
    } catch {
      toast.success('تم نسخ الرابط');
    }
  };

  const handleContactOwner = () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    if (needsKYC) {
      toast.error('يجب تأكيد هويتك أولاً للتواصل مع المالك');
      return;
    }
    if (property.owner_id) {
      onChat(property.owner_id);
    } else {
      toast.info('سيتم التواصل مع المالك قريباً');
    }
  };

  const handleBooking = () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    if (needsKYC) {
      toast.error('يجب تأكيد هويتك أولاً لإنشاء عقد');
      return;
    }
    onCreateContract(property.id);
  };

  const handlePayArrabon = () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    if (needsKYC) {
      toast.error('يجب تأكيد هويتك أولاً لدفع العربون');
      return;
    }
    onArrabon();
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header with Media Gallery */}
      <div className="relative">
        <PropertyMediaGallery 
          media={parseMedia(property.images)}
          title={property.title}
          aspectRatio="video"
        />
        
        {/* Header Actions - Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Button 
            variant="glass" 
            size="icon" 
            onClick={onBack}
            className="bg-background/80 backdrop-blur-sm"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="glass" 
              size="icon"
              onClick={handleShare}
              className="bg-background/80 backdrop-blur-sm"
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button 
              variant="glass" 
              size="icon"
              onClick={handleToggleFavorite}
              className="bg-background/80 backdrop-blur-sm"
            >
              <Heart className={`w-5 h-5 ${isFavorite(property.id) ? 'fill-primary text-primary' : ''}`} />
            </Button>
            <Button 
              variant="glass" 
              size="icon"
              onClick={() => setReportOpen(true)}
              className="bg-background/80 backdrop-blur-sm"
            >
              <Flag className="w-5 h-5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold z-10">
          {formatPrice(property.price, property.price_period)}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Title & Location */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{getPropertyTypeText(property.property_type)}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{property.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{property.address}، {property.city}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-lg font-bold">{property.bedrooms}</p>
              <p className="text-xs text-muted-foreground">غرف نوم</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-lg font-bold">{property.bathrooms}</p>
              <p className="text-xs text-muted-foreground">حمامات</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <Ruler className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-lg font-bold">{property.area_sqm}</p>
              <p className="text-xs text-muted-foreground">م²</p>
            </CardContent>
          </Card>
        </div>

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">المرافق</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => {
                const Icon = amenityIcons[amenity] || Home;
                return (
                  <Badge key={amenity} variant="outline" className="gap-2 py-2 px-3">
                    <Icon className="w-4 h-4" />
                    {amenityLabels[amenity] || amenity}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <div>
            <h2 className="text-lg font-bold mb-3">الوصف</h2>
            <p className="text-muted-foreground leading-relaxed">{property.description}</p>
          </div>
        )}

        {/* Action Cards */}
        <div className="space-y-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">تواصل مع المالك</p>
                    <p className="text-xs text-muted-foreground">اسأل عن التفاصيل</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleContactOwner}>
                  محادثة
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">حجز موعد للمعاينة</p>
                    <p className="text-xs text-muted-foreground">زيارة العقار</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    if (!user) {
                      toast.error('يجب تسجيل الدخول أولاً');
                      return;
                    }
                    if (needsKYC) {
                      toast.error('يجب تأكيد هويتك أولاً لحجز موعد');
                      return;
                    }
                    setBookingOpen(true);
                  }}
                >
                  حجز
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Verification Service Card */}
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">التقرير الموثوق</p>
                    <p className="text-xs text-muted-foreground">فحص العقار وتوثيق الأوراق</p>
                  </div>
                </div>
                <VerificationServiceDialog
                  propertyId={property.id}
                  propertyTitle={property.title}
                  trigger={
                    <Button size="sm" variant="outline" className="text-green-600 border-green-500/30 hover:bg-green-500/10">
                      طلب
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border p-4 safe-area-inset"
      >
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handlePayArrabon}
          >
            <CreditCard className="w-4 h-4" />
            دفع عربون
          </Button>
          <Button 
            className="flex-1 gap-2 bg-primary"
            onClick={handleBooking}
          >
            <FileText className="w-4 h-4" />
            إنشاء عقد
          </Button>
        </div>
      </motion.div>

      {/* Report Dialog */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedType="property"
        reportedId={property.id}
        reportedName={property.title}
      />

      {/* Booking Dialog */}
      <BookViewingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        property={{
          id: property.id,
          title: property.title,
          owner_id: property.owner_id
        }}
      />
    </div>
  );
}
