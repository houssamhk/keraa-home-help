import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Algerian cities mapping (Darja/French to standard)
const cityMappings: Record<string, string> = {
  'وهران': 'وهران',
  'oran': 'وهران',
  'الجزائر': 'الجزائر',
  'dzayer': 'الجزائر',
  'alger': 'الجزائر',
  'العاصمة': 'الجزائر',
  'قسنطينة': 'قسنطينة',
  'constantine': 'قسنطينة',
  'عنابة': 'عنابة',
  'annaba': 'عنابة',
  'بليدة': 'البليدة',
  'blida': 'البليدة',
  'سطيف': 'سطيف',
  'setif': 'سطيف',
  'باتنة': 'باتنة',
  'batna': 'باتنة',
  'تيزي وزو': 'تيزي وزو',
  'tizi': 'تيزي وزو',
  'بجاية': 'بجاية',
  'bejaia': 'بجاية',
};

// Property type mappings
const typeMappings: Record<string, string> = {
  'f1': 'studio',
  'f2': 'apartment',
  'f3': 'apartment',
  'f4': 'apartment',
  'f5': 'apartment',
  'studio': 'studio',
  'ستوديو': 'studio',
  'شقة': 'apartment',
  'appartement': 'apartment',
  'فيلا': 'villa',
  'villa': 'villa',
  'دار': 'house',
  'maison': 'house',
  'بيت': 'house',
};

// Amenities mappings (Darja to standard)
const amenityMappings: Record<string, string> = {
  'شوفاج': 'heating',
  'chauffage': 'heating',
  'تدفئة': 'heating',
  'كليم': 'ac',
  'climatisation': 'ac',
  'تكييف': 'ac',
  'مسبح': 'pool',
  'piscine': 'pool',
  'كراج': 'garage',
  'garage': 'garage',
  'حديقة': 'garden',
  'jardin': 'garden',
  'بلكون': 'balcony',
  'balcon': 'balcony',
  'شرفة': 'balcony',
  'اسانسور': 'elevator',
  'ascenseur': 'elevator',
  'مصعد': 'elevator',
  'انترنت': 'wifi',
  'wifi': 'wifi',
  'ويفي': 'wifi',
  'مفروشة': 'furnished',
  'meublé': 'furnished',
  'فارغة': 'unfurnished',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "يجب تسجيل الدخول لاستخدام البحث الذكي" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !data?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query } = await req.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input length limit to prevent abuse
    if (query.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Query too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use AI to understand the query and extract filters
    const systemPrompt = `أنت مساعد ذكي متخصص في فهم طلبات البحث عن العقارات باللهجة الجزائرية والفرنسية والعربية الفصحى.

مهمتك: تحليل طلب المستخدم واستخراج الفلاتر التالية بصيغة JSON:

{
  "city": "اسم المدينة بالعربية (وهران، الجزائر، قسنطينة...)",
  "property_type": "apartment | villa | house | studio",
  "bedrooms": رقم (1-10) أو null,
  "min_price": رقم أو null,
  "max_price": رقم أو null,
  "amenities": ["heating", "ac", "pool", "garage", "garden", "balcony", "elevator", "wifi", "furnished"],
  "search_text": "نص البحث النظيف"
}

أمثلة:
- "حوس على F3 في وهران فيها شوفاج" → {"city": "وهران", "property_type": "apartment", "bedrooms": 3, "amenities": ["heating"]}
- "نحوس على دار في الجزائر أقل من 50000 دج" → {"city": "الجزائر", "property_type": "house", "max_price": 50000}
- "appartement à Oran avec climatisation" → {"city": "وهران", "property_type": "apartment", "amenities": ["ac"]}
- "شقة مفروشة في قسنطينة" → {"city": "قسنطينة", "property_type": "apartment", "amenities": ["furnished"]}

ملاحظات:
- F1 = studio, F2 = 2 غرف, F3 = 3 غرف, إلخ
- "حوس" و "نحوس" تعني "ابحث"
- استخرج الأرقام من النص للأسعار والغرف
- أجب بـ JSON فقط بدون أي نص إضافي`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'يرجى إضافة رصيد لحساب Lovable AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '{}';
    
    console.log('AI response:', content);

    // Parse the JSON response
    let filters;
    try {
      // Clean the response (remove markdown if present)
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      filters = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: return basic search
      filters = { search_text: query };
    }

    // Normalize filters using our mappings
    if (filters.city) {
      const normalizedCity = cityMappings[filters.city.toLowerCase()] || filters.city;
      filters.city = normalizedCity;
    }

    if (filters.property_type) {
      const normalizedType = typeMappings[filters.property_type.toLowerCase()] || filters.property_type;
      filters.property_type = normalizedType;
    }

    console.log('Extracted filters:', filters);

    return new Response(
      JSON.stringify({ 
        success: true, 
        filters,
        original_query: query 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-search function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
