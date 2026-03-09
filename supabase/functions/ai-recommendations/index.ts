import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecommendationRequest {
  type: 'properties' | 'handymen' | 'similar';
  context?: {
    city?: string;
    propertyType?: string;
    maxPrice?: number;
    minBedrooms?: number;
    propertyId?: string;
    specialty?: string;
  };
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, context, limit = 6 }: RecommendationRequest = await req.json();

    let recommendations: any[] = [];

    switch (type) {
      case 'properties': {
        // Get user's viewing history and preferences
        const { data: favorites } = await supabase
          .from('favorites')
          .select('property_id')
          .eq('user_id', user.id);

        const favoriteIds = favorites?.map(f => f.property_id) || [];

        // Get properties user has viewed
        const { data: views } = await supabase
          .from('property_views')
          .select('property_id')
          .eq('viewer_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(20);

        const viewedIds = views?.map(v => v.property_id) || [];

        // Build query based on user preferences
        let query = supabase
          .from('properties')
          .select('id, title, city, price, bedrooms, bathrooms, property_type, images, address, area_sqm')
          .eq('is_available', true)
          .order('created_at', { ascending: false });

        if (context?.city) {
          query = query.eq('city', context.city);
        }
        if (context?.propertyType) {
          query = query.eq('property_type', context.propertyType);
        }
        if (context?.maxPrice) {
          query = query.lte('price', context.maxPrice);
        }
        if (context?.minBedrooms) {
          query = query.gte('bedrooms', context.minBedrooms);
        }

        const { data: properties, error } = await query.limit(limit * 2);

        if (error) throw error;

        // Score and rank properties
        recommendations = (properties || [])
          .map(p => {
            let score = 0;
            
            // Boost if similar to favorites
            if (favoriteIds.some(fId => {
              // Check if same city/type as favorites
              return true; // Simplified scoring
            })) {
              score += 10;
            }

            // Reduce score for already viewed
            if (viewedIds.includes(p.id)) {
              score -= 5;
            }

            // Boost featured properties
            // (would need to join with featured_listings)
            
            return { ...p, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(({ score, ...p }) => p);

        break;
      }

      case 'handymen': {
        let query = supabase
          .from('public_handymen')
          .select('id, user_id, specialty, rating, total_reviews, description, rate_range')
          .eq('is_available', true)
          .order('rating', { ascending: false });

        if (context?.specialty) {
          query = query.contains('specialty', [context.specialty]);
        }

        const { data: handymen, error } = await query.limit(limit);

        if (error) throw error;

        // Get profile info for handymen
        if (handymen?.length) {
          const userIds = handymen.map(h => h.user_id);
          const { data: profiles } = await supabase
            .from('public_profiles')
            .select('user_id, full_name, avatar_url, avg_rating')
            .in('user_id', userIds);

          const profileMap: Record<string, any> = {};
          profiles?.forEach(p => { profileMap[p.user_id] = p; });

          recommendations = handymen.map(h => ({
            ...h,
            profile: profileMap[h.user_id] || null
          }));
        }

        break;
      }

      case 'similar': {
        if (!context?.propertyId) {
          return new Response(
            JSON.stringify({ error: "Property ID required for similar recommendations" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get the source property
        const { data: sourceProperty, error: sourceError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', context.propertyId)
          .single();

        if (sourceError || !sourceProperty) {
          return new Response(
            JSON.stringify({ error: "Property not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find similar properties
        const priceRange = sourceProperty.price * 0.3;
        const { data: similar, error } = await supabase
          .from('properties')
          .select('id, title, city, price, bedrooms, bathrooms, property_type, images, address')
          .eq('is_available', true)
          .neq('id', context.propertyId)
          .eq('city', sourceProperty.city)
          .gte('price', sourceProperty.price - priceRange)
          .lte('price', sourceProperty.price + priceRange)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        // Score by similarity
        recommendations = (similar || [])
          .map(p => {
            let similarityScore = 0;
            
            // Same property type
            if (p.property_type === sourceProperty.property_type) {
              similarityScore += 30;
            }
            
            // Similar bedrooms
            if (p.bedrooms === sourceProperty.bedrooms) {
              similarityScore += 20;
            } else if (Math.abs((p.bedrooms || 0) - (sourceProperty.bedrooms || 0)) <= 1) {
              similarityScore += 10;
            }
            
            // Similar price (closer = higher score)
            const priceDiff = Math.abs(p.price - sourceProperty.price);
            similarityScore += Math.max(0, 25 - (priceDiff / sourceProperty.price) * 100);
            
            return { ...p, similarityScore };
          })
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .map(({ similarityScore, ...p }) => p);

        break;
      }
    }

    return new Response(
      JSON.stringify({ 
        recommendations,
        type,
        count: recommendations.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
