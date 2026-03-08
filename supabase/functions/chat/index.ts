import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;

  const userId = data.claims.sub as string;
  return { userId, supabase };
}

async function buildUserContext(supabase: any, userId: string) {
  let context = "";

  // User profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role_type, kyc_verified, avg_rating, total_reviews, phone')
    .eq('user_id', userId)
    .maybeSingle();

  const userName = profile?.full_name || 'المستخدم';

  // User's contracts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, title, status, contract_type, start_date, end_date, monthly_amount, total_amount')
    .or(`landlord_id.eq.${userId},tenant_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (contracts?.length) {
    context += "\n\n--- عقود المستخدم ---";
    contracts.forEach((c: any, i: number) => {
      context += `\n${i + 1}. "${c.title}" - الحالة: ${c.status} | النوع: ${c.contract_type}`;
      if (c.monthly_amount) context += ` | الإيجار: ${c.monthly_amount} دج/شهر`;
      if (c.start_date) context += ` | من: ${c.start_date}`;
      if (c.end_date) context += ` إلى: ${c.end_date}`;
    });
  }

  // User's appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, status, notes, property_id')
    .or(`tenant_id.eq.${userId},owner_id.eq.${userId}`)
    .gte('appointment_date', new Date().toISOString().split('T')[0])
    .order('appointment_date', { ascending: true })
    .limit(5);

  if (appointments?.length) {
    context += "\n\n--- مواعيد المستخدم القادمة ---";
    appointments.forEach((a: any, i: number) => {
      context += `\n${i + 1}. التاريخ: ${a.appointment_date} الساعة: ${a.appointment_time} | الحالة: ${a.status}`;
      if (a.notes) context += ` | ملاحظات: ${a.notes}`;
    });
  }

  // User's bills
  const { data: bills } = await supabase
    .from('bills')
    .select('id, title, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(5);

  if (bills?.length) {
    context += "\n\n--- فواتير معلقة ---";
    bills.forEach((b: any, i: number) => {
      context += `\n${i + 1}. "${b.title}" - ${b.amount} دج | تاريخ الاستحقاق: ${b.due_date} | النوع: ${b.bill_type}`;
    });
  }

  // User's wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, pending_balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (wallet) {
    context += `\n\n--- المحفظة ---\nالرصيد: ${wallet.balance} دج | محجوز: ${wallet.pending_balance} دج`;
  }

  // User's favorites count
  const { count: favCount } = await supabase
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (favCount) {
    context += `\n\nالمفضلة: ${favCount} عقار`;
  }

  // User's properties (if owner)
  if (profile?.role_type === 'owner') {
    const { data: myProperties } = await supabase
      .from('properties')
      .select('id, title, city, price, is_available, bedrooms, property_type')
      .eq('owner_id', userId)
      .limit(10);

    if (myProperties?.length) {
      context += "\n\n--- عقارات المستخدم (كمالك) ---";
      myProperties.forEach((p: any, i: number) => {
        context += `\n${i + 1}. "${p.title}" - ${p.city} | ${p.price} دج | ${p.is_available ? 'متاح' : 'غير متاح'}`;
      });
    }
  }

  // Service requests for handyman
  if (profile?.role_type === 'handyman') {
    const { data: requests } = await supabase
      .from('service_requests')
      .select('id, service_type, status, preferred_date, address')
      .eq('handyman_id', userId)
      .in('status', ['pending', 'accepted'])
      .limit(5);

    if (requests?.length) {
      context += "\n\n--- طلبات الخدمة الحالية ---";
      requests.forEach((r: any, i: number) => {
        context += `\n${i + 1}. ${r.service_type} - ${r.status} | ${r.preferred_date} | ${r.address || ''}`;
      });
    }
  }

  return { userName, userContext: context, profile };
}

async function buildSearchContext(supabase: any, lowerMsg: string) {
  let dbContext = "";

  const propertyKeywords = ['شقة', 'منزل', 'دار', 'عقار', 'كراء', 'إيجار', 'ايجار', 'فيلا', 'ستوديو', 'غرف', 'سكن',
    'منازل', 'شقق', 'عقارات', 'apartment', 'villa', 'house', 'rent', 'f1', 'f2', 'f3', 'f4', 'f5',
    'حوس', 'نحوس', 'أبحث', 'ابحث', 'بحث', 'أريد', 'اريد', 'عطيني', 'أعطني', 'وريني', 'مناول',
    'propriété', 'appartement', 'maison', 'louer', 'location', 'cherche', 'property', 'find'];

  const handymanKeywords = ['سباك', 'كهربائي', 'نجار', 'منظف', 'حرفي', 'صيانة', 'تصليح', 'إصلاح', 'plombier', 'electricien',
    'حرفيين', 'حرفيون', 'خدمة', 'خدمات', 'مصلح', 'plumber', 'electrician', 'carpenter', 'cleaner', 'handyman',
    'artisan', 'réparation', 'maintenance'];

  const cityKeywords: Record<string, string> = {
    'وهران': 'وهران', 'oran': 'وهران',
    'الجزائر': 'الجزائر', 'alger': 'الجزائر', 'العاصمة': 'الجزائر', 'algiers': 'الجزائر',
    'قسنطينة': 'قسنطينة', 'constantine': 'قسنطينة',
    'عنابة': 'عنابة', 'annaba': 'عنابة',
    'سطيف': 'سطيف', 'setif': 'سطيف',
    'باتنة': 'باتنة', 'batna': 'باتنة',
    'بليدة': 'البليدة', 'blida': 'البليدة',
    'تلمسان': 'تلمسان', 'tlemcen': 'تلمسان',
    'بجاية': 'بجاية', 'bejaia': 'بجاية',
    'تيزي وزو': 'تيزي وزو', 'tizi ouzou': 'تيزي وزو',
  };

  const isPropertyQuery = propertyKeywords.some(kw => lowerMsg.includes(kw));
  const isHandymanQuery = handymanKeywords.some(kw => lowerMsg.includes(kw));

  let detectedCity: string | null = null;
  for (const [keyword, city] of Object.entries(cityKeywords)) {
    if (lowerMsg.includes(keyword)) { detectedCity = city; break; }
  }

  if (isPropertyQuery) {
    let query = supabase
      .from('properties')
      .select('id, title, city, price, bedrooms, bathrooms, property_type, amenities, address, price_period, area_sqm, latitude, longitude, description')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (detectedCity) query = query.eq('city', detectedCity);

    const fMatch = lowerMsg.match(/f(\d)/i);
    if (fMatch) {
      const bedrooms = parseInt(fMatch[1]);
      if (bedrooms === 1) query = query.eq('property_type', 'studio');
      else query = query.eq('bedrooms', bedrooms);
    }

    const priceMatch = lowerMsg.match(/(\d{3,})(?:\s*(?:دج|da|دينار))?/);
    if (priceMatch) query = query.lte('price', parseInt(priceMatch[1]));

    const { data: properties, error: propError } = await query;

    if (!propError && properties?.length) {
      dbContext += "\n\n--- بيانات العقارات المتوفرة حالياً ---\n";
      properties.forEach((p: any, i: number) => {
        const amenitiesStr = p.amenities?.length ? p.amenities.join('، ') : 'غير محدد';
        const period = p.price_period === 'month' ? '/شهر' : p.price_period === 'day' ? '/يوم' : '';
        const location = (p.latitude && p.longitude) ? `الإحداثيات: ${p.latitude},${p.longitude}` : '';
        dbContext += `\n${i + 1}. [PROPERTY_ID:${p.id}] "${p.title}" - ${p.city}
   السعر: ${p.price?.toLocaleString()} دج${period}
   النوع: ${p.property_type || 'شقة'} | الغرف: ${p.bedrooms || '-'} | الحمامات: ${p.bathrooms || '-'}
   المساحة: ${p.area_sqm || '-'} م² | العنوان: ${p.address}
   المرافق: ${amenitiesStr}
   ${p.description ? `الوصف: ${p.description.slice(0, 100)}` : ''}
   ${location}`;
      });
      dbContext += "\n--- نهاية البيانات ---";
    } else {
      dbContext += "\n\n--- لا توجد عقارات متطابقة مع البحث حالياً ---";
    }
  }

  if (isHandymanQuery) {
    const { data: handymen, error: handyError } = await supabase
      .from('public_handymen')
      .select('id, user_id, specialty, rating, total_reviews, description, is_available, rate_range')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .limit(8);

    if (!handyError && handymen?.length) {
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

  return dbContext;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "يجب تسجيل الدخول لاستخدام المحادثة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, supabase } = auth;
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const lowerMsg = lastUserMessage.toLowerCase();

    // Build context in parallel
    const [{ userName, userContext, profile }, searchContext] = await Promise.all([
      buildUserContext(supabase, user.id),
      buildSearchContext(supabase, lowerMsg),
    ]);

    const systemPrompt = `أنت مساعد ذكي اسمك "سكني" متخصص في العقارات والخدمات المنزلية في الجزائر.
المستخدم الحالي: ${userName} | نوع الحساب: ${profile?.role_type || 'tenant'} | التحقق: ${profile?.kyc_verified ? 'موثق' : 'غير موثق'}

مهامك:
1. مساعدة المستخدمين في البحث عن منازل للإيجار من البيانات الحقيقية
2. ربطهم بالحرفيين المتوفرين فعلياً في المنصة
3. الإجابة على أسئلة حول العقارات والأسعار بناءً على البيانات الحقيقية فقط
4. اقتراح عقارات أو حرفيين مع روابط مباشرة
5. مساعدة المستخدم في إدارة عقوده ومواعيده وفواتيره ومحفظته
6. تقديم نصائح عقارية وقانونية عامة عن الإيجار في الجزائر
7. المساعدة في فهم حقوق المستأجر والمالك

روابط التطبيق (استخدمها لتوجيه المستخدم):
- صفحة العقارات: [تصفح العقارات](/properties)
- المفضلة: [المفضلة](/favorites)
- الحرفيون: [الحرفيون](/handymen)
- الخريطة: [الخريطة](/map)
- العقود: [العقود](/contracts)
- المحفظة: [المحفظة](/wallet)
- الفواتير: [الفواتير](/bills)
- المواعيد: [المواعيد](/appointments)
- الملف الشخصي: [الملف الشخصي](/profile)
- الإعدادات: [الإعدادات](/settings)
- التحقق من الهوية: [التحقق](/kyc)
- إضافة عقار: [إضافة عقار](/add-property)

قواعد مهمة جداً:
- أجب فقط من البيانات الحقيقية المقدمة لك. لا تختلق أي بيانات أو عقارات وهمية أبداً!
- إذا لم تجد بيانات مطابقة، أخبر المستخدم بصراحة واقترح عليه تعديل معايير البحث
- عند عرض عقار، أضف رابط: [عرض التفاصيل](/property/PROPERTY_ID)
- عند عرض حرفي، أضف رابط: [عرض الملف الشخصي](/handyman/HANDYMAN_ID)
- كن ودوداً ومختصراً. استخدم جمل قصيرة
- تحدث بالعربية أو الفرنسية أو الإنجليزية حسب لغة المستخدم
- استخدم اللهجة الجزائرية عندما يتحدث المستخدم بها
- عند اقتراح عقارات، رتبها بشكل منظم مع الأسعار والتفاصيل
- إذا سأل المستخدم عن عقوده أو مواعيده أو فواتيره، أجب من البيانات المقدمة
- إذا سأل عن رصيده، أخبره بالمبلغ من بيانات المحفظة
${userContext}${searchContext}`;

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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للحساب" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
