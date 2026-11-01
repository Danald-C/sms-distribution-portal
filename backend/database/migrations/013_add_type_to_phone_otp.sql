-- Up Migration

ALTER TABLE public.phone_otp
ADD COLUMN IF NOT EXISTS type VARCHAR(50)
NOT NULL DEFAULT 'phone_verification';


-- Down Migration

ALTER TABLE public.phone_otp
DROP COLUMN IF EXISTS type;