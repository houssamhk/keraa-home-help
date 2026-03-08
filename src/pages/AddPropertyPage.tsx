import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Home, MapPin, DollarSign, Bed, Bath, Ruler, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LocationPicker } from '@/components/map/LocationPicker';
import { MultiImageUpload, type MediaFile } from '@/components/upload/MultiImageUpload';
import { useLanguage } from '@/i18n/LanguageContext';

interface AddPropertyPageProps {
  onBack: () => void;
  onSuccess: () => void;
  editPropertyId?: string;
}

export function AddPropertyPage({ onBack, onSuccess, editPropertyId }: AddPropertyPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, dir } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  
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
    area_sqm: '',
    latitude: null as number | null,
    longitude: null as number | null
  });

  useEffect(() => {
    if (editPropertyId) {
      fetchPropertyData();
    }
  }, [editPropertyId]);

  const fetchPropertyData = async () => {
    if (!editPropertyId) return;
    
    setIsFetching(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', editPropertyId)
      .single();

    if (!error && data) {
      setFormData({
        title: data.title || '',
        description: data.description || '',
        address: data.address || '',
        city: data.city || '',
        price: data.price?.toString() || '',
        price_period: data.price_period || 'month',
        property_type: data.property_type || 'apartment',
        bedrooms: data.bedrooms?.toString() || '1',
        bathrooms: data.bathrooms?.toString() || '1',
        area_sqm: data.area_sqm?.toString() || '',
        latitude: data.latitude || null,
        longitude: data.longitude || null
      });
      
      if (data.images && data.images.length > 0) {
        const existingMedia: MediaFile[] = data.images.map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
          type: 'image' as const,
          name: `image-${index + 1}`
        }));
        setMediaFiles(existingMedia);
      }
    }
    setIsFetching(false);
  };

  const propertyTypes = [
    { id: 'apartment', label: t.propertiesPage.apartment },
    { id: 'house', label: t.propertiesPage.house },
    { id: 'villa', label: t.propertiesPage.villa },
    { id: 'studio', label: t.propertiesPage.studio },
    { id: 'room', label: t.propertiesPage.room },
  ];

  const pricePeriods = [
    { id: 'day', label: t.addPropertyPage.daily },
    { id: 'week', label: t.addPropertyPage.weekly },
    { id: 'month', label: t.addPropertyPage.monthly },
    { id: 'year', label: t.addPropertyPage.yearly },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: t.error, description: t.loginRequired, variant: 'destructive' });
      return;
    }

    if (!formData.title || !formData.address || !formData.city || !formData.price) {
      toast({ title: t.error, description: t.requiredFields, variant: 'destructive' });
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
      images: mediaFiles.map(m => m.url),
      latitude: formData.latitude,
      longitude: formData.longitude
    };

    let error;
    
    if (editPropertyId) {
      const { error: updateError } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', editPropertyId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('properties')
        .insert(propertyData);
      error = insertError;
    }

    setIsLoading(false);

    if (error) {
      toast({
        title: t.error,
        description: editPropertyId ? t.addPropertyPage.updateFailed : t.addPropertyPage.addFailed,
        variant: 'destructive'
      });
    } else {
      toast({
        title: t.success,
        description: editPropertyId ? t.addPropertyPage.updateSuccess : t.addPropertyPage.addSuccess
      });
      onSuccess();
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 pb-4 flex items-center gap-4"
      >
        <Button variant="glass" size="icon" onClick={onBack}>
          <BackArrow className="w-5 h-5" />
        </Button>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          {editPropertyId ? t.addPropertyPage.editTitle : t.addPropertyPage.addTitle}
        </h1>
      </motion.header>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.mediaLabel}</label>
          <div className="glass-card p-4">
            <MultiImageUpload
              bucket="property-media"
              value={mediaFiles}
              onChange={setMediaFiles}
              maxFiles={10}
              compressImages={true}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.adTitle}</label>
          <div className="glass-card flex items-center gap-3 px-4 py-3">
            <Home className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t.addPropertyPage.adTitlePlaceholder}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              dir="auto"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.description}</label>
          <div className="glass-card px-4 py-3">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t.addPropertyPage.descriptionPlaceholder}
              rows={3}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground resize-none"
              dir="auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.address}</label>
            <div className="glass-card flex items-center gap-3 px-4 py-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder={t.addPropertyPage.addressPlaceholder}
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
                dir="auto"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.city}</label>
            <div className="glass-card px-4 py-3">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder={t.addPropertyPage.cityPlaceholder}
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
                dir="auto"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.propertyType}</label>
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

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.priceLabel}</label>
          <div className="flex gap-2">
            <div className="flex-1 glass-card flex items-center gap-3 px-4 py-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder={t.addPropertyPage.pricePlaceholder}
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.bedrooms}</label>
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
            <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.bathrooms}</label>
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
            <label className="text-sm text-muted-foreground mb-2 block">{t.addPropertyPage.areaSqm}</label>
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

        <LocationPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          onLocationChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
        />

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
            editPropertyId ? t.addPropertyPage.saveChanges : t.addPropertyPage.publish
          )}
        </Button>
      </form>
    </div>
  );
}
