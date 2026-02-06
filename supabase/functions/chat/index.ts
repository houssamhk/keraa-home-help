import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "يجب تسجيل الدخول لاستخدام المحادثة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !data?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = data.user.id;
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the last user message to analyze intent
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const lowerMsg = lastUserMessage.toLowerCase();

    // Detect if user is asking about properties
    const propertyKeywords = ['شقة', 'منزل', 'دار', 'عقار', 'كراء', 'إيجار', 'ايجار', 'فيلا', 'ستوديو', 'غرف', 'سكن',
      'منازل', 'شقق', 'عقارات', 'apartment', 'villa', 'house', 'rent', 'f1', 'f2', 'f3', 'f4', 'f5',
      'حوس', 'نحوس', 'أبحث', 'ابحث', 'بحث', 'أريد', 'اريد', 'عطيني', 'أعطني', 'وريني', 'مناول'];
    
    const handymanKeywords = ['سباك', 'كهربائي', 'نجار', 'منظف', 'حرفي', 'صيانة', 'تصليح', 'إصلاح', 'plombier', 'electricien',
      'حرفيين', 'حرفيون', 'خدمة', 'خدمات', 'مصلح'];

    const cityKeywords: Record<string, string> = {
      'وهران': 'وهران', 'oran': 'وهران',
      'الجزائر': 'الجزائر', 'alger': 'الجزائر', 'العاصمة': 'الجزائر',
      'قسنطينة': 'قسنطينة', 'constantine': 'قسنطينة',
      'عنابة': 'عنابة', 'annaba': 'عنابة',
      'سطيف': 'سطيف', 'setif': 'سطيف',
      'باتنة': 'باتنة', 'batna': 'باتنة',
      'بليدة': 'البليدة', 'blida': 'البليدة',
    };

    const isPropertyQuery = propertyKeywords.some(kw => lowerMsg.includes(kw));
    const isHandymanQuery = handymanKeywords.some(kw => lowerMsg.includes(kw));

    // Detect city from message
    let detectedCity: string | null = null;
    for (const [keyword, city] of Object.entries(cityKeywords)) {
      if (lowerMsg.includes(keyword)) {
        detectedCity = city;
        break;
      }
    }

    // Build context from database
    let dbContext = "";

    if (isPropertyQuery) {
      let query = supabase
        .from('properties')
        .select('id, title, city, price, bedrooms, bathrooms, property_type, amenities, address, price_period, area_sqm')
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (detectedCity) {
        query = query.eq('city', detectedCity);
      }

      // Detect bedroom count from F-type
      const fMatch = lowerMsg.match(/f(\d)/i);
      if (fMatch) {
        const bedrooms = parseInt(fMatch[1]);
        if (bedrooms === 1) {
          query = query.eq('property_type', 'studio');
        } else {
          query = query.eq('bedrooms', bedrooms);
        }
      }

      // Detect price
      const priceMatch = lowerMsg.match(/(\d{3,})(?:\s*(?:دج|da|دينار))?/);
      if (priceMatch) {
        query = query.lte('price', parseInt(priceMatch[1]));
      }

      const { data: properties, error: propError } = await query;

      if (!propError && properties && properties.length > 0) {
        dbContext += "\n\n--- بيانات العقارات المتوفرة حالياً في التطبيق ---\n";
        properties.forEach((p: any, i: number) => {
          const amenitiesStr = p.amenities?.length ? p.amenities.join('، ') : 'غير محدد';
          const period = p.price_period === 'month' ? '/شهر' : p.price_period === 'day' ? '/يوم' : '';
          dbContext += `\n${i + 1}. [PROPERTY_ID:${p.id}] "${p.title}" - ${p.city}
   السعر: ${p.price?.toLocaleString()} دج${period}
   النوع: ${p.property_type || 'شقة'} | الغرف: ${p.bedrooms || '-'} | الحمامات: ${p.bathrooms || '-'}
   المساحة: ${p.area_sqm || '-'} م² | العنوان: ${p.address}
   المرافق: ${amenitiesStr}`;
        });
        dbContext += "\n--- نهاية البيانات ---";
      } else {
        dbContext += "\n\n--- لا توجد عقارات متطابقة مع البحث حالياً في قاعدة البيانات ---";
      }
    }

    if (isHandymanQuery) {
      let handymanQuery = supabase
        .from('public_handymen')
        .select('id, user_id, specialty, rating, total_reviews, description, is_available, rate_range')
        .eq('is_available', true)
        .order('rating', { ascending: false })
        .limit(8);

      const { data: handymen, error: handyError } = await handymanQuery;

      if (!handyError && handymen && handymen.length > 0) {
        // Get names from public_profiles
        const userIds = handymen.map((h: any) => h.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('user_id, full_name, avg_rating')
          .in('user_id', userIds);

        const profileMap: Record<string, any> = {};
        profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

        dbContext += "\n\n--- الحرفيون المتوفرون حالياً ---\n";
        handymen.forEach((h: any, i: number) => {
          const profile = profileMap[h.user_id];
          const name = profile?.full_name || 'حرفي';
          const specialties = h.specialty?.join('، ') || 'عام';
          dbContext += `\n${i + 1}. [HANDYMAN_ID:${h.user_id}] ${name}
   التخصص: ${specialties}
   التقييم: ${h.rating || 0}/5 (${h.total_reviews || 0} تقييم)
   الأسعار: ${h.rate_range || 'غير محدد'}
   الوصف: ${h.description || '-'}`;
        });
        dbContext += "\n--- نهاية البيانات ---";
      } else {
        dbContext += "\n\n--- لا يوجد حرفيون متوفرون حالياً ---";
      }
    }

    // Get user's profile for personalization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, role_type, kyc_verified')
      .eq('user_id', userId)
      .maybeSingle();

    const userName = userProfile?.full_name || 'المستخدم';

    const systemPrompt = `أنت مساعد ذكي اسمك "سكني" متخصص في العقارات والخدمات المنزلية في الجزائر.
المستخدم الحالي: ${userName}

مهامك:
1. مساعدة المستخدمين في البحث عن منازل للإيجار من البيانات الحقيقية الموجودة في التطبيق
2. ربطهم بالحرفيين المتوفرين فعلياً في المنصة
3. الإجابة على أسئلة حول العقارات والأسعار بناءً على البيانات الحقيقية فقط
4. اقتراح عقارات أو حرفيين مع روابط مباشرة

قواعد مهمة جداً:
- أجب فقط من البيانات الحقيقية المقدمة لك. لا تختلق أي بيانات أو عقارات وهمية أبداً!
- إذا لم تجد بيانات مطابقة، أخبر المستخدم بصراحة وقترح عليه تعديل معايير البحث
- عند عرض عقار، أضف رابط في نهاية الوصف بالصيغة التالية: [عرض التفاصيل](/property/PROPERTY_ID)
- عند عرض حرفي، أضف رابط: [عرض الملف الشخصي](/handyman/HANDYMAN_ID)
- كن ودوداً ومختصراً. استخدم جمل قصيرة
- تحدث بالعربية أو الفرنسية حسب لغة المستخدم
- استخدم اللهجة الجزائرية عندما يتحدث المستخدم بها
- عند اقتراح عقارات، رتبها بشكل منظم مع الأسعار والتفاصيل
${dbContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للحساب" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
