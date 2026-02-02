import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: PushPayload = await req.json();
    const { user_id, user_ids, title, body, icon, data, tag } = payload;

    // Determine target users
    const targetUsers = user_ids || (user_id ? [user_id] : []);

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active subscriptions for target users
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUsers)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found for users:', targetUsers);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare push notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || 'sakani-notification',
      data: {
        ...data,
        timestamp: Date.now()
      }
    });

    // Note: In a real implementation, you would use web-push library
    // For now, we'll log the notification and store it in the notifications table
    let sentCount = 0;

    for (const sub of subscriptions) {
      try {
        // In production, you would send actual push notifications here
        // using the web-push library with VAPID keys
        console.log(`Would send push to ${sub.user_id}:`, {
          endpoint: sub.endpoint,
          payload: notificationPayload
        });

        // Also create an in-app notification as fallback
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            type: 'push',
            title,
            message: body,
            data: data || {}
          });

        sentCount++;
      } catch (sendError) {
        console.error(`Error sending to ${sub.user_id}:`, sendError);
        
        // Mark subscription as inactive if it failed
        await supabaseClient
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed', 
        sent: sentCount,
        total: subscriptions.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
