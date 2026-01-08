import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePropertyViews() {
  const { user } = useAuth();

  // Log a property view
  const logView = useCallback(async (propertyId: string) => {
    try {
      await supabase
        .from('property_views')
        .insert({
          property_id: propertyId,
          viewer_id: user?.id || null
        });
    } catch (error) {
      // Silently fail - view logging shouldn't interrupt user experience
      console.error('Failed to log view:', error);
    }
  }, [user]);

  // Get view statistics for a property
  const getViewStats = async (propertyId: string) => {
    const { data, error } = await supabase
      .from('property_views')
      .select('viewed_at')
      .eq('property_id', propertyId);

    if (error || !data) return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: data.length,
      today: data.filter(v => new Date(v.viewed_at) >= today).length,
      thisWeek: data.filter(v => new Date(v.viewed_at) >= weekAgo).length,
      thisMonth: data.filter(v => new Date(v.viewed_at) >= monthAgo).length
    };
  };

  // Get owner's total statistics
  const getOwnerStats = async (ownerId: string) => {
    // Get all properties for this owner
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', ownerId);

    if (propError || !properties || properties.length === 0) {
      return { totalViews: 0, todayViews: 0, uniqueViewers: 0 };
    }

    const propertyIds = properties.map(p => p.id);

    // Get views for all properties
    const { data: views, error: viewsError } = await supabase
      .from('property_views')
      .select('viewer_id, viewed_at')
      .in('property_id', propertyIds);

    if (viewsError || !views) {
      return { totalViews: 0, todayViews: 0, uniqueViewers: 0 };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const uniqueViewerIds = new Set(views.filter(v => v.viewer_id).map(v => v.viewer_id));

    return {
      totalViews: views.length,
      todayViews: views.filter(v => new Date(v.viewed_at) >= today).length,
      uniqueViewers: uniqueViewerIds.size
    };
  };

  return {
    logView,
    getViewStats,
    getOwnerStats
  };
}
