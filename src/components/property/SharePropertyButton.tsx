import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface SharePropertyButtonProps {
  propertyId: string;
  title: string;
  price: number;
  city: string;
  className?: string;
}

export function SharePropertyButton({ propertyId, title, price, city, className }: SharePropertyButtonProps) {
  const shareUrl = `https://sakani.app/property/${propertyId}`;
  const shareText = `🏠 ${title} - ${price.toLocaleString('ar-DZ')} دج\n📍 ${city}\n\nشاهد التفاصيل على سكني:`;

  const handleShare = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title, text: shareText, url: shareUrl, dialogTitle: 'مشاركة العقار' });
        return;
      }

      if (navigator.share) {
        await navigator.share({ title, text: shareText, url: shareUrl });
        return;
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('تم نسخ الرابط');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success('تم نسخ الرابط');
      }
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={handleShare} className={className}>
      <Share2 className="w-5 h-5" />
    </Button>
  );
}
