import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { PropertyCardSkeleton } from '@/components/common/PropertyCardSkeleton';
import { PropertyCard } from '@/components/property/PropertyCard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLanguage } from '@/i18n/LanguageContext';

interface Property {
  id: string; title: string; address: string; city: string; price: number;
  price_period: string; property_type: string; bedrooms: number; bathrooms: number; area_sqm: number; images: string[];
  amenities?: string[]; description?: string; owner_id?: string;
}

interface FavoritesPageProps { onBack: () => void; onViewProperty: (property: Property) => void; }

export function FavoritesPage({ onBack, onViewProperty }: FavoritesPageProps) {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const { t, dir } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => { fetchFavoriteProperties(); }, [favorites]);

  const fetchFavoriteProperties = async () => {
    if (!user || favorites.size === 0) { setProperties([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase.from('properties').select('*').in('id', Array.from(favorites));
    if (!error && data) setProperties(data as Property[]);
    setIsLoading(false);
  };

  const handleRemove = async (propertyId: string) => { await toggleFavorite(propertyId); setRemoveConfirm(null); };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="glass" size="icon" onClick={onBack}><BackArrow className="w-5 h-5" /></Button>
          <h1 className="font-serif text-2xl font-bold text-foreground">{t.favoritesPage.title}</h1>
        </div>
      </motion.header>
      <div className="px-6 pb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (<><PropertyCardSkeleton /><PropertyCardSkeleton /></>) : properties.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center sm:col-span-2 lg:col-span-3">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">{t.favoritesPage.noFavorites}</p>
            <p className="text-sm text-muted-foreground">{t.favoritesPage.addFavorites}</p>
          </motion.div>
        ) : (
          properties.map((property, index) => (
            <div key={property.id} className="relative">
              <PropertyCard property={property} index={index} onClick={() => onViewProperty(property)} />
              <button
                onClick={(e) => { e.stopPropagation(); setRemoveConfirm(property.id); }}
                className="absolute top-3 left-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/20 z-10"
                aria-label={t.remove}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>
      <ConfirmDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)} title={t.favoritesPage.removeTitle} description={t.favoritesPage.removeConfirm} confirmLabel={t.remove} cancelLabel={t.cancel} onConfirm={() => removeConfirm && handleRemove(removeConfirm)} variant="destructive" />
    </div>
  );
}
