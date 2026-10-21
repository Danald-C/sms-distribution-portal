exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.refresh_tokens (
      id BIGSERIAL PRIMARY KEY,
      token_id UUID NOT NULL UNIQUE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      user_agent TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      revoked_at TIMESTAMPTZ,
      replaced_by UUID
    )
  `);

  pgm.sql(`
    CREATE INDEX idx_refresh_tokens_user_id
    ON public.refresh_tokens (user_id)
  `);

  pgm.sql(`
    CREATE INDEX idx_refresh_tokens_expires_at
    ON public.refresh_tokens (expires_at)
  `);

  pgm.sql(`
    CREATE INDEX idx_refresh_tokens_revoked
    ON public.refresh_tokens (revoked)
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS public.refresh_tokens');
};
