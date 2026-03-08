import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (signatureData: string) => void;
  signerName: string;
  title?: string;
}

export function SignaturePad({ open, onOpenChange, onSign, signerName, title }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1a1a1a';
    setHasDrawn(false);
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay to let dialog render
      const timer = setTimeout(setupCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [open, setupCanvas]);

  const getPosition = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    lastPointRef.current = pos;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx || !lastPointRef.current) return;
    
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
  };

  const stopDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    setupCanvas();
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const signatureData = canvas.toDataURL('image/png');
    onSign(signatureData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-lg font-serif">
            {title || 'التوقيع الإلكتروني'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {signerName}
          </p>
        </DialogHeader>

        <div className="px-5">
          {/* Signature area */}
          <div className="relative rounded-xl border-2 border-dashed border-primary/30 bg-card overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full touch-none cursor-crosshair"
              style={{ height: '200px' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground/50 text-sm">وقّع هنا بإصبعك أو بالماوس</p>
              </div>
            )}
            {/* Signature line */}
            <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/20" />
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            مسح
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={handleConfirm}
            disabled={!hasDrawn}
            className="gap-1.5"
          >
            <Check className="w-4 h-4" />
            تأكيد التوقيع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
