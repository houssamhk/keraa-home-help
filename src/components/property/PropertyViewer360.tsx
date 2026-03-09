import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Move,
  X,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface PropertyViewer360Props {
  images: string[];
  propertyTitle: string;
  onClose?: () => void;
  isOpen?: boolean;
}

export function PropertyViewer360({ images, propertyTitle, onClose, isOpen = true }: PropertyViewer360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate || images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 150);

    return () => clearInterval(interval);
  }, [autoRotate, images.length]);

  // Handle mouse/touch drag for 360° effect
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (images.length <= 1) return;
    setIsDragging(true);
    setAutoRotate(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || images.length <= 1) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startX;
    
    if (Math.abs(diff) > 20) {
      const direction = diff > 0 ? -1 : 1;
      setCurrentIndex((prev) => (prev + direction + images.length) % images.length);
      setStartX(clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handling
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 1));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setCurrentIndex(0);
    setAutoRotate(false);
  };

  // Pan handling when zoomed
  const handlePan = (e: React.MouseEvent) => {
    if (zoom <= 1 || !isDragging) return;
    setOffsetX((prev) => prev + e.movementX);
    setOffsetY((prev) => prev + e.movementY);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>لا توجد صور متاحة</p>
        </div>
      </div>
    );
  }

  const viewerContent = (
    <div
      ref={containerRef}
      className={`relative select-none ${isFullscreen ? 'h-screen' : 'h-[400px] md:h-[500px]'} rounded-lg overflow-hidden bg-black`}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        if (zoom > 1) handlePan(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Image */}
      <motion.div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `scale(${zoom}) translate(${offsetX / zoom}px, ${offsetY / zoom}px) rotate(${rotation}deg)`,
          cursor: isDragging ? 'grabbing' : zoom > 1 ? 'move' : 'grab',
        }}
      >
        <img
          src={images[currentIndex]}
          alt={`${propertyTitle} - صورة ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
          onLoad={handleImageLoad}
        />
      </motion.div>

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Image Counter */}
        <div className="flex justify-center mb-3">
          <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mb-4 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setAutoRotate(false);
                }}
                className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${
                  idx === currentIndex ? 'border-primary scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 bg-black/50 hover:bg-black/70"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 bg-black/50 hover:bg-black/70"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {images.length > 1 && (
            <Button
              variant={autoRotate ? 'default' : 'secondary'}
              size="icon"
              className={`h-10 w-10 ${autoRotate ? '' : 'bg-black/50 hover:bg-black/70'}`}
              onClick={() => setAutoRotate(!autoRotate)}
            >
              <RotateCcw className={`h-4 w-4 ${autoRotate ? 'animate-spin' : ''}`} />
            </Button>
          )}

          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 bg-black/50 hover:bg-black/70"
            onClick={handleReset}
          >
            <Move className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 bg-black/50 hover:bg-black/70"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Zoom Slider */}
        {zoom > 1 && (
          <div className="mt-3 px-8">
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={([value]) => setZoom(value)}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* 360° indicator */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          360°
        </div>
      )}

      {/* Close button (for dialog mode) */}
      {onClose && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 h-10 w-10 bg-black/50 hover:bg-black/70"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Drag instruction */}
      {images.length > 1 && !isDragging && !autoRotate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="bg-black/60 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Move className="h-4 w-4" />
            اسحب للتدوير
          </div>
        </motion.div>
      )}
    </div>
  );

  // If used as a standalone component
  if (!onClose) {
    return viewerContent;
  }

  // If used in a dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{propertyTitle} - عرض 360°</DialogTitle>
        </DialogHeader>
        {viewerContent}
      </DialogContent>
    </Dialog>
  );
}
