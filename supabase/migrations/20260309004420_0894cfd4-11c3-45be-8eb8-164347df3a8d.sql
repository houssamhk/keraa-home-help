-- تعيين دور المسؤول للحساب المسجل حديثاً
DO $$
DECLARE 
    target_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'arpkali1@gmail.com';
    
    -- إدراج دور المسؤول
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role assigned successfully to user: %', target_user_id;
    ELSE
        RAISE EXCEPTION 'User not found with email: arpkali1@gmail.com';
    END IF;
END $$;