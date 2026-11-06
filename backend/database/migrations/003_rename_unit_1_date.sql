/* ALTER TABLE public.users
RENAME COLUMN unit_1_date TO unit_1_created_at; */
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'unit_1_date'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'unit_1_created_at'
    )
    THEN
        ALTER TABLE public.users
        RENAME COLUMN unit_1_date TO unit_1_created_at;
    END IF;
END
$$;