import { supabase } from '@/integrations/supabase/client';

export interface DemoDataResult {
  success: boolean;
  message: string;
  createdItems?: {
    properties: number;
    handymen: number;
    appointments: number;
    contracts: number;
  };
}

// بيانات العقارات التجريبية
const demoProperties = [
  {
    title: 'شقة فاخرة بإطلالة بحرية',
    description: 'شقة عصرية مفروشة بالكامل في قلب الجزائر العاصمة، تتميز بإطلالة ساحرة على البحر الأبيض المتوسط. تضم صالة واسعة ومطبخ مجهز بالكامل.',
    address: 'شارع ديدوش مراد، الجزائر العاصمة',
    city: 'الجزائر',
    price: 85000,
    price_period: 'month',
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 120,
    property_type: 'apartment',
    amenities: ['wifi', 'parking', 'elevator', 'ac', 'balcony', 'security'],
    latitude: 36.7538,
    longitude: 3.0588,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800']
  },
  {
    title: 'فيلا مع حديقة في حيدرة',
    description: 'فيلا فخمة في حي حيدرة الراقي، تضم حديقة خاصة ومسبح. مثالية للعائلات الكبيرة.',
    address: 'حي حيدرة، الجزائر العاصمة',
    city: 'الجزائر',
    price: 250000,
    price_period: 'month',
    bedrooms: 5,
    bathrooms: 3,
    area_sqm: 350,
    property_type: 'villa',
    amenities: ['wifi', 'parking', 'garden', 'pool', 'ac', 'security', 'garage'],
    latitude: 36.7650,
    longitude: 3.0320,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800']
  },
  {
    title: 'استوديو عصري للطلاب',
    description: 'استوديو صغير ومريح قرب جامعة الجزائر، مناسب للطلاب والعزاب.',
    address: 'بن عكنون، الجزائر العاصمة',
    city: 'الجزائر',
    price: 35000,
    price_period: 'month',
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: 40,
    property_type: 'studio',
    amenities: ['wifi', 'elevator', 'ac'],
    latitude: 36.7680,
    longitude: 3.0050,
    images: ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800']
  },
  {
    title: 'شقة عائلية في وهران',
    description: 'شقة واسعة ومشرقة في وسط وهران، قريبة من جميع المرافق والخدمات.',
    address: 'حي الصباح، وهران',
    city: 'وهران',
    price: 55000,
    price_period: 'month',
    bedrooms: 3,
    bathrooms: 1,
    area_sqm: 100,
    property_type: 'apartment',
    amenities: ['wifi', 'parking', 'elevator', 'balcony'],
    latitude: 35.6969,
    longitude: -0.6331,
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800']
  },
  {
    title: 'بيت تقليدي في قسنطينة',
    description: 'بيت عربي تقليدي بهندسة معمارية أصيلة في المدينة القديمة، تم تجديده حديثاً مع الحفاظ على طابعه الأصلي.',
    address: 'المدينة القديمة، قسنطينة',
    city: 'قسنطينة',
    price: 45000,
    price_period: 'month',
    bedrooms: 4,
    bathrooms: 2,
    area_sqm: 180,
    property_type: 'house',
    amenities: ['parking', 'garden', 'terrace'],
    latitude: 36.3650,
    longitude: 6.6147,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800']
  },
  {
    title: 'شقة فندقية في عنابة',
    description: 'شقة بخدمات فندقية على شاطئ عنابة، مفروشة بذوق رفيع مع إطلالة على البحر.',
    address: 'الكورنيش، عنابة',
    city: 'عنابة',
    price: 70000,
    price_period: 'month',
    bedrooms: 2,
    bathrooms: 1,
    area_sqm: 80,
    property_type: 'apartment',
    amenities: ['wifi', 'parking', 'elevator', 'ac', 'balcony', 'sea_view'],
    latitude: 36.9000,
    longitude: 7.7667,
    images: ['https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800']
  }
];

