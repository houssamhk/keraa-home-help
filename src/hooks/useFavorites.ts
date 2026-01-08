import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', user.id);

    if (!error && data) {
      setFavorites(new Set(data.map(f => f.property_id)));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Toggle favorite status
  const toggleFavorite = async (propertyId: string) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    const isFavorite = favorites.has(propertyId);

    // Optimistic update
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (isFavorite) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });

    if (isFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) {
        // Revert on error
        setFavorites(prev => new Set([...prev, propertyId]));
        toast.error('فشل في إزالة من المفضلة');
        return false;
      }
      toast.success('تمت الإزالة من المفضلة');
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, property_id: propertyId });

      if (error) {
        // Revert on error
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
        toast.error('فشل في الإضافة للمفضلة');
        return false;
      }
      toast.success('تمت الإضافة للمفضلة');
    }

    return true;
  };

  // Check if property is favorite
  const isFavorite = (propertyId: string) => favorites.has(propertyId);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites
  };
}
