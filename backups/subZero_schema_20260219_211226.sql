--
-- PostgreSQL database dump
--

\restrict ZdMe5LxzcXAZhBZEQGXa2HRvFZ1qy7iRzbpQj5rUdnLV3bRW3HYDX0uB2c8mbv1

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: chat_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_status AS ENUM (
    'pending',
    'active',
    'on_hold',
    'closed'
);


ALTER TYPE public.chat_status OWNER TO postgres;

--
-- Name: message_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_status_enum AS ENUM (
    'sent',
    'delivered',
    'read'
);


ALTER TYPE public.message_status_enum OWNER TO postgres;

--
-- Name: message_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_type AS ENUM (
    'Text',
    'Image',
    'File',
    'System',
    'Voice',
    'Video'
);


ALTER TYPE public.message_type OWNER TO postgres;

--
-- Name: message_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_type_enum AS ENUM (
    'text',
    'image',
    'file',
    'system',
    'voice',
    'video'
);


ALTER TYPE public.message_type_enum OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'client',
    'agent'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role_enum AS ENUM (
    'customer',
    'agent',
    'admin'
);


ALTER TYPE public.user_role_enum OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_dm_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent_dm_messages (
    id integer NOT NULL,
    agent_a integer NOT NULL,
    agent_b integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agent_dm_messages OWNER TO postgres;

--
-- Name: agent_dm_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agent_dm_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_dm_messages_id_seq OWNER TO postgres;

--
-- Name: agent_dm_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agent_dm_messages_id_seq OWNED BY public.agent_dm_messages.id;


--
-- Name: chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chats (
    id integer NOT NULL,
    client_id integer NOT NULL,
    agent_id integer,
    status public.chat_status DEFAULT 'pending'::public.chat_status,
    subject character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_at timestamp without time zone,
    closed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    first_response_at timestamp without time zone,
    rating integer,
    feedback text,
    channel character varying(20) DEFAULT 'web'::character varying NOT NULL
);


ALTER TABLE public.chats OWNER TO postgres;

--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chats_id_seq OWNER TO postgres;

--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    left_at timestamp with time zone,
    muted_until timestamp with time zone,
    is_active boolean DEFAULT true,
    notification_enabled boolean DEFAULT true,
    last_read_at timestamp with time zone
);


