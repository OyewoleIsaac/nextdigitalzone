-- Create encryption/decryption functions for NIN
-- These use pgcrypto's symmetric encryption with proper schema reference

CREATE OR REPLACE FUNCTION public.encrypt_nin(nin_value text, encryption_key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN extensions.pgp_sym_encrypt(nin_value, encryption_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_nin(encrypted_nin bytea, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN extensions.pgp_sym_decrypt(encrypted_nin, encryption_key);
END;
$$;

-- Only allow service role to call these functions
REVOKE ALL ON FUNCTION public.encrypt_nin(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_nin(bytea, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encrypt_nin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_nin(bytea, text) TO service_role;