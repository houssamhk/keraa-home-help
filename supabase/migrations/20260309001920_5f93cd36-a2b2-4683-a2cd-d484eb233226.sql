-- إزالة السياسات الخطيرة فقط
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can create transactions for their wallet" ON public.wallet_transactions;

-- إضافة سياسات آمنة للخدمة
CREATE POLICY "Service role can manage wallets" 
ON public.wallets FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can manage transactions" 
ON public.wallet_transactions FOR ALL 
TO service_role
USING (true);