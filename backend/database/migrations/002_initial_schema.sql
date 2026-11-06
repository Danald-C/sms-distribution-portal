--
-- PostgreSQL database dump
--

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_history; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.activity_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    description character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.activity_history OWNER TO dcadmin;

--
-- Name: contact_form; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.contact_form (
    user_id uuid NOT NULL,
    name text NOT NULL,
    subject character varying(100),
    message character varying(2000) NOT NULL,
    status boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company character varying(200),
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


-- ALTER TABLE public.contact_form OWNER TO dcadmin;

--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_type character varying(30) NOT NULL,
    amount bigint NOT NULL,
    balance_after bigint NOT NULL,
    reference character varying(255),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.credit_transactions OWNER TO dcadmin;

--
-- Name: phone_number_groups; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.phone_number_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    group_name character varying NOT NULL,
    group_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.phone_number_groups OWNER TO dcadmin;

--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.phone_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phone_number character varying(20) NOT NULL,
    country_code character varying(10),
    country_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text,
    email character varying
);


-- ALTER TABLE public.phone_numbers OWNER TO dcadmin;

--
-- Name: phone_otp; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.phone_otp (
    user_id uuid NOT NULL,
    otp character varying(10) NOT NULL,
    expires_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


-- ALTER TABLE public.phone_otp OWNER TO dcadmin;

--
-- Name: pngroups_and_pn_association; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.pngroups_and_pn_association (
    group_id uuid NOT NULL,
    phone_number_id uuid NOT NULL,
    user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


-- ALTER TABLE public.pngroups_and_pn_association OWNER TO dcadmin;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.schema_migrations (
    id bigint NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


-- ALTER TABLE public.schema_migrations OWNER TO dcadmin;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: dcadmin
--

CREATE SEQUENCE public.schema_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ALTER TABLE public.schema_migrations_id_seq OWNER TO dcadmin;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dcadmin
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: sms_jobs; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.sms_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    bullmq_job_id character varying(255),
    queue_name character varying(100) NOT NULL,
    status character varying(30) NOT NULL,
    attempts integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    failed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


-- ALTER TABLE public.sms_jobs OWNER TO dcadmin;

--
-- Name: sms_messages; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.sms_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sender_id character varying(50) NOT NULL,
    message text NOT NULL,
    recipient_count integer NOT NULL,
    sms_units bigint NOT NULL,
    status character varying(30) NOT NULL,
    provider character varying(50),
    provider_message_id character varying(255),
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_name character varying(150)
);


-- ALTER TABLE public.sms_messages OWNER TO dcadmin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: dcadmin
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    password text,
    provider text,
    provider_id text,
    meta jsonb DEFAULT '{}'::jsonb,
    role text DEFAULT 'user'::text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    google_id character varying(255) NOT NULL,
    profile_picture text,
    phone_number character varying(20),
    phone_verified boolean DEFAULT false,
    sender text,
    message character varying(500),
    unit_1 bigint DEFAULT 0 NOT NULL,
    unit_1_date timestamp with time zone DEFAULT now() NOT NULL,
    unit_2 bigint
);


-- ALTER TABLE public.users OWNER TO dcadmin;

--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: contact_form contact_form_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.contact_form
    ADD CONSTRAINT contact_form_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: phone_number_groups phone_number_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_number_groups
    ADD CONSTRAINT phone_number_groups_pkey PRIMARY KEY (id);


--
-- Name: phone_numbers phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: phone_otp phone_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_otp
    ADD CONSTRAINT phone_otp_pkey PRIMARY KEY (id);


--
-- Name: pngroups_and_pn_association pngroups_and_pn_association_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.pngroups_and_pn_association
    ADD CONSTRAINT pngroups_and_pn_association_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: sms_jobs sms_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.sms_jobs
    ADD CONSTRAINT sms_jobs_pkey PRIMARY KEY (id);


--
-- Name: sms_messages sms_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.sms_messages
    ADD CONSTRAINT sms_messages_pkey PRIMARY KEY (id);


--
-- Name: users u_gid; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT u_gid UNIQUE (google_id);


--
-- Name: phone_numbers uq_user_phone_numbers; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT uq_user_phone_numbers UNIQUE (user_id, phone_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_ah_user_id; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_ah_user_id ON public.activity_history USING btree (user_id);


--
-- Name: idx_cf_user_id; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_cf_user_id ON public.contact_form USING btree (user_id);


--
-- Name: idx_ctc; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_ctc ON public.credit_transactions USING btree (created_at);


--
-- Name: idx_papa_user_id; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_papa_user_id ON public.pngroups_and_pn_association USING btree (user_id);


--
-- Name: idx_pn_user_id; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_pn_user_id ON public.phone_numbers USING btree (user_id);


--
-- Name: idx_png_user_id; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_png_user_id ON public.phone_number_groups USING btree (user_id);


--
-- Name: idx_po_user_id; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_po_user_id ON public.phone_otp USING btree (user_id);


--
-- Name: idx_sms_m_s; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_sms_m_s ON public.sms_messages USING btree (status);


--
-- Name: idx_user_phone_numbers; Type: INDEX; Schema: public; Owner: dcadmin
--

CREATE INDEX idx_user_phone_numbers ON public.phone_numbers USING btree (user_id, phone_number);


--
-- Name: activity_history ah_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.activity_history
    ADD CONSTRAINT ah_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contact_form cf_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.contact_form
    ADD CONSTRAINT cf_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pngroups_and_pn_association papa_pn_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.pngroups_and_pn_association
    ADD CONSTRAINT papa_pn_fk FOREIGN KEY (phone_number_id) REFERENCES public.phone_numbers(id) ON DELETE CASCADE;


--
-- Name: pngroups_and_pn_association papa_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.pngroups_and_pn_association
    ADD CONSTRAINT papa_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: phone_numbers pn_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT pn_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: phone_number_groups png_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_number_groups
    ADD CONSTRAINT png_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: phone_otp po_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.phone_otp
    ADD CONSTRAINT po_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sms_jobs sms_jobs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dcadmin
--

ALTER TABLE ONLY public.sms_jobs
    ADD CONSTRAINT sms_jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.sms_messages(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

