import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, RotateCcw, Expand, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | '360';
}

interface PropertyMediaGalleryProps {
  media: MediaItem[];
  title: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'wide';
}

export function PropertyMediaGallery({ 
  media, 
  title, 
  className,
  aspectRatio = 'video' 
}: PropertyMediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [is360Active, setIs360Active] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentMedia = media[currentIndex];
  const hasMultipleMedia = media.length > 1;

  const aspectRatioClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    wide: 'aspect-[21/9]'
  }[aspectRatio];

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % media.length);
    setIs360Active(false);
    setRotation({ x: 0, y: 0 });
  };

  const goToPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    setIs360Active(false);
    setRotation({ x: 0, y: 0 });
  };

  const handle360Start = (e: React.MouseEvent | React.TouchEvent) => {
    if (currentMedia?.type !== '360') return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handle360Move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || currentMedia?.type !== '360') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setRotation(prev => ({
      x: prev.x + deltaY * 0.5,
      y: prev.y + deltaX * 0.5
    }));
    
    setDragStart({ x: clientX, y: clientY });
  };

  const handle360End = () => {
    setIsDragging(false);
  };

  const renderMedia = (item: MediaItem, inFullscreen = false) => {
    const containerClass = inFullscreen 
      ? 'w-full h-full' 
      : `w-full ${aspectRatioClass}`;

    if (item.type === 'video') {
      return (
        <div className={cn(containerClass, 'bg-black relative')}>
          <video
            src={item.url}
            controls
            className="w-full h-full object-contain"
            poster={item.url.replace(/\.[^/.]+$/, '_thumb.jpg')}
          >
            <source src={item.url} type="video/mp4" />
            متصفحك لا يدعم تشغيل الفيديو
          </video>
        </div>
      );
    }

    if (item.type === '360') {
      return (
        <div 
          className={cn(containerClass, 'bg-black relative overflow-hidden cursor-grab active:cursor-grabbing')}
          onMouseDown={handle360Start}
          onMouseMove={handle360Move}
          onMouseUp={handle360End}
          onMouseLeave={handle360End}
          onTouchStart={handle360Start}
          onTouchMove={handle360Move}
          onTouchEnd={handle360End}
        >
          <div
            className="w-full h-full transition-transform duration-100"
            style={{
              transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            }}
          >
            <img
              src={item.url}
              alt={`${title} - صورة 360°`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
            اسحب للتدوير 360°
          </div>
        </div>
      );
    }

    // Regular image
    return (
      <div className={cn(containerClass, 'bg-muted')}>
        <img
          src={item.url}
          alt={title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  };

  const renderMediaTypeIndicator = (item: MediaItem) => {
    if (item.type === 'video') {
      return (
        <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
          <Play className="w-3 h-3" />
          فيديو
        </div>
      );
    }
    if (item.type === '360') {
      return (
        <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3" />
          360°
        </div>
      );
    }
    return null;
  };

  if (!media || media.length === 0) {
    return (
      <div className={cn('bg-muted flex items-center justify-center', aspectRatioClass, className)}>
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد صور</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('relative group', className)}>
        {/* Main Media Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {renderMedia(currentMedia)}
            {renderMediaTypeIndicator(currentMedia)}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {hasMultipleMedia && (
          <>
            <Button
              variant="glass"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={goToPrev}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="glass"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={goToNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Fullscreen Button */}
        <Button
          variant="glass"
          size="icon"
          className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(true);
          }}
        >
          <Expand className="w-4 h-4" />
        </Button>

        {/* Dots Indicator */}
        {hasMultipleMedia && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex 
                    ? 'bg-primary w-6' 
                    : 'bg-white/60 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        )}

        {/* Media Counter */}
        {hasMultipleMedia && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </Button>

            {renderMedia(currentMedia, true)}

            {hasMultipleMedia && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={goToPrev}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Thumbnails */}
            {hasMultipleMedia && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 p-2 rounded-lg">
                {media.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'w-16 h-12 rounded overflow-hidden transition-all',
                      index === currentIndex 
                        ? 'ring-2 ring-primary' 
                        : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    {item.type === 'video' ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.type === '360' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <RotateCcw className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
