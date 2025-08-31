--
-- PostgreSQL database dump
--

\restrict hkWCr6kIr8BS5OX3sIm0npmIU0lVublWTLB92uvbfacGH3twlLEBaqiGfq3WnQa

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
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.countries VALUES (1, 'Peru', 'PEN', '2025-08-28 06:05:10.005651+00', '2025-08-28 06:05:10.005651+00');
INSERT INTO public.countries VALUES (2, 'Chile', 'CLP', '2025-08-28 06:05:10.005651+00', '2025-08-28 06:05:10.005651+00');
INSERT INTO public.countries VALUES (3, 'Colombia', 'COP', '2025-08-29 07:00:30.085354+00', '2025-08-29 07:00:30.085354+00');
INSERT INTO public.countries VALUES (4, 'Ecuador', 'USD', '2025-08-29 07:02:40.748868+00', '2025-08-29 07:02:40.748868+00');
INSERT INTO public.countries VALUES (5, 'United States', 'USD', '2025-08-29 07:15:31.369428+00', '2025-08-29 07:15:31.369428+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (5, 'treasury@test.com', 'Treasury', 'test', '$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q', 'SAP001', 1, 'CC1001', '', NULL, 'TREASURY', false, true, true, '2025-08-29 06:48:46.711705+00', '2025-08-29 06:51:16.598185+00');
INSERT INTO public.users VALUES (8, 'manager@test.com', 'Manager', 'test', '$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q', 'SAP003', 2, 'CC1003', '', NULL, 'MANAGER', false, true, true, '2025-08-29 06:54:34.170568+00', '2025-08-29 06:54:34.170568+00');
INSERT INTO public.users VALUES (6, 'accounting@test.com', 'Accounting', 'Test', '$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q', 'SAP002', 1, 'CC1002', '', NULL, 'ACCOUNTING', false, true, false, '2025-08-29 06:51:03.100613+00', '2025-08-29 06:57:42.775626+00');
INSERT INTO public.users VALUES (1, 'test@test.com', 'Super', 'Admin', '$2b$12$AVDpZaWaO832yhhKwxYtkOx/CltX95pf10VyuMGMmJyAUFWRfxV8q', 'ADMIN001', 1, 'ADMIN', NULL, 8, 'TREASURY', true, true, false, '2025-08-28 06:05:10.045937+00', '2025-08-30 12:02:56.810032+00');


--
-- Data for Name: approval_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.expense_categories VALUES (1, 'Food', '10001', 500.00, '2025-08-28 06:05:10.015947+00', '2025-08-28 06:05:10.015947+00');
INSERT INTO public.expense_categories VALUES (2, 'Transportation', '10002', 500.00, '2025-08-28 06:05:23.239487+00', '2025-08-28 06:05:23.239487+00');
INSERT INTO public.expense_categories VALUES (3, 'Accomodation', '10003', 1000.00, '2025-08-29 07:15:52.92839+00', '2025-08-29 07:15:52.92839+00');


--
-- Data for Name: category_country_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.currencies VALUES (1, 'Peruvian Sol', 'PEN', 'S/', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (2, 'US Dollar', 'USD', '$', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (3, 'Chilean Peso', 'CLP', '$', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (4, 'Euro', 'EUR', '€', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (5, 'Mexican Peso', 'MXN', '$', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (6, 'Colombian Peso', 'COP', '$', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (7, 'Brazilian Real', 'BRL', 'R$', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');
INSERT INTO public.currencies VALUES (8, 'Argentine Peso', 'ARS', '$', '2025-08-30 10:12:08.75507+00', '2025-08-30 10:12:08.75507+00');


--
-- Data for Name: factura_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.factura_suppliers VALUES (1, 'Test Restaurant', 'REST001', '2025-08-28 06:05:23.196972+00', '2025-08-28 06:05:23.196972+00');
INSERT INTO public.factura_suppliers VALUES (2, 'Uber', 'SUP002', '2025-08-29 05:26:17.735722+00', '2025-08-29 05:26:17.735722+00');


--
-- Data for Name: prepayments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: travel_expense_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_rejection_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: approval_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_history_id_seq', 1, false);


--
-- Name: approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approvals_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.currencies_id_seq', 1056, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 3, true);


--
-- Name: expense_rejection_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_rejection_history_id_seq', 1, false);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: factura_suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.factura_suppliers_id_seq', 2, true);


--
-- Name: prepayments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prepayments_id_seq', 1, false);


--
-- Name: travel_expense_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.travel_expense_reports_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- PostgreSQL database dump complete
--

\unrestrict hkWCr6kIr8BS5OX3sIm0npmIU0lVublWTLB92uvbfacGH3twlLEBaqiGfq3WnQa

