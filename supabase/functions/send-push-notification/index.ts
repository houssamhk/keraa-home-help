import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Verify caller identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = claimsData.claims.sub as string;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { user_id, user_ids, title, body, icon, data, tag } = payload;

    // Input validation
    if (!title || typeof title !== 'string' || title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body || typeof body !== 'string' || body.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine target users
    const targetUsers = user_ids || (user_id ? [user_id] : []);

    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit: max 10 users per call for non-admins
    const { data: isAdminData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!isAdminData && targetUsers.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Too many target users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Non-admins can only send to users they have a relationship with
    if (!isAdminData) {
      const { data: hasRelationship } = await supabaseClient
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${callerId},participant_2.in.(${targetUsers.join(',')})),and(participant_2.eq.${callerId},participant_1.in.(${targetUsers.join(',')}))`)
        .limit(1);

      if (!hasRelationship || hasRelationship.length === 0) {
        // Also check contracts
        const { data: hasContract } = await supabaseClient
          .from('contracts')
          .select('id')
          .or(`and(landlord_id.eq.${callerId},tenant_id.in.(${targetUsers.join(',')})),and(tenant_id.eq.${callerId},landlord_id.in.(${targetUsers.join(',')}))`)
          .limit(1);

        if (!hasContract || hasContract.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No relationship with target users' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
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
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        const pushPayload = {
          title,
          body,
          icon: icon || '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || 'notification',
          data: data || {},
        };

        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

        if (!vapidPublicKey || !vapidPrivateKey) {
          console.warn('VAPID keys not configured');
          failCount++;
          continue;
        }

        // Use web-push compatible approach
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pushPayload),
        });

        if (response.ok) {
          successCount++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired/invalid - deactivate
          await supabaseClient
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
          failCount++;
        } else {
          failCount++;
        }
      } catch (pushError) {
        console.error('Push error:', pushError);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});