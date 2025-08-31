--
-- PostgreSQL database dump
--

\restrict WFeBLBtHpocHI9I8vdJaDK6jrhOIl5Qrtd2LgLfy4euP2AUJnwsIHFfVwSescEI

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: approvalaction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approvalaction AS ENUM (
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'RETURNED'
);


ALTER TYPE public.approvalaction OWNER TO postgres;

--
-- Name: approvalstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approvalstatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.approvalstatus OWNER TO postgres;

--
-- Name: documenttype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.documenttype AS ENUM (
    'BOLETA',
    'FACTURA'
);


ALTER TYPE public.documenttype OWNER TO postgres;

--
-- Name: entitytype; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.entitytype AS ENUM (
    'PREPAYMENT',
    'TRAVEL_EXPENSE_REPORT'
);


ALTER TYPE public.entitytype OWNER TO postgres;

--
-- Name: expensestatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expensestatus AS ENUM (
    'PENDING',
    'IN_PROCESS',
    'APPROVED'
);


ALTER TYPE public.expensestatus OWNER TO postgres;

--
-- Name: requeststatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.requeststatus AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED',
    'supervisor_pending',
    'accounting_pending',
    'treasury_pending',
    'SUPERVISOR_PENDING',
    'ACCOUNTING_PENDING',
    'TREASURY_PENDING'
);


ALTER TYPE public.requeststatus OWNER TO postgres;

--
-- Name: taxableoption; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.taxableoption AS ENUM (
    'SI',
    'NO'
);


ALTER TYPE public.taxableoption OWNER TO postgres;

--
-- Name: userprofile; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userprofile AS ENUM (
    'EMPLOYEE',
    'MANAGER',
    'ACCOUNTING',
    'TREASURY'
);


