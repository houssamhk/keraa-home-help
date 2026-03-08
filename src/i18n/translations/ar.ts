export const ar = {
  dir: 'rtl' as const,
  // Common
  appName: 'سكني',
  back: 'رجوع',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  edit: 'تعديل',
  loading: 'جاري التحميل...',
  error: 'خطأ',
  success: 'تم بنجاح',
  search: 'بحث',
  
  // Auth
  auth: {
    title: 'دارك',
    loginWelcome: 'مرحباً بعودتك',
    signupWelcome: 'أنشئ حسابك الآن',
    fullName: 'الاسم الكامل *',
    phone: 'رقم الهاتف * (مثال: 0551234567)',
    birthDate: 'تاريخ الميلاد *',
    email: 'البريد الإلكتروني *',
    password: 'كلمة المرور *',
    confirmPassword: 'تأكيد كلمة المرور *',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    noAccount: 'ليس لديك حساب؟ سجل الآن',
    hasAccount: 'لديك حساب بالفعل؟ سجل دخولك',
    loginError: 'خطأ في تسجيل الدخول',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    accountExists: 'الحساب موجود',
    accountExistsDesc: 'هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول',
    welcome: 'مرحباً!',
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    registered: 'تم التسجيل!',
    registeredDesc: 'تم إنشاء حسابك بنجاح',
    // Validation
    invalidEmail: 'بريد إلكتروني غير صالح',
    passwordMin: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    nameMin: 'الاسم يجب أن يكون حرفين على الأقل',
    nameTooLong: 'الاسم طويل جداً',
    invalidPhone: 'رقم الهاتف غير صالح (مثال: 0551234567)',
    ageRequired: 'يجب أن يكون عمرك 18 سنة على الأقل',
    passwordMismatch: 'كلمات المرور غير متطابقة',
  },

  // Splash
  splash: {
    tagline: 'منزلك. خدماتك. مبسّطة.',
  },

  // Home / AI Voice Hub
  home: {
    greeting: 'مرحباً 👋',
    aiAssistant: 'مساعد سكني الذكي',
    aiDescription: 'اسألني عن العقارات، الحرفيين، أو أي شيء تحتاجه',
    quickAccess: 'الوصول السريع',
    askPlaceholder: 'اسأل سكني... 🏠',
    completeKYC: 'أكمل التحقق من هويتك',
    ownerPanel: 'لوحة المالك',
    handymanPanel: 'لوحة الحرفي',
    admins: 'المشرفين',
    suggestions: [
      'ابحث عن شقة في الجزائر العاصمة',
      'أحتاج سباك بشكل عاجل',
      'أظهر لي منازل أقل من 50,000 دج/شهر',
      'ابحث عن F3 في وهران',
    ],
  },

  // Quick Actions
  quickActions: {
    properties: 'العقارات',
    favorites: 'المفضلة',
    handymen: 'الحرفيون',
    map: 'الخريطة',
    contracts: 'العقود',
    wallet: 'المحفظة',
    bills: 'الفواتير',
    appointments: 'المواعيد',
  },

  // Bottom Nav
  nav: {
    home: 'الرئيسية',
    properties: 'العقارات',
    myProperties: 'عقاراتي',
    myRequests: 'طلباتي',
    myContracts: 'عقودي',
    chat: 'المحادثات',
    profile: 'حسابي',
  },

  // Settings
  settings: {
    title: 'الإعدادات',
    user: 'المستخدم',
    tenant: 'مستأجر',
    provider: 'مقدم خدمة',
    owner: 'مالك',
    verified: 'تم التحقق',
    // KYC
    kycTitle: 'التحقق من الهوية',
    kycNotVerified: 'لم يتم التحقق من هويتك بعد',
    kycDescription: 'بعض الميزات غير متاحة بدون التحقق من الهوية مثل إنشاء العقود والمحادثات.',
    startVerification: 'بدء التحقق الآن',
    // Appearance
    appearance: 'المظهر',
    darkMode: 'الوضع الداكن',
    themeChanged: 'تم تغيير المظهر',
    darkTheme: 'الوضع الداكن',
    lightTheme: 'الوضع الفاتح',
    // Notifications
    notifications: 'الإشعارات',
    appNotifications: 'إشعارات التطبيق',
    browserPush: 'إشعارات المتصفح (Push)',
    pushEnabled: 'مفعّلة',
    pushDenied: 'مرفوضة',
    pushDisabled: 'غير مفعّلة',
    enable: 'تفعيل',
    enabling: 'جاري...',
    notificationsEnabled: 'تم تفعيل الإشعارات',
    notificationsDisabled: 'تم إيقاف الإشعارات',
    // Language
    language: 'اللغة',
    arabic: 'العربية',
    french: 'الفرنسية',
    english: 'الإنجليزية',
    languageChanged: 'تم تغيير اللغة',
    // Demo Data
    demoData: 'بيانات تجريبية',
    addDemoData: 'إضافة بيانات تجريبية',
    clearDemoData: 'حذف البيانات التجريبية',
    demoDataAdded: 'تم إضافة البيانات التجريبية',
    dataDeleted: 'تم حذف البيانات',
    testNotifications: 'اختبار الإشعارات',
    testNotificationSent: 'تم إرسال إشعار تجريبي',
    checkNotifications: 'تحقق من الإشعارات',
    // Sign out
    signOut: 'تسجيل الخروج',
    signedOut: 'تم تسجيل الخروج',
    seeYouSoon: 'نراك قريباً!',
  },

  // Offline
  offline: {
    disconnected: 'أنت غير متصل بالإنترنت - بعض الميزات قد لا تعمل',
    reconnected: 'تم استعادة الاتصال بالإنترنت',
  },
};
