exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.email_tokens (
      id BIGSERIAL PRIMARY KEY,

      token_hash TEXT NOT NULL UNIQUE,

      user_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

      type VARCHAR(32) NOT NULL
        CHECK (type IN ('verification', 'password_reset')),

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  pgm.sql(`
    CREATE INDEX idx_email_tokens_user_id
    ON public.email_tokens (user_id);
  `);

  pgm.sql(`
    CREATE INDEX idx_email_tokens_expires_at
    ON public.email_tokens (expires_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS public.email_tokens;
  `);
};