ALTER TYPE public.userprofile OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approval_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_history (
    id integer NOT NULL,
    entity_type public.entitytype NOT NULL,
    entity_id integer NOT NULL,
    user_id integer NOT NULL,
    user_role character varying(50) NOT NULL,
    action public.approvalaction NOT NULL,
    from_status character varying(50) NOT NULL,
    to_status character varying(50) NOT NULL,
    comments text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.approval_history OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.approval_history_id_seq OWNER TO postgres;

--
-- Name: approval_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_history_id_seq OWNED BY public.approval_history.id;


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approvals (
    id integer NOT NULL,
    entity_type public.entitytype NOT NULL,
    entity_id integer NOT NULL,
    approver_user_id integer NOT NULL,
    status public.approvalstatus NOT NULL,
    approval_level integer NOT NULL,
    rejection_reason text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.approvals OWNER TO postgres;

--
-- Name: approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.approvals_id_seq OWNER TO postgres;

--
-- Name: approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;


--
-- Name: category_country_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category_country_alerts (
    id integer NOT NULL,
    category_id integer NOT NULL,
    country_id integer NOT NULL,
    alert_amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.category_country_alerts OWNER TO postgres;

--
-- Name: category_country_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.category_country_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.category_country_alerts_id_seq OWNER TO postgres;

--
-- Name: category_country_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.category_country_alerts_id_seq OWNED BY public.category_country_alerts.id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    currency character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.countries_id_seq OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currencies (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    symbol character varying(10),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.currencies OWNER TO postgres;

--
-- Name: currencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.currencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.currencies_id_seq OWNER TO postgres;

--
-- Name: currencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    account character varying(50) NOT NULL,
    alert_amount numeric(12,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    category_id integer NOT NULL,
    travel_expense_report_id integer,
    purpose character varying(500) NOT NULL,
    document_type public.documenttype NOT NULL,
    boleta_supplier character varying(200),
    factura_supplier_id integer,
    expense_date date NOT NULL,
    country_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    document_number character varying(100) NOT NULL,
    taxable public.taxableoption,
    document_file character varying(500),
    comments text,
    status public.expensestatus NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    currency_id integer NOT NULL,
    created_by_user_id integer
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: factura_suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.factura_suppliers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    sap_code character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.factura_suppliers OWNER TO postgres;

--
-- Name: factura_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.factura_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.factura_suppliers_id_seq OWNER TO postgres;

--
-- Name: factura_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.factura_suppliers_id_seq OWNED BY public.factura_suppliers.id;


--
-- Name: prepayments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepayments (
    id integer NOT NULL,
    reason text NOT NULL,
    destination_country_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    justification_file character varying(500),
    comment text,
    status public.requeststatus NOT NULL,
    requesting_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    currency_id integer NOT NULL
);


ALTER TABLE public.prepayments OWNER TO postgres;

--
-- Name: prepayments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prepayments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.prepayments_id_seq OWNER TO postgres;

--
-- Name: prepayments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prepayments_id_seq OWNED BY public.prepayments.id;


--
-- Name: travel_expense_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.travel_expense_reports (
    id integer NOT NULL,
    prepayment_id integer NOT NULL,
    status public.requeststatus NOT NULL,
    requesting_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.travel_expense_reports OWNER TO postgres;

--
-- Name: travel_expense_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.travel_expense_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.travel_expense_reports_id_seq OWNER TO postgres;

--
-- Name: travel_expense_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.travel_expense_reports_id_seq OWNED BY public.travel_expense_reports.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    surname character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    sap_code character varying(50) NOT NULL,
    country_id integer NOT NULL,
    cost_center character varying(100) NOT NULL,
    credit_card_number character varying(20),
    supervisor_id integer,
    profile public.userprofile NOT NULL,
    is_superuser boolean NOT NULL,
    is_approver boolean NOT NULL,
    force_password_change boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
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


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: approval_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history ALTER COLUMN id SET DEFAULT nextval('public.approval_history_id_seq'::regclass);


--
-- Name: approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals ALTER COLUMN id SET DEFAULT nextval('public.approvals_id_seq'::regclass);


--
-- Name: category_country_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_country_alerts ALTER COLUMN id SET DEFAULT nextval('public.category_country_alerts_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: currencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: factura_suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factura_suppliers ALTER COLUMN id SET DEFAULT nextval('public.factura_suppliers_id_seq'::regclass);


--
-- Name: prepayments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepayments ALTER COLUMN id SET DEFAULT nextval('public.prepayments_id_seq'::regclass);


--
-- Name: travel_expense_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_expense_reports ALTER COLUMN id SET DEFAULT nextval('public.travel_expense_reports_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: approval_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_history (id, entity_type, entity_id, user_id, user_role, action, from_status, to_status, comments, created_at) FROM stdin;
2	PREPAYMENT	5	1	treasury	SUBMITTED	pending	supervisor_pending	Submitted for approval	2025-08-30 12:19:55.348852+00
3	PREPAYMENT	5	8	manager	APPROVED	accounting_pending	accounting_pending	\N	2025-08-30 12:20:32.959636+00
4	PREPAYMENT	5	6	accounting	APPROVED	treasury_pending	treasury_pending	\N	2025-08-30 12:23:59.027331+00
5	PREPAYMENT	5	5	treasury	APPROVED	approved	approved	\N	2025-08-30 12:24:10.427526+00
6	PREPAYMENT	6	1	treasury	SUBMITTED	pending	supervisor_pending	Submitted for approval	2025-08-30 12:37:09.076732+00
7	PREPAYMENT	6	8	manager	APPROVED	accounting_pending	accounting_pending	\N	2025-08-30 12:41:29.814959+00
8	PREPAYMENT	6	6	accounting	APPROVED	treasury_pending	treasury_pending	\N	2025-08-30 12:41:58.438192+00
9	PREPAYMENT	6	5	treasury	APPROVED	approved	approved	\N	2025-08-30 12:42:19.695227+00
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approvals (id, entity_type, entity_id, approver_user_id, status, approval_level, rejection_reason, approved_at, created_at, updated_at) FROM stdin;
1	PREPAYMENT	3	1	APPROVED	1	\N	2025-08-29 03:42:05.463918+00	2025-08-29 03:42:05.453764+00	2025-08-29 03:42:05.453764+00
2	PREPAYMENT	1	1	REJECTED	1	Insufficient business justification	\N	2025-08-29 03:42:12.601285+00	2025-08-29 03:42:12.601285+00
3	PREPAYMENT	4	1	APPROVED	1	\N	2025-08-29 04:32:47.110221+00	2025-08-29 04:32:47.101576+00	2025-08-29 04:32:47.101576+00
4	PREPAYMENT	5	1	REJECTED	1	No reason provided	\N	2025-08-30 12:04:10.611909+00	2025-08-30 12:04:10.611909+00
5	PREPAYMENT	5	8	APPROVED	1	\N	2025-08-30 12:20:32.96659+00	2025-08-30 12:20:32.959636+00	2025-08-30 12:20:32.959636+00
6	PREPAYMENT	5	6	APPROVED	1	\N	2025-08-30 12:23:59.041132+00	2025-08-30 12:23:59.027331+00	2025-08-30 12:23:59.027331+00
7	PREPAYMENT	5	5	APPROVED	1	\N	2025-08-30 12:24:10.42914+00	2025-08-30 12:24:10.427526+00	2025-08-30 12:24:10.427526+00
8	PREPAYMENT	6	8	APPROVED	1	\N	2025-08-30 12:41:29.827349+00	2025-08-30 12:41:29.814959+00	2025-08-30 12:41:29.814959+00
9	PREPAYMENT	6	6	APPROVED	1	\N	2025-08-30 12:41:58.442565+00	2025-08-30 12:41:58.438192+00	2025-08-30 12:41:58.438192+00
10	PREPAYMENT	6	5	APPROVED	1	\N	2025-08-30 12:42:19.697892+00	2025-08-30 12:42:19.695227+00	2025-08-30 12:42:19.695227+00
\.


--
-- Data for Name: category_country_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category_country_alerts (id, category_id, country_id, alert_amount, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.countries (id, name, currency, created_at, updated_at) FROM stdin;
1	Peru	PEN	2025-08-28 06:05:10.005651+00	2025-08-28 06:05:10.005651+00
2	Chile	CLP	2025-08-28 06:05:10.005651+00	2025-08-28 06:05:10.005651+00
3	Colombia	COP	2025-08-29 07:00:30.085354+00	2025-08-29 07:00:30.085354+00
4	Ecuador	USD	2025-08-29 07:02:40.748868+00	2025-08-29 07:02:40.748868+00
5	United States	USD	2025-08-29 07:15:31.369428+00	2025-08-29 07:15:31.369428+00
\.


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.currencies (id, name, code, symbol, created_at, updated_at) FROM stdin;
1	Peruvian Sol	PEN	S/	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
2	US Dollar	USD	$	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
3	Chilean Peso	CLP	$	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
4	Euro	EUR	€	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
5	Mexican Peso	MXN	$	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
6	Colombian Peso	COP	$	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
7	Brazilian Real	BRL	R$	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
8	Argentine Peso	ARS	$	2025-08-30 10:12:08.75507+00	2025-08-30 10:12:08.75507+00
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, name, account, alert_amount, created_at, updated_at) FROM stdin;
1	Food	10001	500.00	2025-08-28 06:05:10.015947+00	2025-08-28 06:05:10.015947+00
2	Transportation	10002	500.00	2025-08-28 06:05:23.239487+00	2025-08-28 06:05:23.239487+00
3	Accomodation	10003	1000.00	2025-08-29 07:15:52.92839+00	2025-08-29 07:15:52.92839+00
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, category_id, travel_expense_report_id, purpose, document_type, boleta_supplier, factura_supplier_id, expense_date, country_id, amount, document_number, taxable, document_file, comments, status, created_at, updated_at, currency_id, created_by_user_id) FROM stdin;
5	3	2	almuerzo	BOLETA	seño	\N	2025-08-30	1	100.00	doc123	NO			PENDING	2025-08-29 08:02:14.823193+00	2025-08-29 08:02:14.823193+00	2	\N
7	1	1	comida	BOLETA	doña chela restaurant	\N	2025-08-30	2	66141.00	doc123	NO			PENDING	2025-08-29 08:08:37.137312+00	2025-08-29 08:08:37.137312+00	3	\N
8	3	2	Test meal	BOLETA	Rest	\N	2025-08-30	1	25.50	doc123	NO			PENDING	2025-08-30 11:23:52.607072+00	2025-08-30 11:23:52.607072+00	2	\N
3	3	2	Hotel 3 nights	FACTURA		2	2025-09-01	1	1805.00	doc123	SI		comment	PENDING	2025-08-29 07:16:46.567112+00	2025-08-30 11:26:58.379048+00	1	\N
6	2	2	taxis	FACTURA		2	2025-08-30	1	101.00	recibo123	NO			PENDING	2025-08-29 08:07:59.360523+00	2025-08-30 11:28:30.464493+00	2	\N
2	1	1	test	BOLETA	carretilla	\N	2025-01-20	1	100.00	123	NO	\N	test	PENDING	2025-08-29 06:34:42.368221+00	2025-08-30 12:47:08.833943+00	1	\N
9	3	4	motel	BOLETA	motel	\N	2025-09-01	2	100.00	Diego	NO			PENDING	2025-08-30 12:52:35.094231+00	2025-08-30 12:52:35.094231+00	8	\N
10	3	4	dormir	BOLETA	motelito	\N	2025-09-03	2	120.00	doc123	NO		test	PENDING	2025-08-30 12:54:29.891568+00	2025-08-30 12:54:29.891568+00	8	\N
11	3	4	dormir	BOLETA	motel	\N	2025-09-02	2	1200.00	doc123	NO			PENDING	2025-08-30 12:56:38.272352+00	2025-08-30 12:56:38.272352+00	8	\N
12	1	\N	comida	BOLETA	la seño	\N	2025-08-31	1	12.00	nada	NO		comida en la calle	PENDING	2025-08-30 13:22:17.250789+00	2025-08-30 13:22:17.250789+00	1	1
\.


--
-- Data for Name: factura_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.factura_suppliers (id, name, sap_code, created_at, updated_at) FROM stdin;
1	Test Restaurant	REST001	2025-08-28 06:05:23.196972+00	2025-08-28 06:05:23.196972+00
2	Uber	SUP002	2025-08-29 05:26:17.735722+00	2025-08-29 05:26:17.735722+00
\.


--
-- Data for Name: prepayments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prepayments (id, reason, destination_country_id, start_date, end_date, amount, justification_file, comment, status, requesting_user_id, created_at, updated_at, currency_id) FROM stdin;
3	Conference in Peru	1	2025-09-10	2025-09-15	2500.00	\N	Attending tech conference	APPROVED	1	2025-08-29 03:36:28.914638+00	2025-08-29 03:42:05.463904+00	1
1	Business trip to Chile	2	2025-09-01	2025-09-05	500000.00	\N	Client meetings scheduled\n[REJECTED] Insufficient business justification	REJECTED	1	2025-08-29 03:29:53.283229+00	2025-08-29 03:42:12.60326+00	3
4	API Test Business Trip	1	2025-09-01	2025-09-05	1500.00	\N	Testing end-to-end workflow	APPROVED	1	2025-08-29 04:32:30.230973+00	2025-08-29 04:32:47.110176+00	2
2	Business trip to Chile	2	2025-09-01	2025-09-05	500000.00	\N	Client meetings scheduled\n[2025-08-29 03:34:58.086634] Status changed to approved: Approved for business trip	APPROVED	1	2025-08-29 03:30:13.613318+00	2025-08-30 11:02:59.056604+00	3
5	España	2	2025-08-30	2025-09-05	1000000.00		comentario\n\n[REJECTED] No reason provided	APPROVED	1	2025-08-29 06:33:33.519464+00	2025-08-30 12:24:10.429132+00	3
6	trip	2	2025-08-30	2025-09-01	123.45	\N	\N	APPROVED	1	2025-08-30 12:31:53.727733+00	2025-08-30 12:42:19.697865+00	8
7	test 007: viaje a Peru	1	2025-09-01	2025-09-04	20000.00		test 007, monto $20,000	PENDING	1	2025-08-30 12:43:58.558638+00	2025-08-30 12:43:58.558638+00	1
\.


--
-- Data for Name: travel_expense_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.travel_expense_reports (id, prepayment_id, status, requesting_user_id, created_at, updated_at) FROM stdin;
1	2	PENDING	1	2025-08-29 03:35:04.477415+00	2025-08-29 03:35:04.477415+00
2	4	PENDING	1	2025-08-29 04:32:53.672679+00	2025-08-29 04:32:53.672679+00
3	5	PENDING	1	2025-08-30 12:24:10.427526+00	2025-08-30 12:24:10.427526+00
4	6	PENDING	1	2025-08-30 12:42:19.695227+00	2025-08-30 12:42:19.695227+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, name, surname, password, sap_code, country_id, cost_center, credit_card_number, supervisor_id, profile, is_superuser, is_approver, force_password_change, created_at, updated_at) FROM stdin;
5	treasury@test.com	Treasury	test	$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q	SAP001	1	CC1001		\N	TREASURY	f	t	t	2025-08-29 06:48:46.711705+00	2025-08-29 06:51:16.598185+00
8	manager@test.com	Manager	test	$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q	SAP003	2	CC1003		\N	MANAGER	f	t	t	2025-08-29 06:54:34.170568+00	2025-08-29 06:54:34.170568+00
6	accounting@test.com	Accounting	Test	$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q	SAP002	1	CC1002		\N	ACCOUNTING	f	t	f	2025-08-29 06:51:03.100613+00	2025-08-29 06:57:42.775626+00
1	test@test.com	Super	Admin	$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q	ADMIN001	1	ADMIN	\N	8	TREASURY	t	t	f	2025-08-28 06:05:10.045937+00	2025-08-30 12:02:56.810032+00
\.


--
-- Name: approval_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_history_id_seq', 9, true);


--
-- Name: approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approvals_id_seq', 10, true);


--
-- Name: category_country_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.category_country_alerts_id_seq', 1, false);


--
-- Name: countries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.countries_id_seq', 5, true);


--
-- Name: currencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.currencies_id_seq', 16, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 3, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 12, true);


--
-- Name: factura_suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.factura_suppliers_id_seq', 2, true);


--
-- Name: prepayments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prepayments_id_seq', 7, true);


--
-- Name: travel_expense_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.travel_expense_reports_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- Name: category_country_alerts _category_country_alert_uc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_country_alerts
    ADD CONSTRAINT _category_country_alert_uc UNIQUE (category_id, country_id);


--
-- Name: approval_history approval_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: category_country_alerts category_country_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_country_alerts
    ADD CONSTRAINT category_country_alerts_pkey PRIMARY KEY (id);


--
-- Name: countries countries_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_name_key UNIQUE (name);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_key UNIQUE (code);


--
-- Name: currencies currencies_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_name_key UNIQUE (name);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: factura_suppliers factura_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factura_suppliers
    ADD CONSTRAINT factura_suppliers_pkey PRIMARY KEY (id);


--
-- Name: factura_suppliers factura_suppliers_sap_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factura_suppliers
    ADD CONSTRAINT factura_suppliers_sap_code_key UNIQUE (sap_code);


--
-- Name: prepayments prepayments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepayments
    ADD CONSTRAINT prepayments_pkey PRIMARY KEY (id);


--
-- Name: travel_expense_reports travel_expense_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_expense_reports
    ADD CONSTRAINT travel_expense_reports_pkey PRIMARY KEY (id);


--
-- Name: travel_expense_reports travel_expense_reports_prepayment_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_expense_reports
    ADD CONSTRAINT travel_expense_reports_prepayment_id_key UNIQUE (prepayment_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_approval_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_entity ON public.approvals USING btree (entity_type, entity_id);


--
-- Name: idx_approval_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_user ON public.approvals USING btree (approver_user_id);


--
-- Name: idx_expense_report; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expense_report ON public.expenses USING btree (travel_expense_report_id);


--
-- Name: idx_prepayment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prepayment_status ON public.prepayments USING btree (status);


--
-- Name: idx_prepayment_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prepayment_user ON public.prepayments USING btree (requesting_user_id);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_email ON public.users USING btree (email);


--
-- Name: ix_approval_history_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_approval_history_id ON public.approval_history USING btree (id);


--
-- Name: ix_approvals_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_approvals_id ON public.approvals USING btree (id);


--
-- Name: ix_category_country_alerts_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_category_country_alerts_id ON public.category_country_alerts USING btree (id);


--
-- Name: ix_countries_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_countries_id ON public.countries USING btree (id);


--
-- Name: ix_currencies_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_currencies_id ON public.currencies USING btree (id);


--
-- Name: ix_expense_categories_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expense_categories_id ON public.expense_categories USING btree (id);


--
-- Name: ix_expenses_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_id ON public.expenses USING btree (id);


--
-- Name: ix_factura_suppliers_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_factura_suppliers_id ON public.factura_suppliers USING btree (id);


--
-- Name: ix_prepayments_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_prepayments_id ON public.prepayments USING btree (id);


--
-- Name: ix_travel_expense_reports_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_travel_expense_reports_id ON public.travel_expense_reports USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: approval_history approval_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_history
    ADD CONSTRAINT approval_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: approvals approvals_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(id);


--
-- Name: category_country_alerts category_country_alerts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_country_alerts
    ADD CONSTRAINT category_country_alerts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: category_country_alerts category_country_alerts_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_country_alerts
    ADD CONSTRAINT category_country_alerts_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: expenses expenses_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: expenses expenses_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: expenses expenses_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: expenses expenses_factura_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_factura_supplier_id_fkey FOREIGN KEY (factura_supplier_id) REFERENCES public.factura_suppliers(id);


--
-- Name: expenses expenses_travel_expense_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_travel_expense_report_id_fkey FOREIGN KEY (travel_expense_report_id) REFERENCES public.travel_expense_reports(id);


--
-- Name: prepayments prepayments_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepayments
    ADD CONSTRAINT prepayments_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: prepayments prepayments_destination_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepayments
    ADD CONSTRAINT prepayments_destination_country_id_fkey FOREIGN KEY (destination_country_id) REFERENCES public.countries(id);


--
-- Name: prepayments prepayments_requesting_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepayments
    ADD CONSTRAINT prepayments_requesting_user_id_fkey FOREIGN KEY (requesting_user_id) REFERENCES public.users(id);


--
-- Name: travel_expense_reports travel_expense_reports_prepayment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_expense_reports
    ADD CONSTRAINT travel_expense_reports_prepayment_id_fkey FOREIGN KEY (prepayment_id) REFERENCES public.prepayments(id);


--
-- Name: travel_expense_reports travel_expense_reports_requesting_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_expense_reports
    ADD CONSTRAINT travel_expense_reports_requesting_user_id_fkey FOREIGN KEY (requesting_user_id) REFERENCES public.users(id);


--
-- Name: users users_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: users users_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict WFeBLBtHpocHI9I8vdJaDK6jrhOIl5Qrtd2LgLfy4euP2AUJnwsIHFfVwSescEI

