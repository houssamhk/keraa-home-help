
-- Add signature data columns to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS landlord_signature_data text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tenant_signature_data text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.landlord_signature_data IS 'Base64 encoded signature image from landlord';
COMMENT ON COLUMN public.contracts.tenant_signature_data IS 'Base64 encoded signature image from tenant';
