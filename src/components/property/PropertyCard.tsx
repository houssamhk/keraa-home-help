import { motion } from 'framer-motion';
import { MapPin, Bed, Bath, Ruler, Heart, Play, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FeaturedBadge } from '@/components/premium/FeaturedBadge';
import { cn } from '@/lib/utils';

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
  is_featured?: boolean;
}

interface PropertyCardProps {
  property: Property;
  index?: number;
  onClick: () => void;
}

const getPropertyTypeText = (type: string) => {
  return {
    apartment: 'شقة',
    house: 'منزل',
    villa: 'فيلا',
    studio: 'استوديو',
    room: 'غرفة'
  }[type] || type;
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

// Helper to parse media from images array
const parseMedia = (images: string[]): MediaItem[] => {
  if (!images || images.length === 0) return [];
  
  return images.map(url => {
    // Check if it's a video (by extension or URL pattern)
    if (url.match(/\.(mp4|webm|mov|avi)$/i) || url.includes('/video/')) {
      return { url, type: 'video' as const };
    }
    // Check if it's a 360 image (by naming convention)
    if (url.includes('360') || url.includes('panorama') || url.includes('pano')) {
      return { url, type: '360' as const };
    }
    return { url, type: 'image' as const };
  });
};

export function PropertyCard({ property, index = 0, onClick }: PropertyCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const media = parseMedia(property.images);
  const firstMedia = media[0];
  
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(property.id);
  };

  const hasVideo = media.some(m => m.type === 'video');
  const has360 = media.some(m => m.type === '360');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* Property Image/Media */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-surface-elevated overflow-hidden">
        {firstMedia ? (
          <>
            {firstMedia.type === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  src={firstMedia.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                  onMouseOut={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.pause();
                    video.currentTime = 0;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-foreground fill-current" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={firstMedia.url}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-sm">
              {getPropertyTypeText(property.property_type)}
            </span>
          </div>
        )}

        {/* Media Type Indicators */}
        <div className="absolute top-3 left-3 flex gap-2">
          {has360 && (
            <div className="bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              360°
            </div>
          )}
          {hasVideo && (
            <div className="bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Play className="w-3 h-3" />
              فيديو
            </div>
          )}
          {media.length > 1 && (
            <div className="bg-black/60 text-white px-2 py-1 rounded-full text-xs">
              {media.length} صور
            </div>
          )}
        </div>

        {/* Featured Badge */}
        {property.is_featured && (
          <div className="absolute top-3 right-12">
            <FeaturedBadge size="sm" />
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-primary/20 hover:scale-110"
        >
          <Heart
            className={cn(
              'w-5 h-5 transition-colors',
              isFavorite(property.id) ? 'fill-primary text-primary' : 'text-foreground'
            )}
          />
        </button>

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg">
          {formatPrice(property.price, property.price_period)}
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">
          {property.title}
        </h3>
        
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{property.address}، {property.city}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Bed className="w-4 h-4" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="w-4 h-4" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ruler className="w-4 h-4" />
            <span>{property.area_sqm} م²</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
