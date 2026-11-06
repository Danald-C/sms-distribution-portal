exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.phone_otp
    ADD COLUMN type VARCHAR(50)
    NOT NULL DEFAULT 'phone_verification';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE public.phone_otp
    DROP COLUMN IF EXISTS type;
  `);
};
