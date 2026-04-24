import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT - require authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    const { property_id } = await req.json();
    
    if (!property_id) {
      return new Response(
        JSON.stringify({ error: 'property_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service client for cross-user notifications
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the new property details and verify ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow the property owner to trigger alerts
    if (property.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only trigger alerts for your own properties' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking alerts for property:', property_id, 'by owner:', userId);

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('search_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }

    const matchedAlerts: string[] = [];
    const notifications: any[] = [];

    for (const alert of alerts || []) {
      let matches = true;

      if (alert.city && property.city !== alert.city) matches = false;
      if (alert.property_type && property.property_type !== alert.property_type) matches = false;
      if (alert.min_bedrooms && property.bedrooms < alert.min_bedrooms) matches = false;
      if (alert.max_bedrooms && property.bedrooms > alert.max_bedrooms) matches = false;
      if (alert.min_price && property.price < alert.min_price) matches = false;
      if (alert.max_price && property.price > alert.max_price) matches = false;

      if (alert.amenities && alert.amenities.length > 0) {
        const propertyAmenities = property.amenities || [];
        const hasAllAmenities = alert.amenities.every((amenity: string) => 
          propertyAmenities.includes(amenity)
        );
        if (!hasAllAmenities) matches = false;
      }

      if (matches) {
        matchedAlerts.push(alert.id);
        
        notifications.push({
          user_id: alert.user_id,
          title: '🏠 عقار جديد يطابق بحثك!',
          message: `تم إضافة عقار جديد "${property.title}" في ${property.city} بسعر ${property.price} دج يطابق تنبيهك "${alert.name}"`,
          type: 'property_alert',
          data: {
            property_id: property.id,
            alert_id: alert.id,
            property_title: property.title,
            property_city: property.city,
            property_price: property.price,
            property_image: property.images?.[0] || null
          }
        });

        await supabase
          .from('search_alerts')
          .update({ last_notified_at: new Date().toISOString() })
          .eq('id', alert.id);
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error inserting notifications:', notifError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matched_alerts: matchedAlerts.length,
        notifications_sent: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-alerts function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
