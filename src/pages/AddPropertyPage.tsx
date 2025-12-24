import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Home, MapPin, DollarSign, Bed, Bath, Ruler, Loader2, Upload, X, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddPropertyPageProps {
  onBack: () => void;
  onSuccess: () => void;
  editPropertyId?: string;
}

export function AddPropertyPage({ onBack, onSuccess, editPropertyId }: AddPropertyPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    price: '',
    price_period: 'month',
    property_type: 'apartment',
    bedrooms: '1',
    bathrooms: '1',
    area_sqm: ''
  });

  const propertyTypes = [
    { id: 'apartment', label: 'شقة' },
    { id: 'house', label: 'منزل' },
    { id: 'villa', label: 'فيلا' },
    { id: 'studio', label: 'استوديو' },
    { id: 'room', label: 'غرفة' }
  ];

  const pricePeriods = [
    { id: 'day', label: 'يومياً' },
    { id: 'week', label: 'أسبوعياً' },
    { id: 'month', label: 'شهرياً' },
    { id: 'year', label: 'سنوياً' }
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploadingMedia(true);

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isImage && !isVideo) {
        toast({
          title: 'خطأ',
          description: 'يرجى اختيار صور أو فيديوهات فقط',
          variant: 'destructive'
        });
        continue;
      }

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('property-media')
        .upload(fileName, file);

      if (error) {
        toast({
          title: 'خطأ',
          description: 'فشل في رفع الملف',
          variant: 'destructive'
        });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('property-media')
        .getPublicUrl(data.path);

      setMediaFiles(prev => [...prev, { 
        url: urlData.publicUrl, 
        type: isVideo ? 'video' : 'image' 
      }]);
    }

    setUploadingMedia(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.title || !formData.address || !formData.city || !formData.price) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const propertyData = {
      owner_id: user.id,
      title: formData.title,
      description: formData.description,
      address: formData.address,
      city: formData.city,
      price: parseFloat(formData.price),
      price_period: formData.price_period,
      property_type: formData.property_type,
      bedrooms: parseInt(formData.bedrooms),
      bathrooms: parseInt(formData.bathrooms),
      area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
      images: mediaFiles.map(m => m.url)
    };

    const { error } = await supabase
      .from('properties')
      .insert(propertyData);

    setIsLoading(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة العقار',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'تم بنجاح',
        description: 'تم إضافة العقار بنجاح'
      });
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          {editPropertyId ? 'تعديل العقار' : 'إضافة عقار جديد'}
        </h1>
      </motion.header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto">
        {/* Media Upload */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">الصور والفيديوهات</label>
          <div className="glass-card p-4">
            {/* Preview Grid */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {media.type === 'image' ? (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={media.url} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-destructive-foreground" />
                    </button>
                    {media.type === 'video' && (
                      <div className="absolute bottom-1 left-1">
                        <Video className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="glass"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
            >
              {uploadingMedia ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>رفع صور أو فيديوهات</span>
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              يمكنك رفع صور وفيديوهات متعددة
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">عنوان الإعلان *</label>
          <div className="glass-card flex items-center gap-3 px-4 py-3">
            <Home className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: شقة فاخرة في حيدرة"
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              dir="auto"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">الوصف</label>
          <div className="glass-card px-4 py-3">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="وصف تفصيلي للعقار..."
              rows={3}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
              dir="auto"
            />
          </div>
        </div>

        {/* Address & City */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">العنوان *</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="الشارع/الحي"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
                dir="auto"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">المدينة *</label>
            <div className="glass-card px-4 py-3">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="المدينة"
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
                dir="auto"
              />
            </div>
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">نوع العقار</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {propertyTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, property_type: type.id }))}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  formData.property_type === type.id
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">السعر *</label>
          <div className="flex gap-2">
            <div className="flex-1 glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="السعر بالدينار"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
            <select
              value={formData.price_period}
              onChange={(e) => setFormData(prev => ({ ...prev, price_period: e.target.value }))}
              className="glass-card px-4 py-3 bg-transparent text-foreground outline-none"
            >
              {pricePeriods.map(period => (
                <option key={period.id} value={period.id} className="bg-background">
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rooms */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">غرف النوم</label>
            <div className="glass-card flex items-center gap-2 px-4 py-3">
              <Bed className="w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground w-full text-center"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">الحمامات</label>
            <div className="glass-card flex items-center gap-2 px-4 py-3">
              <Bath className="w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground w-full text-center"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">المساحة م²</label>
            <div className="glass-card flex items-center gap-2 px-4 py-3">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                min="0"
                value={formData.area_sqm}
                onChange={(e) => setFormData(prev => ({ ...prev, area_sqm: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-foreground w-full text-center"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            editPropertyId ? 'حفظ التعديلات' : 'نشر العقار'
          )}
        </Button>
      </form>
    </div>
  );
}
