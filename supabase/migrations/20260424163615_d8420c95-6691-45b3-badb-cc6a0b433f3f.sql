CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_action_type text,
  p_resource_type text DEFAULT NULL::text,
  p_resource_id uuid DEFAULT NULL::uuid,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN public.log_security_event_secure(
        p_user_id, p_action_type, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_additional_data
    );
END;
$function$;