// بيانات الحرفيين التجريبية
const demoHandymen = [
  {
    specialty: ['plumbing', 'heating'],
    description: 'سباك معتمد بخبرة 15 عاماً في جميع أعمال السباكة والتدفئة المركزية. خدمة سريعة وأسعار مناسبة.',
    hourly_rate: 2500,
    service_area_km: 30,
    latitude: 36.7538,
    longitude: 3.0588,
    rating: 4.8,
    total_reviews: 127
  },
  {
    specialty: ['electrical'],
    description: 'كهربائي محترف متخصص في التمديدات الكهربائية والصيانة. حاصل على شهادات السلامة.',
    hourly_rate: 3000,
    service_area_km: 25,
    latitude: 36.7650,
    longitude: 3.0320,
    rating: 4.9,
    total_reviews: 89
  },
  {
    specialty: ['painting', 'renovation'],
    description: 'دهان وديكور منزلي. نقدم أفضل التشطيبات بجودة عالية وألوان عصرية.',
    hourly_rate: 2000,
    service_area_km: 40,
    latitude: 36.7680,
    longitude: 3.0050,
    rating: 4.6,
    total_reviews: 203
  },
  {
    specialty: ['ac', 'appliances'],
    description: 'تقني تكييف وأجهزة كهربائية. صيانة وإصلاح جميع أنواع المكيفات والثلاجات.',
    hourly_rate: 3500,
    service_area_km: 35,
    latitude: 35.6969,
    longitude: -0.6331,
    rating: 4.7,
    total_reviews: 156
  },
  {
    specialty: ['carpentry', 'furniture'],
    description: 'نجار أثاث منزلي ومكتبي. تصميم وتنفيذ جميع أنواع الأثاث الخشبي.',
    hourly_rate: 2800,
    service_area_km: 20,
    latitude: 36.3650,
    longitude: 6.6147,
    rating: 4.5,
    total_reviews: 78
  }
];

// أسماء تجريبية للملفات الشخصية
const demoProfiles = [
  { full_name: 'محمد بن عمر', phone: '+213551234567' },
  { full_name: 'أحمد بوزيد', phone: '+213552345678' },
  { full_name: 'كريم حداد', phone: '+213553456789' },
  { full_name: 'يوسف مرابط', phone: '+213554567890' },
  { full_name: 'عبد الرحمن سعيدي', phone: '+213555678901' }
];

export async function seedDemoData(userId: string): Promise<DemoDataResult> {
  try {
    let propertiesCreated = 0;
    let handymenCreated = 0;
    let appointmentsCreated = 0;
    let contractsCreated = 0;

    // إنشاء العقارات
    for (const property of demoProperties) {
      const { error } = await supabase
        .from('properties')
        .insert({
          ...property,
          owner_id: userId,
          is_available: true
        });
      
      if (!error) propertiesCreated++;
    }

    // إنشاء ملفات شخصية وهمية للحرفيين
    for (let i = 0; i < demoHandymen.length; i++) {
      const handyman = demoHandymen[i];
      const profile = demoProfiles[i];
      
      // إنشاء الحرفي مرتبط بالمستخدم الحالي (للعرض فقط)
      const { error } = await supabase
        .from('handymen')
        .insert({
          ...handyman,
          user_id: userId,
          is_available: true
        });
      
      if (!error) handymenCreated++;
    }

    // إنشاء مواعيد تجريبية
    const today = new Date();
    const appointmentDates = [
      new Date(today.getTime() + 24 * 60 * 60 * 1000), // غداً
      new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // بعد 3 أيام
      new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // بعد أسبوع
    ];

    for (const date of appointmentDates) {
      const { error } = await supabase
        .from('appointments')
        .insert({
          owner_id: userId,
          tenant_id: userId,
          appointment_date: date.toISOString().split('T')[0],
          appointment_time: '10:00',
          status: 'pending',
          notes: 'موعد معاينة تجريبي'
        });
      
      if (!error) appointmentsCreated++;
    }

    // إنشاء عقد تجريبي
    const { error: contractError } = await supabase
      .from('contracts')
      .insert({
        title: 'عقد إيجار شقة - بيانات تجريبية',
        description: 'عقد إيجار تجريبي لشقة فاخرة',
        contract_type: 'rental',
        start_date: today.toISOString().split('T')[0],
        end_date: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monthly_amount: 85000,
        landlord_id: userId,
        tenant_id: userId,
        status: 'active',
        landlord_signed: true,
        tenant_signed: true,
        terms: 'شروط العقد التجريبية: دفع الإيجار في بداية كل شهر. الحفاظ على نظافة العقار. عدم إجراء تعديلات دون إذن المالك.'
      });
    
    if (!contractError) contractsCreated++;

    return {
      success: true,
      message: 'تم إضافة البيانات التجريبية بنجاح!',
      createdItems: {
        properties: propertiesCreated,
        handymen: handymenCreated,
        appointments: appointmentsCreated,
        contracts: contractsCreated
      }
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إضافة البيانات التجريبية'
    };
  }
}

export async function clearDemoData(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // حذف العقارات
    await supabase.from('properties').delete().eq('owner_id', userId);
    
    // حذف الحرفيين
    await supabase.from('handymen').delete().eq('user_id', userId);
    
    // حذف المواعيد
    await supabase.from('appointments').delete().eq('owner_id', userId);
    
    // حذف العقود
    await supabase.from('contracts').delete().eq('landlord_id', userId);

    return {
      success: true,
      message: 'تم حذف البيانات التجريبية بنجاح'
    };
  } catch (error) {
    console.error('Error clearing demo data:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف البيانات'
    };
  }
}