ALTER TABLE public.conversation_participants OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255),
    is_group boolean DEFAULT false,
    created_by uuid NOT NULL,
    avatar_url character varying(500),
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_at timestamp with time zone,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: global_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.global_messages (
    id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.global_messages OWNER TO postgres;

--
-- Name: global_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.global_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.global_messages_id_seq OWNER TO postgres;

--
-- Name: global_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.global_messages_id_seq OWNED BY public.global_messages.id;


--
-- Name: group_chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_chats (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_chats OWNER TO postgres;

--
-- Name: group_chats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.group_chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_chats_id_seq OWNER TO postgres;

--
-- Name: group_chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.group_chats_id_seq OWNED BY public.group_chats.id;


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_members (
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    added_by integer,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_members OWNER TO postgres;

--
-- Name: group_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_messages (
    id integer NOT NULL,
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_messages OWNER TO postgres;

--
-- Name: group_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.group_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.group_messages_id_seq OWNER TO postgres;

--
-- Name: group_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.group_messages_id_seq OWNED BY public.group_messages.id;


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    file_name character varying(500) NOT NULL,
    original_name character varying(500),
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    storage_path character varying(1000) NOT NULL,
    storage_provider character varying(50) DEFAULT 'local'::character varying,
    thumbnail_path character varying(1000),
    width integer,
    height integer,
    duration integer,
    metadata jsonb,
    upload_status character varying(20) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_attachments_file_size_check CHECK (((file_size > 0) AND (file_size <= 104857600)))
);


ALTER TABLE public.message_attachments OWNER TO postgres;

--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- Name: message_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    replied_to_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_replies_check CHECK ((message_id <> replied_to_id))
);


ALTER TABLE public.message_replies OWNER TO postgres;

--
-- Name: message_reply_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reply_stats (
    message_id uuid NOT NULL,
    reply_count integer DEFAULT 0,
    last_replied_at timestamp with time zone,
    last_replier_id uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.message_reply_stats OWNER TO postgres;

--
-- Name: message_statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public.message_status_enum NOT NULL,
    status_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.message_statuses OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    chat_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reply_to_id integer,
    status character varying(20) DEFAULT 'sent'::character varying,
    channel character varying(20) DEFAULT 'web'::character varying NOT NULL,
    external_message_id text
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200),
    message text,
    metadata jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: quick_phrases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quick_phrases (
    id integer NOT NULL,
    label character varying(100) NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.quick_phrases OWNER TO postgres;

--
-- Name: quick_phrases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quick_phrases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quick_phrases_id_seq OWNER TO postgres;

--
-- Name: quick_phrases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quick_phrases_id_seq OWNED BY public.quick_phrases.id;


--
-- Name: storage_chat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_chat (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    url text NOT NULL,
    public_id text NOT NULL,
    resource_type character varying(20) NOT NULL,
    is_attachment boolean DEFAULT false NOT NULL,
    mime_type character varying(100),
    bytes integer,
    filename text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    entity_type character varying(20) DEFAULT 'chat'::character varying NOT NULL
);


ALTER TABLE public.storage_chat OWNER TO postgres;

--
-- Name: storage_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_chat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_chat_id_seq OWNER TO postgres;

--
-- Name: storage_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_chat_id_seq OWNED BY public.storage_chat.id;


--
-- Name: user_dm_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_dm_reads (
    user_id integer NOT NULL,
    agent_a integer NOT NULL,
    agent_b integer NOT NULL,
    last_read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_dm_reads OWNER TO postgres;

--
-- Name: user_global_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_global_reads (
    user_id integer NOT NULL,
    last_read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_global_reads OWNER TO postgres;

--
-- Name: user_group_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_group_reads (
    user_id integer NOT NULL,
    group_id integer NOT NULL,
    last_read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_group_reads OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100),
    role public.user_role NOT NULL,
    is_online boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    whatsapp_id text,
    password_hash text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: agent_dm_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_dm_messages ALTER COLUMN id SET DEFAULT nextval('public.agent_dm_messages_id_seq'::regclass);


--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);


--
-- Name: global_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_messages ALTER COLUMN id SET DEFAULT nextval('public.global_messages_id_seq'::regclass);


--
-- Name: group_chats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_chats ALTER COLUMN id SET DEFAULT nextval('public.group_chats_id_seq'::regclass);


--
-- Name: group_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages ALTER COLUMN id SET DEFAULT nextval('public.group_messages_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: quick_phrases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_phrases ALTER COLUMN id SET DEFAULT nextval('public.quick_phrases_id_seq'::regclass);


--
-- Name: storage_chat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_chat ALTER COLUMN id SET DEFAULT nextval('public.storage_chat_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: agent_dm_messages agent_dm_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_dm_messages
    ADD CONSTRAINT agent_dm_messages_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: global_messages global_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_messages
    ADD CONSTRAINT global_messages_pkey PRIMARY KEY (id);


--
-- Name: group_chats group_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_chats
    ADD CONSTRAINT group_chats_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: group_messages group_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_reaction_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_reaction_key UNIQUE (message_id, user_id, reaction);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_replies message_replies_message_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_replies
    ADD CONSTRAINT message_replies_message_id_key UNIQUE (message_id);


--
-- Name: message_replies message_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_replies
    ADD CONSTRAINT message_replies_pkey PRIMARY KEY (id);


--
-- Name: message_reply_stats message_reply_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reply_stats
    ADD CONSTRAINT message_reply_stats_pkey PRIMARY KEY (message_id);


--
-- Name: message_statuses message_statuses_message_id_user_id_status_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_statuses
    ADD CONSTRAINT message_statuses_message_id_user_id_status_key UNIQUE (message_id, user_id, status);


--
-- Name: message_statuses message_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_statuses
    ADD CONSTRAINT message_statuses_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: quick_phrases quick_phrases_label_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_phrases
    ADD CONSTRAINT quick_phrases_label_key UNIQUE (label);


--
-- Name: quick_phrases quick_phrases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_phrases
    ADD CONSTRAINT quick_phrases_pkey PRIMARY KEY (id);


--
-- Name: storage_chat storage_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_chat
    ADD CONSTRAINT storage_chat_pkey PRIMARY KEY (id);


--
-- Name: user_dm_reads user_dm_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_dm_reads
    ADD CONSTRAINT user_dm_reads_pkey PRIMARY KEY (user_id, agent_a, agent_b);


--
-- Name: user_global_reads user_global_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_global_reads
    ADD CONSTRAINT user_global_reads_pkey PRIMARY KEY (user_id);


--
-- Name: user_group_reads user_group_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_reads
    ADD CONSTRAINT user_group_reads_pkey PRIMARY KEY (user_id, group_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_Create_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_Create_by" ON public.conversations USING btree (created_by) INCLUDE (created_by) WITH (deduplicate_items='true');

ALTER INDEX public."idx_Create_by" DEPENDS ON EXTENSION plpgsql;

--
-- Name: idx_agent_dm_pair_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_dm_pair_created ON public.agent_dm_messages USING btree (agent_a, agent_b, created_at DESC);


--
-- Name: idx_agent_dm_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_dm_user_id ON public.agent_dm_messages USING btree (user_id);


--
-- Name: idx_chats_agent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_agent_id ON public.chats USING btree (agent_id);


--
-- Name: idx_chats_channel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_channel ON public.chats USING btree (channel);


--
-- Name: idx_chats_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_client_id ON public.chats USING btree (client_id);


--
-- Name: idx_chats_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_status ON public.chats USING btree (status);


--
-- Name: idx_global_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_messages_created_at ON public.global_messages USING btree (created_at DESC);


--
-- Name: idx_group_members_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_members_user_id ON public.group_members USING btree (user_id);


--
-- Name: idx_group_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_messages_created_at ON public.group_messages USING btree (created_at DESC);


--
-- Name: idx_group_messages_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_messages_group_id ON public.group_messages USING btree (group_id);


--
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_external_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_external_id ON public.messages USING btree (external_message_id);


--
-- Name: idx_messages_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);


--
-- Name: idx_storage_chat_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_chat_entity_id ON public.storage_chat USING btree (entity_id);


--
-- Name: idx_storage_chat_entity_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_chat_entity_type_id ON public.storage_chat USING btree (entity_type, entity_id);


--
-- Name: idx_storage_chat_is_attachment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_chat_is_attachment ON public.storage_chat USING btree (is_attachment);


--
-- Name: idx_storage_chat_public_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_chat_public_id ON public.storage_chat USING btree (public_id);


--
-- Name: idx_users_whatsapp_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_whatsapp_id ON public.users USING btree (whatsapp_id);


--
-- Name: chats update_chats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_dm_messages agent_dm_messages_agent_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_dm_messages
    ADD CONSTRAINT agent_dm_messages_agent_a_fkey FOREIGN KEY (agent_a) REFERENCES public.users(id);


--
-- Name: agent_dm_messages agent_dm_messages_agent_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_dm_messages
    ADD CONSTRAINT agent_dm_messages_agent_b_fkey FOREIGN KEY (agent_b) REFERENCES public.users(id);


--
-- Name: agent_dm_messages agent_dm_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_dm_messages
    ADD CONSTRAINT agent_dm_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chats chats_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: chats chats_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: global_messages global_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_messages
    ADD CONSTRAINT global_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: group_chats group_chats_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_chats
    ADD CONSTRAINT group_chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: group_members group_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_dm_reads user_dm_reads_agent_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_dm_reads
    ADD CONSTRAINT user_dm_reads_agent_a_fkey FOREIGN KEY (agent_a) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_dm_reads user_dm_reads_agent_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_dm_reads
    ADD CONSTRAINT user_dm_reads_agent_b_fkey FOREIGN KEY (agent_b) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_dm_reads user_dm_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_dm_reads
    ADD CONSTRAINT user_dm_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_global_reads user_global_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_global_reads
    ADD CONSTRAINT user_global_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_group_reads user_group_reads_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_reads
    ADD CONSTRAINT user_group_reads_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.group_chats(id) ON DELETE CASCADE;


--
-- Name: user_group_reads user_group_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_reads
    ADD CONSTRAINT user_group_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ZdMe5LxzcXAZhBZEQGXa2HRvFZ1qy7iRzbpQj5rUdnLV3bRW3HYDX0uB2c8mbv1

