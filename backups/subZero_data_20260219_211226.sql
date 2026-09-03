--
-- PostgreSQL database dump
--

\restrict gCdB67GzbMoue89ztH92xh3xR3jbeMfLYeLSIHTslk2xXX00Z81JMyWBLWhiQpU

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, role, is_online, created_at, updated_at, whatsapp_id, password_hash) FROM stdin;
3	Agent 3	agent3@support.com	agent	f	2026-01-31 21:36:52.604354	2026-01-31 21:36:52.604354	\N	\N
4	Libis marquez	libis@gmail.com	client	f	2026-01-31 21:59:34.947637	2026-01-31 21:59:34.947637	\N	\N
5	luis tapia	luis@gmail.com	client	f	2026-01-31 22:01:29.978779	2026-01-31 22:01:29.978779	\N	\N
1	Agent 1	agent1@support.com	agent	t	2026-01-31 21:36:52.604354	2026-02-09 22:46:27.597529	\N	$2a$10$JTdPdfxyAx7s//zwMAC7OO/AnwPBXdFDGRZhsb4qKk65ymJZvmJ7u
6	test user name	\N	client	f	2026-02-05 01:02:24.105802	2026-02-05 01:02:24.105802	16315551181	\N
7	Luis David Tapia Posada	\N	client	f	2026-02-05 01:15:03.728106	2026-02-05 01:15:03.728106	573046708462	\N
2	Agent 2	agent2@support.com	agent	f	2026-01-31 21:36:52.604354	2026-02-09 23:56:41.801398	\N	$2a$10$cjgdB8byKoitsA0dccRmSOd8ZFYyfeUgRAsZf0YPuhUwIA.WZmNT2
8	Libis Marto	\N	client	f	2026-02-08 18:15:27.726275	2026-02-08 18:15:27.726275	573122998779	\N
\.


--
-- Data for Name: agent_dm_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_dm_messages (id, agent_a, agent_b, user_id, content, created_at) FROM stdin;
1	1	2	1	¡Hola! Un gusto saludarte.	2026-02-09 20:33:10.192933
2	1	2	1	Hola	2026-02-09 20:44:50.886749
3	1	2	2	hola	2026-02-09 20:45:16.863387
4	1	2	2	Hola	2026-02-09 20:45:31.678064
5	1	2	2	hola	2026-02-09 20:46:03.57584
6	1	2	1	hola	2026-02-09 20:46:36.255565
7	1	2	1	hola	2026-02-09 20:46:50.586944
8	1	2	2	Hola	2026-02-09 20:47:16.730895
9	1	2	2	hola	2026-02-09 20:47:23.600449
10	1	2	1	hola	2026-02-09 20:51:10.158159
11	1	2	2	hola	2026-02-09 20:51:42.117076
12	1	2	2	hola	2026-02-09 20:52:11.028898
13	1	2	2	hola	2026-02-09 20:52:50.776155
14	1	2	2	hola	2026-02-09 20:53:13.416474
15	1	2	2	hola	2026-02-09 20:55:45.885853
16	1	2	2	hola	2026-02-09 20:56:00.530111
17	1	2	2	hola	2026-02-09 20:56:09.656735
18	1	2	2	hola	2026-02-09 20:56:36.261301
19	1	2	2	hola	2026-02-09 20:57:08.935875
20	1	2	2	hola	2026-02-09 20:57:26.108713
21	1	2	2	hola	2026-02-09 21:00:22.519697
22	1	2	1	hola	2026-02-09 21:02:36.112347
23	1	2	2	Hola	2026-02-09 21:05:14.930791
24	1	2	2	hola	2026-02-09 21:05:45.934688
25	1	2	1	hola	2026-02-09 21:06:03.826063
26	1	2	2	hola	2026-02-09 21:06:26.975173
27	1	2	1	hola	2026-02-09 21:20:23.361506
28	1	2	2	Hola	2026-02-09 21:38:31.695904
29	1	2	1	hola	2026-02-09 21:38:53.694394
30	1	2	1	hola	2026-02-09 21:39:00.842381
31	1	2	1	hola	2026-02-09 21:39:15.790123
32	1	2	2	hola	2026-02-09 21:39:31.631438
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chats (id, client_id, agent_id, status, subject, created_at, assigned_at, closed_at, updated_at, first_response_at, rating, feedback, channel) FROM stdin;
15	4	1	closed	Hola como esta	2026-02-01 20:50:55.940732	2026-02-01 20:51:01.72051	2026-02-01 20:52:51.114497	2026-02-01 20:53:08.052276	2026-02-01 20:51:16.343486	5	Es un man genial	web
1	4	1	closed	Hola necesito ayuda	2026-01-31 21:59:46.439041	2026-01-31 22:01:54.500569	2026-01-31 22:07:28.155722	2026-01-31 22:07:28.155722	\N	\N	\N	web
2	5	2	closed	Necesito ayudaaa	2026-01-31 22:01:38.819945	2026-01-31 22:02:06.420557	2026-01-31 22:07:54.981969	2026-01-31 22:07:54.981969	\N	\N	\N	web
3	4	2	closed	Hola como va	2026-01-31 22:06:25.345738	2026-01-31 22:08:00.067984	2026-01-31 22:08:15.044386	2026-01-31 22:08:15.044386	\N	\N	\N	web
24	4	1	closed	Holas	2026-02-04 00:34:38.160196	2026-02-04 00:34:49.596028	2026-02-07 15:10:01.705128	2026-02-07 15:10:20.169051	2026-02-04 00:34:57.785989	5	Esta es de ahora	web
16	4	2	closed	Hola necesito ayuda	2026-02-01 22:08:22.700907	2026-02-01 22:10:56.684049	2026-02-01 22:13:55.952373	2026-02-01 22:14:20.339458	2026-02-01 22:09:29.828042	5	Exelente	web
4	4	1	closed	Hola necesito ayuda	2026-01-31 22:27:51.743323	2026-01-31 22:29:37.542137	2026-01-31 22:31:04.812767	2026-01-31 22:31:04.812767	\N	\N	\N	web
17	5	1	closed	Hola 	2026-02-01 22:09:08.608222	2026-02-01 22:09:19.076963	2026-02-02 23:46:45.331828	2026-02-02 23:46:45.331828	2026-02-01 22:09:43.540958	\N	\N	web
26	7	1	closed	WhatsApp	2026-02-05 01:15:03.75412	2026-02-05 01:15:18.558675	2026-02-07 21:01:22.380525	2026-02-07 21:01:22.380525	2026-02-05 01:32:46.312679	\N	\N	whatsapp
5	4	1	closed	Hola como estan	2026-01-31 22:32:39.485813	2026-01-31 22:32:43.710036	2026-01-31 22:34:08.550857	2026-01-31 22:34:08.550857	\N	\N	\N	web
6	4	1	closed	HOla	2026-01-31 22:34:26.259207	2026-01-31 22:34:30.391255	2026-01-31 22:36:21.575591	2026-01-31 22:36:21.575591	\N	\N	\N	web
7	4	1	closed	Hola como estas	2026-01-31 22:40:19.387651	2026-01-31 22:40:22.893587	2026-01-31 22:41:36.130542	2026-01-31 22:41:36.130542	\N	\N	\N	web
8	5	1	closed	Hola como estan	2026-01-31 22:44:04.18388	2026-01-31 22:44:21.220241	2026-02-01 19:12:26.205375	2026-02-01 19:12:26.205375	\N	\N	\N	web
9	4	1	closed	Hola como estan	2026-01-31 22:44:15.486307	2026-01-31 22:44:24.635177	2026-02-01 19:12:26.205375	2026-02-01 19:12:26.205375	\N	\N	\N	web
10	4	1	closed	Hola tengo un problema	2026-02-01 19:13:30.111757	2026-02-01 19:14:25.977688	2026-02-01 19:16:06.924177	2026-02-01 19:16:06.924177	\N	\N	\N	web
18	4	1	closed	Hola como estas	2026-02-02 23:47:35.974007	2026-02-02 23:48:09.12828	2026-02-03 09:17:09.21036	2026-02-03 09:33:33.043916	2026-02-02 23:52:39.410772	4	exelente	web
19	5	1	closed	Hola como estan	2026-02-03 00:06:28.572984	2026-02-03 00:47:40.192073	2026-02-03 09:19:17.862157	2026-02-03 10:28:48.89627	\N	5	\N	web
20	5	1	closed	Hola ayuda	2026-02-03 09:19:26.864444	2026-02-03 09:19:51.923347	2026-02-03 10:33:35.180255	2026-02-03 10:33:43.783965	\N	5	\N	web
11	5	2	closed	Hola como estan regrese	2026-02-01 19:14:15.437759	2026-02-01 19:53:49.10401	2026-02-01 20:33:43.24414	2026-02-01 20:33:43.24414	\N	\N	\N	web
12	4	1	closed	Hola otra vez yo	2026-02-01 19:25:45.70598	2026-02-01 19:25:56.085157	2026-02-01 20:41:14.985746	2026-02-01 20:41:14.985746	\N	\N	\N	web
13	4	1	closed	Hola necesito la encuesta	2026-02-01 20:41:51.3013	2026-02-01 20:41:56.110632	2026-02-01 20:44:00.174202	2026-02-01 20:44:00.174202	2026-02-01 20:42:10.983969	\N	\N	web
14	4	1	closed	Hola bien gracias	2026-02-01 20:45:30.685389	2026-02-01 20:45:39.772318	2026-02-01 20:45:48.600465	2026-02-01 20:45:48.600465	2026-02-01 20:45:42.992026	\N	\N	web
22	5	1	closed	ayuda por 2	2026-02-03 10:36:30.755499	2026-02-03 10:37:59.765496	2026-02-03 10:38:50.994164	2026-02-03 10:39:07.909737	2026-02-03 10:37:35.636352	5	El man es un man lindo	web
21	4	2	closed	Hola ayudaaa	2026-02-03 10:36:00.011619	2026-02-03 10:36:45.120298	2026-02-03 10:41:32.50764	2026-02-03 10:41:37.221306	2026-02-03 10:36:52.548939	5	\N	web
23	4	1	closed	HLAS	2026-02-03 23:15:10.227914	2026-02-03 23:15:46.475742	2026-02-04 00:26:53.172282	2026-02-04 00:26:57.317567	2026-02-03 23:28:52.734122	5	\N	web
25	6	1	active	WhatsApp	2026-02-05 01:02:24.142682	2026-02-05 01:02:39.763946	\N	2026-02-05 01:03:01.194913	2026-02-05 01:03:01.194913	\N	\N	whatsapp
29	8	1	closed	WhatsApp	2026-02-08 18:15:27.7449	2026-02-08 18:15:56.629942	2026-02-08 18:17:20.158391	2026-02-08 18:17:20.158391	2026-02-08 18:16:11.976566	\N	\N	whatsapp
27	7	1	closed	WhatsApp	2026-02-07 21:03:17.201073	2026-02-07 21:03:35.641611	2026-02-09 20:23:42.555992	2026-02-09 20:23:42.555992	2026-02-07 21:03:40.693396	\N	\N	whatsapp
30	8	1	closed	WhatsApp	2026-02-08 18:18:01.404369	2026-02-08 18:18:11.010106	2026-02-09 20:23:51.361954	2026-02-09 20:23:51.361954	2026-02-08 18:26:47.45127	\N	\N	whatsapp
31	8	1	active	WhatsApp	2026-02-09 20:24:45.242073	2026-02-09 20:24:53.22774	\N	2026-02-09 20:24:57.708227	2026-02-09 20:24:57.708227	\N	\N	whatsapp
28	4	1	closed	HOla	2026-02-08 01:40:31.792791	2026-02-08 01:40:39.310108	2026-02-09 21:20:42.998032	2026-02-09 21:20:47.119294	2026-02-08 16:23:10.992427	5	\N	web
32	4	2	closed	Hola nueva cosulta	2026-02-09 21:20:56.462804	2026-02-09 21:21:32.352209	2026-02-09 23:00:53.189592	2026-02-09 23:02:28.46519	2026-02-09 21:21:39.172134	4	Mas o menos	web
33	4	2	active	Hola	2026-02-09 23:09:48.825153	2026-02-09 23:09:57.751092	\N	2026-02-09 23:10:22.379145	\N	\N	\N	web
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, name, is_group, created_by, avatar_url, description, created_at, updated_at, last_message_at, archived_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_participants (id, conversation_id, user_id, role, joined_at, left_at, muted_until, is_active, notification_enabled, last_read_at) FROM stdin;
\.


--
-- Data for Name: global_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.global_messages (id, user_id, content, created_at) FROM stdin;
1	2	Hola	2026-02-03 10:06:24.700427
2	1	hola	2026-02-03 10:08:04.916201
3	2	HOla	2026-02-03 10:10:43.435166
4	1	Hola jojojo	2026-02-03 10:40:34.212823
5	1	📎 Adjuntos	2026-02-04 00:45:36.305489
6	2	Hola	2026-02-07 15:06:38.268256
\.


--
-- Data for Name: group_chats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_chats (id, name, created_by, created_at) FROM stdin;
1	Soporte	1	2026-02-05 22:02:53.379547
\.


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_members (group_id, user_id, added_by, added_at) FROM stdin;
1	1	1	2026-02-05 22:02:53.384744
1	2	1	2026-02-05 22:02:53.384744
\.


--
-- Data for Name: group_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_messages (id, group_id, user_id, content, created_at) FROM stdin;
1	1	1	Hola	2026-02-05 23:44:23.174833
2	1	1	Adjuntos	2026-02-05 23:44:52.719068
3	1	1	hola	2026-02-09 21:06:54.46867
4	1	2	hola	2026-02-09 22:17:02.681437
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_attachments (id, message_id, file_name, original_name, file_size, mime_type, storage_path, storage_provider, thumbnail_path, width, height, duration, metadata, upload_status, created_at) FROM stdin;
\.


--
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_reactions (id, message_id, user_id, reaction, created_at) FROM stdin;
\.


--
-- Data for Name: message_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_replies (id, message_id, replied_to_id, created_at) FROM stdin;
\.


--
-- Data for Name: message_reply_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_reply_stats (message_id, reply_count, last_replied_at, last_replier_id, updated_at) FROM stdin;
\.


--
-- Data for Name: message_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_statuses (id, message_id, user_id, status, status_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, chat_id, user_id, content, is_read, created_at, reply_to_id, status, channel, external_message_id) FROM stdin;
1	1	1	Hola cuentame	f	2026-01-31 22:02:49.655103	\N	sent	web	\N
2	4	1	❤️Hola como estas	f	2026-01-31 22:29:56.380927	\N	sent	web	\N
3	5	1	Hola como vas	f	2026-01-31 22:32:57.78915	\N	sent	web	\N
4	5	1	❤️ jjj	f	2026-01-31 22:33:09.725615	\N	sent	web	\N
5	5	4	Bien gracias❤️	f	2026-01-31 22:33:28.449336	\N	sent	web	\N
6	6	4	Hola	f	2026-01-31 22:35:28.071802	\N	sent	web	\N
7	6	1	Como vas	f	2026-01-31 22:35:37.745342	\N	sent	web	\N
8	6	4	MUUUUYYYY BIENNNN	f	2026-01-31 22:36:01.9733	\N	sent	web	\N
9	7	1	Hola bien gracias 	f	2026-01-31 22:41:05.448724	\N	sent	web	\N
10	8	1	Hola bien gracias	f	2026-01-31 22:44:37.742672	\N	sent	web	\N
11	9	4	siii como no	f	2026-01-31 22:45:05.325553	\N	sent	web	\N
12	10	4	Hola	f	2026-02-01 19:15:23.517771	\N	sent	web	\N
14	11	5	Que bueno me alegra	t	2026-02-01 19:25:14.181968	13	sent	web	\N
17	12	4	Hola no se que mas quiers	t	2026-02-01 19:27:42.696726	\N	sent	web	\N
18	12	4	Es incrible	t	2026-02-01 19:27:53.635612	\N	sent	web	\N
13	11	1	Hola bien gracias	t	2026-02-01 19:24:49.859223	\N	sent	web	\N
15	11	1	Genial	t	2026-02-01 19:26:22.66364	14	sent	web	\N
20	11	1	Genial	t	2026-02-01 19:32:32.832686	\N	sent	web	\N
21	11	2	Hokas	t	2026-02-01 20:01:47.542345	\N	read	web	\N
22	11	5	Hola	t	2026-02-01 20:32:36.490029	\N	read	web	\N
16	12	1	Hola como vas	t	2026-02-01 19:27:09.806755	\N	read	web	\N
19	12	1	Exlente	t	2026-02-01 19:32:24.877282	\N	read	web	\N
23	13	1	Esta es prueba	f	2026-02-01 20:42:10.995027	\N	delivered	web	\N
24	13	4	Si totalmente	f	2026-02-01 20:42:33.503048	23	sent	web	\N
25	14	1	hoja	f	2026-02-01 20:45:43.015884	\N	sent	web	\N
27	15	4	Gracias	t	2026-02-01 20:51:43.156765	\N	read	web	\N
28	15	4	gennial	t	2026-02-01 20:51:57.538314	\N	read	web	\N
69	26	7	Hola	t	2026-02-05 01:15:03.76554	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUNFNkMxMjhBRUE5NzZBRUJENkJFQUI0QzNGQjhEOUUA
26	15	1	Hola bien gracias	t	2026-02-01 20:51:16.35079	\N	read	web	\N
29	15	1	Exelent	t	2026-02-01 20:52:11.943236	\N	read	web	\N
51	23	4	📎 Adjuntos	t	2026-02-03 23:44:57.595578	\N	read	web	\N
32	16	4	Hola	t	2026-02-01 22:09:53.219571	\N	read	web	\N
30	16	1	Hola ok	t	2026-02-01 22:09:29.837057	\N	read	web	\N
31	17	1	hola	t	2026-02-01 22:09:43.552335	\N	read	web	\N
52	23	4	📎 Adjuntos	t	2026-02-03 23:46:31.956671	\N	read	web	\N
53	23	4	📎 Adjuntos	t	2026-02-03 23:51:14.033528	\N	read	web	\N
34	18	1	Como estas	t	2026-02-02 23:52:39.43266	\N	read	web	\N
45	23	4	hOLA	t	2026-02-03 23:16:13.782157	\N	read	web	\N
47	23	4	📎 Adjuntos	t	2026-02-03 23:38:26.516662	\N	read	web	\N
33	18	4	Hola	t	2026-02-02 23:52:16.728555	\N	read	web	\N
35	18	4	Yo bien gracias	t	2026-02-03 00:05:28.434553	\N	read	web	\N
36	18	4	Hola	t	2026-02-03 00:18:51.798336	\N	read	web	\N
48	23	4	📎 Adjuntos	t	2026-02-03 23:38:28.673597	\N	read	web	\N
38	18	4	hola	f	2026-02-03 09:16:37.533264	\N	delivered	web	\N
39	18	4	hola	f	2026-02-03 09:16:55.631739	\N	delivered	web	\N
37	18	1	Hola	t	2026-02-03 09:16:28.990877	\N	read	web	\N
40	21	2	Hola que pasa	f	2026-02-03 10:36:52.555673	\N	delivered	web	\N
49	23	4	HOLA	t	2026-02-03 23:38:42.969767	\N	read	web	\N
50	23	4	📎 Adjuntos	t	2026-02-03 23:41:49.772222	\N	read	web	\N
42	22	2	Holas	t	2026-02-03 10:37:35.655827	\N	read	web	\N
43	22	1	Holass ya terminamos	t	2026-02-03 10:38:15.100405	\N	read	web	\N
41	21	4	No pasa nada	t	2026-02-03 10:37:08.119548	\N	read	web	\N
44	21	2	Holas	f	2026-02-03 10:41:00.349988	\N	delivered	web	\N
54	23	1	Hola	t	2026-02-04 00:02:27.911435	\N	read	web	\N
46	23	1	📎 Adjuntos	t	2026-02-03 23:28:52.765212	\N	read	web	\N
78	26	7	Gracias	t	2026-02-05 22:02:02.350246	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUM5MTJGNDhDOTMyQ0YxMDJGRjMxMEMwODY0NkNCOEYA
55	23	4	HLA	t	2026-02-04 00:10:11.412722	\N	read	web	\N
56	23	4	HOLA	t	2026-02-04 00:12:56.195416	\N	read	web	\N
57	23	4	📎 Adjuntos	t	2026-02-04 00:13:18.809015	\N	read	web	\N
58	23	4	Hola como estas	t	2026-02-04 00:21:30.876633	\N	read	web	\N
59	23	1	Hola como vas	f	2026-02-04 00:22:35.478111	\N	delivered	web	\N
60	23	1	Hola como	f	2026-02-04 00:23:17.998901	\N	delivered	web	\N
61	23	1	Esta es citada	f	2026-02-04 00:24:15.838814	60	delivered	web	\N
62	23	1	📎 Adjuntos	f	2026-02-04 00:24:27.453756	\N	delivered	web	\N
75	26	1	📎 Adjuntos	f	2026-02-05 01:32:46.334015	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOTI1M0FFMjFGNjVEQTY4NDY0AA==
63	24	1	hola como vas	t	2026-02-04 00:34:57.81298	\N	read	web	\N
64	24	1	mira esto	t	2026-02-04 00:35:18.210974	\N	read	web	\N
65	24	1	📎 Adjuntos	t	2026-02-04 00:41:28.450768	\N	read	web	\N
66	24	4	❤️	t	2026-02-04 00:44:48.926609	\N	read	web	\N
67	25	6	this is a text message	t	2026-02-05 01:02:24.159953	\N	read	whatsapp	ABGGFlA5Fpa
68	25	1	Hola cuentame	f	2026-02-05 01:03:01.224117	\N	sent	whatsapp	\N
70	26	7	🖼️ Imagen	t	2026-02-05 01:21:15.711751	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUMzQzcxODEwRDIxQTRDQUFFQUU1MDkzQzdCNzNCRjkA
72	26	7	📎 Archivo	t	2026-02-05 01:21:53.677257	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUM5NEYyOUE5NjU4NTVCNDg1QjA2QTdGNDVDNEYwM0UA
71	26	7	🖼️ Imagen	t	2026-02-05 01:21:52.146915	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUM2ODE3OUVEODJBMjhGNzFDNzFGNEI0NTBFODE5OEEA
73	26	7	🎤 Nota de voz	t	2026-02-05 01:23:33.441853	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUMwODUxREQ5RjA2N0MxN0JEQkQ3RjdCOTZFMTI1ODkA
74	26	7	🖼️ Imagen	t	2026-02-05 01:23:45.010066	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUM2MDA2RDQyQUJFRkUwNjdCQkU2OUMwOTRBRjA1OTAA
77	26	1	Totalmente	f	2026-02-05 01:34:03.937788	75	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQjg3RjNEQThGMENGMkQ4REU4AA==
76	26	7	Genial	t	2026-02-05 01:33:09.86569	73	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUNCMDE2ODQyRDJDMjUyMEQzODZEQkYzNTg2QTBEMTkA
79	26	1	De nada	f	2026-02-05 22:17:39.10958	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSN0NCOTQ2QUUyMUIxNDM3OTk1AA==
80	24	4	Hola como vas	t	2026-02-05 22:18:52.375842	\N	read	web	\N
81	26	7	Okis	t	2026-02-05 22:19:32.650192	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhggQUMwMDI0OTc0Mzk1QkM0QTk3N0JGN0FFQ0M1NDYxOTQA
82	24	4	📎 Adjuntos	t	2026-02-05 23:10:06.465235	\N	read	web	\N
83	24	1	📎 Adjuntos	t	2026-02-05 23:17:41.293613	\N	read	web	\N
84	24	1	📎 Adjuntos	t	2026-02-05 23:30:30.07016	\N	read	web	\N
86	26	1	📎 Adjuntos	f	2026-02-06 22:21:33.774892	\N	failed	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQkY5ODAwMzI3MzU3NUVCMjZEAA==
85	26	1	📎 Adjuntos	f	2026-02-06 22:14:51.604834	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOEI0QzY4RUFFMzZDMDA4NzE0AA==
87	26	1	hola	f	2026-02-06 22:27:58.680115	\N	failed	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMzYyNDlGQjZENDM4NTVEQzFEAA==
89	26	1	Hola	f	2026-02-06 22:37:07.13087	\N	failed	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMjlENDE4ODE3MTgxRDc4NEM3AA==
90	26	1	Hooola	f	2026-02-06 22:37:26.456453	\N	failed	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNTU0NTkxRTM5RTUzQ0JGN0I1AA==
91	26	1	Holis	f	2026-02-06 22:41:07.775078	\N	failed	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMjY2Mzc3RkREOTVGNUQxRjkzAA==
103	27	1	📎 Adjuntos	f	2026-02-07 21:24:43.21497	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSM0ExNTUxN0U5M0Y5MUM4N0EwAA==
92	26	7	wet	t	2026-02-06 22:44:10.568132	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDlGQzYwNkU2MkM0QkYzNjkxMgA=
93	24	1	Hola	t	2026-02-07 15:05:29.894354	\N	read	web	\N
88	25	6	this is a text message	t	2026-02-06 22:35:19.64034	\N	read	whatsapp	ABGGFlA5Fpa
94	25	6	this is a text message	t	2026-02-07 21:01:36.584691	\N	read	whatsapp	ABGGFlA5Fpa
95	25	6	this is a text message	t	2026-02-07 21:02:03.985717	\N	read	whatsapp	ABGGFlA5Fpa
96	25	1	Hola	f	2026-02-07 21:02:22.019696	\N	sent	whatsapp	\N
97	27	7	Hola	t	2026-02-07 21:03:17.220647	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMEQ2OTExOTkyNUZEOEMyQTAwQwA=
114	27	1	📎 Adjuntos	f	2026-02-07 22:36:13.425416	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRDk4NTgxQ0JFQjM0QzFENUFCAA==
98	27	1	Hola	f	2026-02-07 21:03:40.703051	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNDY2RThCQjhEQzkyRjBCNTcyAA==
104	27	1	📎 Adjuntos	f	2026-02-07 21:27:41.891176	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQzU2MkY5MEZBQjM1QzU5QkEzAA==
99	27	1	📎 Adjuntos	f	2026-02-07 21:04:29.510135	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNDA1MTk2RUI5MkI4Mzc0RkQ1AA==
110	27	1	📎 Adjuntos	f	2026-02-07 22:26:50.596154	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMTYzNDE3OTlBREY5NjdBN0VDAA==
105	27	1	📎 Adjuntos	f	2026-02-07 21:41:17.589172	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQTExQzY3ODgxMEMyQTZDRTg3AA==
101	27	1	📎 Adjuntos	f	2026-02-07 21:15:25.702562	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQTNENEJBQUIwODQ2ODJEM0RBAA==
100	27	1	hola	f	2026-02-07 21:05:07.259035	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNjE2NTBFOUUyRDZDQ0IwM0ZBAA==
102	27	7	🎤 Nota de voz	t	2026-02-07 21:21:41.471705	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDIyMTRCQ0VFMkNGOUVGMUIxNgA=
119	27	1		f	2026-02-07 22:53:52.893282	\N	sent	whatsapp	\N
106	27	1	📎 Adjuntos	f	2026-02-07 21:42:51.016911	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOEMxQTQwRDIxQURFRDgyNTRDAA==
111	27	1	📎 Adjuntos	f	2026-02-07 22:30:02.952694	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQThGMEVEMERBN0QyODA4QTFFAA==
107	27	1	📎 Adjuntos	f	2026-02-07 21:47:37.606247	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQjVFMkQyNDM0NzZEMzM1MENDAA==
115	27	1	📎 Adjuntos	f	2026-02-07 22:38:54.876656	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQUY4MDRDREU2NzczNjgxMEYzAA==
108	27	1	📎 Adjuntos	f	2026-02-07 21:54:53.689658	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOTEzQTAwQkJFRUI4MjVENzk0AA==
109	27	1	📎 Adjuntos	f	2026-02-07 22:01:18.514747	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOTkzQjlBMzg3RkYxMzMwQjIzAA==
112	27	1	📎 Adjuntos	f	2026-02-07 22:32:58.842254	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSODNBMDdBRDYzNDE1RDgzNDczAA==
125	27	1		f	2026-02-07 23:13:19.864919	120	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMUIzQTA1QTlCMDJGMjcyMjYwAA==
120	27	7		t	2026-02-07 22:54:47.43927	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDlGRkZGRUU0NDI2QUJCQTE0MgA=
113	27	1	📎 Adjuntos	f	2026-02-07 22:35:32.222203	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSM0VCRERFNjc1N0EzNTk0Q0U0AA==
116	27	1	📎 Adjuntos	f	2026-02-07 22:43:02.330997	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRTMxMUJCNEYwOTJCOTU5M0IxAA==
121	27	1		f	2026-02-07 22:55:20.809524	120	sent	whatsapp	\N
122	27	1		f	2026-02-07 22:57:41.461761	120	sent	whatsapp	\N
117	27	1	📎 Adjuntos	f	2026-02-07 22:44:30.713729	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQUM2MjM2RDI4QTlDQTJEMkQzAA==
118	27	1	📎 Adjuntos	f	2026-02-07 22:47:16.908222	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRDg3RUREM0ExNkJFOEE0MEIzAA==
123	27	1		f	2026-02-07 23:01:32.804877	120	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMTg1QTUyRjZFODcyNEFCOUQyAA==
124	27	1		f	2026-02-07 23:04:28.289748	120	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRUExNzQzNzRFQURCRkFDRDI4AA==
126	27	1		f	2026-02-07 23:16:52.670287	120	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQjVEOTg4QzYwQTM1MDdDNDVDAA==
129	27	1	Nota de voz	f	2026-02-07 23:27:30.875504	127	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNDEyNkZDOURDNDAxRjIxOEEyAA==
127	27	7	Nota de audio	t	2026-02-07 23:23:36.163765	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDVDQUMyQzU0M0JBNzM3NDA1MwA=
131	27	1	Nota de voz	f	2026-02-07 23:28:11.913874	130	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQ0I0QkNBQzlBMUZFOEIyNTJGAA==
128	27	1	Nota de voz	f	2026-02-07 23:24:05.616383	127	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNDhBQTVENUQ4OTYyQkQyNTE5AA==
130	27	7	Hola	t	2026-02-07 23:27:53.277268	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDE5QkY3Q0Y5NUUzREI0N0ZDQgA=
134	27	7	Nota de audio	t	2026-02-07 23:37:39.990342	129	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDlBMDM1MEU1NDRFODI3RDRFNgA=
132	27	1		f	2026-02-07 23:34:05.678279	127	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOEUxQzQ2Q0E2MDMxRDcxQTJBAA==
133	27	1		f	2026-02-07 23:34:40.917508	130	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMkZFNTEzNDc0QjRFQzU0OEE1AA==
135	27	7	Nota de audio	t	2026-02-07 23:41:11.826112	129	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDUwMTZGNTJEREEyRTNCRkU2NQA=
136	27	7	Nota de audio	t	2026-02-07 23:48:10.970126	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDFBQTA1QjlFNjE2QUI3QUI1RAA=
137	27	1		f	2026-02-07 23:48:32.729367	136	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRjkwMTY2NzI1RUI0RkM3NTk1AA==
138	27	1	HOla	f	2026-02-07 23:52:17.278834	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRDIxQkIwNTRERkUyMzJBNUE4AA==
139	27	1	Hola	f	2026-02-07 23:57:01.287168	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMkFBMjhDNkUyQkU3QUY5RDlDAA==
147	27	7	Nota de audio	t	2026-02-08 00:05:08.481504	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMERFM0VERDJFQTVDRDIxNThCMwA=
148	27	1	jjjj	f	2026-02-08 00:05:18.966089	147	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSREM1RTNGQjk1NzlGMDVGMkU4AA==
141	27	1		f	2026-02-07 23:57:38.349326	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSM0YxMERBMTkxQUI2OTg0MkM5AA==
140	27	1	Hola	f	2026-02-07 23:57:29.085833	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOEI4NjM3RjlBQjQ3ODg1MzM2AA==
182	28	1	HIOLA	t	2026-02-08 17:11:16.134559	\N	read	web	\N
149	27	1	texto	f	2026-02-08 00:06:34.114965	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQUY2QzFCODQ2Qjg1QkVFNDM0AA==
142	27	1	Ciado	f	2026-02-07 23:58:20.687607	120	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMDU1RjM1OEJGMEI4Rjk0RjA3AA==
157	27	1	Hola	f	2026-02-08 00:19:17.51691	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNkM2QkI2RDVGRUNGNUFCRjU0AA==
150	27	7	jdjdjjdjdj	t	2026-02-08 00:07:49.820855	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDk1ODVDOUVBMUJDNDU4NzY1NwA=
143	27	1	citado	f	2026-02-07 23:58:52.018084	136	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRjUzNUE0NUI3RDgzNUY0MEUzAA==
171	28	4	hola	t	2026-02-08 16:24:36.789539	\N	read	web	\N
144	27	1	citado	f	2026-02-07 23:59:52.148767	130	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSRjgxQ0RDNjEyMEM3REI2OTcyAA==
158	27	7	HOla	t	2026-02-08 00:37:17.293636	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDJFOTdCOTIxNDc3OTQ5MTZFOAA=
151	27	1	Hila	f	2026-02-08 00:08:05.060514	150	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSODYwMzUyQTAxMjEwREE3NzE1AA==
145	27	1	Hola	f	2026-02-08 00:01:49.298798	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOTU1MDYyMTM5NDNBOUE1MzlGAA==
152	27	7	holas	t	2026-02-08 00:10:04.182314	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMEI3OEE2QkZEN0ZCQzY3M0JCOQA=
146	27	1		f	2026-02-08 00:02:58.685529	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMDUwNTlDQjE5OEZEQjU0NkZBAA==
159	27	7	Nota de audio	t	2026-02-08 00:37:36.453757	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMEY1OEU0ODM3ODE5REFBQUVCOQA=
153	27	1	Hola	f	2026-02-08 00:10:17.623762	152	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQjcwQUU4NUNDNkJBRDhEMDgwAA==
154	27	1	Hola	f	2026-02-08 00:14:40.327006	152	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSOTY3MzVDNjgxNjg4MUNBRjQzAA==
160	27	1	Hola	f	2026-02-08 00:37:55.576881	159	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQjhEQzU5RUFGOUVCMjYzQkM2AA==
155	27	7	Nota de audio	t	2026-02-08 00:15:28.344451	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMDA5RDczN0FEMUU0OUY5MkJCRgA=
156	27	1	HOla	f	2026-02-08 00:15:41.307934	155	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSREQ5OTdBOTI2OUY2Rjg5RTg0AA==
161	27	1	Texto	f	2026-02-08 00:42:52.275718	159	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSODI5Mjk1ODZFMUYzQzFEQkU1AA==
172	28	1	Hpla	t	2026-02-08 17:01:18.418233	\N	read	web	\N
173	28	1	Hola	t	2026-02-08 17:01:56.890601	\N	read	web	\N
162	27	1	Holas	f	2026-02-08 00:51:42.734038	159	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSNERBNjhDQzJFNUNCQkZBN0I0AA==
164	27	1	Hola	f	2026-02-08 00:57:47.497417	\N	sent	whatsapp	\N
165	27	1	Hola	f	2026-02-08 00:57:47.499931	\N	sent	whatsapp	\N
166	27	1	Hola	f	2026-02-08 00:58:09.463351	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQzRCNDRDMjcyQzA0RTI5RTVBAA==
193	30	8	Ohal.    Papi.     Cómo.    Esta	t	2026-02-08 18:25:36.367921	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUMwMDJCOUFBRTZGOEU4NDY0MEQwNkRENUUwMTE0MTYA
163	27	1	hola	f	2026-02-08 00:57:47.471116	\N	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSQjU0OTUzQjYxRTlBM0U2MkIxAA==
174	28	4	Hola	t	2026-02-08 17:02:18.841665	\N	read	web	\N
167	27	7	Sii	t	2026-02-08 00:59:53.693762	166	read	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAEhgWM0VCMEE0Qzg1REREMzExMDUwMkNDNQA=
168	28	4	Hola	t	2026-02-08 16:14:32.640869	\N	read	web	\N
169	28	1	Hola	t	2026-02-08 16:23:11.002546	\N	read	web	\N
175	28	1	Hola	t	2026-02-08 17:03:45.66668	\N	read	web	\N
170	28	4	Hola	t	2026-02-08 16:23:33.533468	\N	read	web	\N
190	30	8	Hueurydh	t	2026-02-08 18:18:24.669812	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNEQjU2QTJCRUYyMjFBODYwQTA0NjEwNDIwQkYzODgA
176	28	1	Hola	t	2026-02-08 17:04:00.721263	\N	read	web	\N
177	28	1	Hola	t	2026-02-08 17:05:42.479157	\N	read	web	\N
192	28	4	😍	t	2026-02-08 18:19:03.381901	\N	read	web	\N
178	28	1	Hola	t	2026-02-08 17:07:03.20795	\N	read	web	\N
179	28	1	Hola	t	2026-02-08 17:07:58.403289	\N	read	web	\N
186	29	8	Hola buenas	t	2026-02-08 18:15:27.777408	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNDNzlEMUU1REZCQjA0QjI2NjQwOUYyNEJGRTc2NjIA
180	28	1	Hola	t	2026-02-08 17:09:04.636507	\N	read	web	\N
187	29	1		f	2026-02-08 18:16:12.003051	\N	sent	whatsapp	\N
181	28	1	Hola	t	2026-02-08 17:10:33.412982	\N	read	web	\N
185	25	6	this is a text message	t	2026-02-08 18:14:14.338874	\N	read	whatsapp	ABGGFlA5Fpa
188	29	1	Hola	f	2026-02-08 18:16:39.785088	\N	sent	whatsapp	\N
183	28	4	hIKA	t	2026-02-08 17:42:15.887764	\N	read	web	\N
184	28	4	HOL	t	2026-02-08 17:43:19.671453	\N	read	web	\N
189	30	8	Oliyhhgftttryehogfgtct	t	2026-02-08 18:18:01.429473	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNEMDgyMThCRDBGRjczNzIxODg1NkJGNjYwNTc4ODAA
194	30	1	Hola	f	2026-02-08 18:26:47.47959	\N	sent	whatsapp	\N
191	30	8	Nota de audio	t	2026-02-08 18:18:42.240382	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNBNUFFQ0E3NERCMUZGNUMzMTE3RkY4NUZFNTA4QTgA
195	30	8	Fui.      Ilo	t	2026-02-08 18:28:10.7828	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUM4RjFENUVGN0VGOUI3NUVDNjdBMjI3RDczMzkxMkYA
196	30	8	Nota de audio	t	2026-02-08 18:28:24.609246	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNGOERBNzcxODBFNjhBMDVFN0E2NzE4OEIwQjQ0OUEA
197	30	8	Nota de audio	t	2026-02-08 18:28:37.428636	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNENDA1QUY1NzgwN0FCMTE3MDhGMUY0NDA4OTY4MjgA
198	30	8	Jajajajajajaja	t	2026-02-08 18:30:18.348675	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUMxOTE4NUZFQjM1QkIxRDEyNkQ4M0MxM0Q3QjA2MjAA
199	30	8	1.   55.    153.      9958	t	2026-02-08 18:31:50.726372	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUM1QzJDODExQ0Q4QzkwRkU2MDJDMjU4NDQ2MEYxRUMA
200	30	8	T	t	2026-02-08 18:32:21.275747	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUMzNEI2Mzc4NzM5MDUwMDcwQjM0QjI0QjFBNThCRjcA
202	30	1	hola	f	2026-02-09 20:22:58.924889	\N	sent	whatsapp	\N
203	27	1	Hola	f	2026-02-09 20:23:18.884626	\N	failed	whatsapp	wamid.HBgMNTczMDQ2NzA4NDYyFQIAERgSMDdBQzU3MjMxMzA3OUQ4NjAwAA==
204	30	1	Hola	f	2026-02-09 20:23:32.255415	\N	sent	whatsapp	\N
205	31	8	22	t	2026-02-09 20:24:45.291373	\N	read	whatsapp	wamid.HBgMNTczMTIyOTk4Nzc5FQIAEhggQUNGREEzOTNDQ0FCQkU4QTc0Q0JGODlGMjlCQkEyQUQA
206	31	1	hola	f	2026-02-09 20:24:57.735916	\N	sent	whatsapp	\N
201	28	1	Hola, muchas gracias por contactarnos. Espero que te encuentres muy bien hoy.	t	2026-02-08 23:39:44.39599	\N	read	web	\N
207	32	2	Hola	t	2026-02-09 21:21:39.196062	\N	read	web	\N
208	32	2	Hola, ¿cómo te encuentras el día de hoy?😍	t	2026-02-09 21:22:50.456455	\N	read	web	\N
209	32	2		t	2026-02-09 21:24:16.453866	\N	read	web	\N
210	32	2		t	2026-02-09 21:27:33.635963	\N	read	web	\N
211	33	4	Hlas7	t	2026-02-09 23:18:51.042114	\N	read	web	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, metadata, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: quick_phrases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quick_phrases (id, label, text, created_at, updated_at) FROM stdin;
1	/hola	Hola como estas	2026-02-08 19:27:05.949344	2026-02-08 19:27:05.949344
2	/Hola como estas	Esta es la respuesta	2026-02-08 19:27:50.082979	2026-02-08 19:27:50.082979
\.


--
-- Data for Name: storage_chat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_chat (id, entity_id, url, public_id, resource_type, is_attachment, mime_type, bytes, filename, created_at, entity_type) FROM stdin;
1	45	https://res.cloudinary.com/dotwbioku/image/upload/v1770178666/chat-storage/image_zu8y1h.png	chat-storage/image_zu8y1h	image	f	image/png	16527	image.png	2026-02-03 23:17:46.213677	chat
2	52	https://res.cloudinary.com/dotwbioku/image/upload/v1770180394/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_kq8ulu.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_kq8ulu	image	f	image/jpeg	169350	WhatsApp Image 2025-09-22 at 9.19.00 PM.jpeg	2026-02-03 23:46:33.629139	chat
3	53	https://res.cloudinary.com/dotwbioku/raw/upload/v1770180676/chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_faswjo.docx	chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_faswjo.docx	raw	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	176901	PLANTILLA PROTOCOLO INDIVIDUAL (1).docx	2026-02-03 23:51:16.095536	chat
4	46	https://res.cloudinary.com/dotwbioku/raw/upload/v1770181350/chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_pvxbgj.docx	chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_pvxbgj.docx	raw	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	176901	PLANTILLA PROTOCOLO INDIVIDUAL (1).docx	2026-02-04 00:02:29.883661	chat
5	53	https://res.cloudinary.com/dotwbioku/raw/upload/v1770181815/chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_tbxmtc.docx	chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_tbxmtc.docx	raw	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	176901	PLANTILLA PROTOCOLO INDIVIDUAL (1).docx	2026-02-04 00:10:13.853074	chat
6	56	https://res.cloudinary.com/dotwbioku/raw/upload/v1770181978/chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_e1rprv.docx	chat-storage/PLANTILLA_PROTOCOLO_INDIVIDUAL_1_e1rprv.docx	raw	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	176901	PLANTILLA PROTOCOLO INDIVIDUAL (1).docx	2026-02-04 00:12:57.740284	chat
7	57	https://res.cloudinary.com/dotwbioku/image/upload/v1770182002/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_vt4m6w.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_vt4m6w	image	f	image/jpeg	169350	WhatsApp Image 2025-09-22 at 9.19.00 PM.jpeg	2026-02-04 00:13:21.397798	chat
8	58	https://res.cloudinary.com/dotwbioku/image/upload/v1770182494/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_eag9v4.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_eag9v4	image	f	image/jpeg	169350	WhatsApp Image 2025-09-22 at 9.19.00 PM.jpeg	2026-02-04 00:21:33.402846	chat
9	54	https://res.cloudinary.com/dotwbioku/image/upload/v1770182558/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_kaftds.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_kaftds	image	f	image/jpeg	170778	WhatsApp Image 2025-09-22 at 9.19.01 PM.jpeg	2026-02-04 00:22:37.116104	chat
10	60	https://res.cloudinary.com/dotwbioku/image/upload/v1770182601/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_w18v7x.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_w18v7x	image	f	image/jpeg	170778	WhatsApp Image 2025-09-22 at 9.19.01 PM.jpeg	2026-02-04 00:23:20.229899	chat
11	62	https://res.cloudinary.com/dotwbioku/image/upload/v1770182670/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_klzdur.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_klzdur	image	f	image/jpeg	170778	WhatsApp Image 2025-09-22 at 9.19.01 PM.jpeg	2026-02-04 00:24:29.917401	chat
12	64	https://res.cloudinary.com/dotwbioku/image/upload/v1770183320/chat-storage/image_yt3wkt.png	chat-storage/image_yt3wkt	image	f	image/png	6647	image.png	2026-02-04 00:35:19.655011	chat
13	65	https://res.cloudinary.com/dotwbioku/image/upload/v1770183691/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_ozbvom.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.01_PM_ozbvom	image	f	image/jpeg	170778	WhatsApp Image 2025-09-22 at 9.19.01 PM.jpeg	2026-02-04 00:41:29.968052	chat
14	5	https://res.cloudinary.com/dotwbioku/image/upload/v1770183939/chat-storage/WhatsApp_Image_2025-10-09_at_11.35.23_PM_sv8bs8.jpg	chat-storage/WhatsApp_Image_2025-10-09_at_11.35.23_PM_sv8bs8	image	f	image/jpeg	95515	WhatsApp Image 2025-10-09 at 11.35.23 PM.jpeg	2026-02-04 00:45:38.390103	global
15	5	https://res.cloudinary.com/dotwbioku/image/upload/v1770183940/chat-storage/WhatsApp_Image_2025-10-09_at_11.35.23_PM_r2sej3.jpg	chat-storage/WhatsApp_Image_2025-10-09_at_11.35.23_PM_r2sej3	image	f	image/jpeg	95515	WhatsApp Image 2025-10-09 at 11.35.23 PM.jpeg	2026-02-04 00:45:39.705304	global
16	70	https://res.cloudinary.com/dotwbioku/image/upload/v1770272478/chat-storage/image-1770272475709_kllewj.jpg	chat-storage/image-1770272475709_kllewj	image	f	image/jpeg	168684	image-1770272475709.jpeg	2026-02-05 01:21:17.219874	chat
17	72	https://res.cloudinary.com/dotwbioku/raw/upload/v1770272515/chat-storage/Mama_deYair_hgrtit.pdf	chat-storage/Mama_deYair_hgrtit.pdf	raw	t	application/pdf	80382	Mama deYair.pdf	2026-02-05 01:21:54.518622	chat
18	71	https://res.cloudinary.com/dotwbioku/image/upload/v1770272515/chat-storage/image-1770272512144_cvl7ki.jpg	chat-storage/image-1770272512144_cvl7ki	image	f	image/jpeg	168684	image-1770272512144.jpeg	2026-02-05 01:21:54.622024	chat
19	73	https://res.cloudinary.com/dotwbioku/raw/upload/v1770272616/chat-storage/audio-1770272613437_pvaqnw.ogg	chat-storage/audio-1770272613437_pvaqnw.ogg	raw	t	audio/ogg	8925	audio-1770272613437.ogg	2026-02-05 01:23:38.447063	chat
20	74	https://res.cloudinary.com/dotwbioku/image/upload/v1770272628/chat-storage/image-1770272625007_jetfpy.jpg	chat-storage/image-1770272625007_jetfpy	image	f	image/jpeg	168684	image-1770272625007.jpeg	2026-02-05 01:23:48.726798	chat
21	75	https://res.cloudinary.com/dotwbioku/image/upload/v1770273169/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_qhgkrw.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_qhgkrw	image	f	image/jpeg	169350	WhatsApp Image 2025-09-22 at 9.19.00 PM.jpeg	2026-02-05 01:32:48.826267	chat
22	82	https://res.cloudinary.com/dotwbioku/raw/upload/v1770351010/chat-storage/audio-1770351001672_zuzztv.webm	chat-storage/audio-1770351001672_zuzztv.webm	raw	t	audio/webm	126842	audio-1770351001672.webm	2026-02-05 23:10:08.477364	chat
23	83	https://res.cloudinary.com/dotwbioku/raw/upload/v1770351465/chat-storage/audio-1770351451562_dsnsyi.webm	chat-storage/audio-1770351451562_dsnsyi.webm	raw	t	audio/webm	133604	audio-1770351451562.webm	2026-02-05 23:17:43.039782	chat
24	83	https://res.cloudinary.com/dotwbioku/raw/upload/v1770351465/chat-storage/audio-1770351458532_ptw5xr.webm	chat-storage/audio-1770351458532_ptw5xr.webm	raw	t	audio/webm	19616	audio-1770351458532.webm	2026-02-05 23:17:43.5749	chat
25	84	https://res.cloudinary.com/dotwbioku/raw/upload/v1770352234/chat-storage/audio-1770352215324_xgk2xx.webm	chat-storage/audio-1770352215324_xgk2xx.webm	raw	t	audio/webm	100760	audio-1770352215324.webm	2026-02-05 23:30:32.495555	chat
26	2	https://res.cloudinary.com/dotwbioku/raw/upload/v1770353096/chat-storage/audio-1770353088526_dzqfln.webm	chat-storage/audio-1770353088526_dzqfln.webm	raw	t	audio/webm	76610	audio-1770353088526.webm	2026-02-05 23:44:54.255528	group
27	85	https://res.cloudinary.com/dotwbioku/raw/upload/v1770434094/chat-storage/audio-1770434052129_nvehov.webm	chat-storage/audio-1770434052129_nvehov.webm	raw	t	audio/webm	196394	audio-1770434052129.webm	2026-02-06 22:14:55.05488	chat
28	86	https://res.cloudinary.com/dotwbioku/raw/upload/v1770434496/chat-storage/audio-1770434484036_qhgf3y.webm	chat-storage/audio-1770434484036_qhgf3y.webm	raw	t	audio/webm	229238	audio-1770434484036.webm	2026-02-06 22:21:36.344469	chat
29	99	https://res.cloudinary.com/dotwbioku/raw/upload/v1770516272/chat-storage/audio-1770516264614_nc7gir.webm	chat-storage/audio-1770516264614_nc7gir.webm	raw	t	audio/webm	128774	audio-1770516264614.webm	2026-02-07 21:04:31.965359	chat
30	101	https://res.cloudinary.com/dotwbioku/raw/upload/v1770516931/chat-storage/CamScanner_05-02-2026_21.18_1_y7newq.pdf	chat-storage/CamScanner_05-02-2026_21.18_1_y7newq.pdf	raw	t	application/pdf	1264526	CamScanner 05-02-2026 21.18 (1).pdf	2026-02-07 21:15:30.919986	chat
31	102	https://res.cloudinary.com/dotwbioku/raw/upload/v1770517303/chat-storage/audio-1770517301468_e6vndc.ogg	chat-storage/audio-1770517301468_e6vndc.ogg	raw	t	audio/ogg	7372	audio-1770517301468.ogg	2026-02-07 21:21:43.278361	chat
32	103	https://res.cloudinary.com/dotwbioku/raw/upload/v1770517486/chat-storage/audio-1770517478412_ingbjy.webm	chat-storage/audio-1770517478412_ingbjy.webm	raw	t	audio/webm	153527	audio-1770517478412.webm	2026-02-07 21:24:45.718987	chat
33	104	https://res.cloudinary.com/dotwbioku/raw/upload/v1770517665/chat-storage/audio-1770517659387_xa2ubm.webm	chat-storage/audio-1770517659387_xa2ubm.webm	raw	t	audio/webm	92606	audio-1770517659387.webm	2026-02-07 21:27:44.159916	chat
34	105	https://res.cloudinary.com/dotwbioku/raw/upload/v1770518480/chat-storage/audio-1770518468279_oliyub.webm	chat-storage/audio-1770518468279_oliyub.webm	raw	t	audio/webm	163197	audio-1770518468279.webm	2026-02-07 21:41:19.961181	chat
35	106	https://res.cloudinary.com/dotwbioku/raw/upload/v1770518574/chat-storage/audio-1770518569586_gdtik2.webm	chat-storage/audio-1770518569586_gdtik2.webm	raw	t	audio/webm	92606	audio-1770518569586.webm	2026-02-07 21:42:53.514212	chat
36	107	https://res.cloudinary.com/dotwbioku/raw/upload/v1770518862/chat-storage/audio-1770518853620_jk5saa.ogg	chat-storage/audio-1770518853620_jk5saa.ogg	raw	t	audio/ogg	36916	audio-1770518853620.ogg	2026-02-07 21:47:41.360132	chat
37	108	https://res.cloudinary.com/dotwbioku/video/upload/v1770519296/chat-storage/audio-1770519291921_dnzizq.mp4	chat-storage/audio-1770519291921_dnzizq	video	t	audio/webm	56827	audio-1770519291921.webm	2026-02-07 21:54:56.434264	chat
38	109	https://res.cloudinary.com/dotwbioku/video/upload/v1770519681/chat-storage/audio-1770519675836_rhnyun.mp4	chat-storage/audio-1770519675836_rhnyun	video	t	audio/webm	95507	audio-1770519675836.webm	2026-02-07 22:01:21.467704	chat
39	110	https://res.cloudinary.com/dotwbioku/raw/upload/v1770521213/chat-storage/audio-1770521209032_etlpor.webm	chat-storage/audio-1770521209032_etlpor.webm	raw	t	audio/webm	78101	audio-1770521209032.webm	2026-02-07 22:26:53.218476	chat
40	111	https://res.cloudinary.com/dotwbioku/raw/upload/v1770521406/chat-storage/audio-1770521401395_ny6jjx.webm	chat-storage/audio-1770521401395_ny6jjx.webm	raw	t	audio/webm	80035	audio-1770521401395.webm	2026-02-07 22:30:05.594572	chat
41	112	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770521582/chat-storage/audio-1770521577036_pvx6ca.ogg	chat-storage/audio-1770521577036_pvx6ca	video	t	audio/ogg	82936	audio-1770521577036.ogg	2026-02-07 22:33:02.261347	chat
42	113	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770521735/chat-storage/audio-1770521730605_rqtqbf.ogg	chat-storage/audio-1770521730605_rqtqbf	video	t	audio/ogg	60695	audio-1770521730605.ogg	2026-02-07 22:35:35.132118	chat
43	114	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770521776/chat-storage/audio-1770521765980_ynqngr.ogg	chat-storage/audio-1770521765980_ynqngr	video	t	audio/ogg	51992	audio-1770521765980.ogg	2026-02-07 22:36:16.312644	chat
44	115	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770521938/chat-storage/audio-1770521932409_xhwu6o.ogg	chat-storage/audio-1770521932409_xhwu6o	video	t	audio/ogg	56827	audio-1770521932409.ogg	2026-02-07 22:38:57.67015	chat
45	116	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770522185/chat-storage/audio-1770522178688_xxmysd.ogg	chat-storage/audio-1770522178688_xxmysd	video	t	audio/ogg	57794	audio-1770522178688.ogg	2026-02-07 22:43:05.664261	chat
46	117	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770522273/chat-storage/audio-1770522269045_acutmd.ogg	chat-storage/audio-1770522269045_acutmd	video	t	audio/ogg	73266	audio-1770522269045.ogg	2026-02-07 22:44:33.55778	chat
47	118	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770522440/chat-storage/audio-1770522433837_kiekrp.ogg	chat-storage/audio-1770522433837_kiekrp	video	t	audio/ogg	83903	audio-1770522433837.ogg	2026-02-07 22:47:20.50365	chat
48	119	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770522835/chat-storage/audio-1770522831405_w8wbgs.ogg	chat-storage/audio-1770522831405_w8wbgs	video	t	audio/ogg	92606	audio-1770522831405.ogg	2026-02-07 22:53:54.947074	chat
49	120	https://res.cloudinary.com/dotwbioku/raw/upload/v1770522889/chat-storage/audio-1770522887436_w7y7la.ogg	chat-storage/audio-1770522887436_w7y7la.ogg	raw	t	audio/ogg	7326	audio-1770522887436.ogg	2026-02-07 22:54:48.992647	chat
50	121	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770522923/chat-storage/audio-1770522917862_vfru94.ogg	chat-storage/audio-1770522917862_vfru94	video	t	audio/ogg	72299	audio-1770522917862.ogg	2026-02-07 22:55:22.946171	chat
51	122	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770523064/chat-storage/audio-1770523059513_ys5fza.ogg	chat-storage/audio-1770523059513_ys5fza	video	t	audio/ogg	70365	audio-1770523059513.ogg	2026-02-07 22:57:44.195817	chat
52	123	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770523295/chat-storage/audio-1770523290798_bjh8t6.ogg	chat-storage/audio-1770523290798_bjh8t6	video	t	audio/ogg	75200	audio-1770523290798.ogg	2026-02-07 23:01:34.798563	chat
53	124	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770523470/chat-storage/audio-1770523465291_wvhiee.ogg	chat-storage/audio-1770523465291_wvhiee	video	t	audio/ogg	100342	audio-1770523465291.ogg	2026-02-07 23:04:30.255114	chat
54	125	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770524002/chat-storage/audio-1770523997911_zemiy4.ogg	chat-storage/audio-1770523997911_zemiy4	video	t	audio/ogg	130319	audio-1770523997911.ogg	2026-02-07 23:13:21.938956	chat
55	120	https://res.cloudinary.com/dotwbioku/video/upload/v1770524196/chat-storage/audio-1770524188263_votmkk.mp4	chat-storage/audio-1770524188263_votmkk	video	t	audio/webm	81969	audio-1770524188263.webm	2026-02-07 23:16:35.925174	chat
56	126	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770524215/chat-storage/audio-1770524209853_aoluvc.ogg	chat-storage/audio-1770524209853_aoluvc	video	t	audio/ogg	109045	audio-1770524209853.ogg	2026-02-07 23:16:55.090612	chat
57	127	https://res.cloudinary.com/dotwbioku/raw/upload/v1770524617/chat-storage/audio-1770524616160_ihritm.ogg	chat-storage/audio-1770524616160_ihritm.ogg	raw	t	audio/ogg	7723	audio-1770524616160.ogg	2026-02-07 23:23:37.082273	chat
58	128	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770524648/chat-storage/audio-1770524643348_kecf7l.ogg	chat-storage/audio-1770524643348_kecf7l	video	t	audio/ogg	67464	audio-1770524643348.ogg	2026-02-07 23:24:11.897139	chat
59	129	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770524854/chat-storage/audio-1770524848928_axf1ec.ogg	chat-storage/audio-1770524848928_axf1ec	video	t	audio/ogg	85837	audio-1770524848928.ogg	2026-02-07 23:27:34.388021	chat
60	131	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770524894/chat-storage/audio-1770524890539_khzue3.ogg	chat-storage/audio-1770524890539_khzue3	video	t	audio/ogg	36520	audio-1770524890539.ogg	2026-02-07 23:28:14.607345	chat
61	132	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770525248/chat-storage/audio-1770525243991_dwgwwf.ogg	chat-storage/audio-1770525243991_dwgwwf	video	t	audio/ogg	54893	audio-1770525243991.ogg	2026-02-07 23:34:08.200222	chat
62	133	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770525283/chat-storage/audio-1770525279344_kqa6st.ogg	chat-storage/audio-1770525279344_kqa6st	video	t	audio/ogg	79068	audio-1770525279344.ogg	2026-02-07 23:34:42.986222	chat
63	134	https://res.cloudinary.com/dotwbioku/raw/upload/v1770525461/chat-storage/audio-1770525459987_f3gfzd.ogg	chat-storage/audio-1770525459987_f3gfzd.ogg	raw	t	audio/ogg	4581	audio-1770525459987.ogg	2026-02-07 23:37:40.889708	chat
64	135	https://res.cloudinary.com/dotwbioku/raw/upload/v1770525673/chat-storage/audio-1770525671823_hbr2vd.ogg	chat-storage/audio-1770525671823_hbr2vd.ogg	raw	t	audio/ogg	10022	audio-1770525671823.ogg	2026-02-07 23:41:12.741543	chat
65	136	https://res.cloudinary.com/dotwbioku/raw/upload/v1770526092/chat-storage/audio-1770526090966_wjbj3z.ogg	chat-storage/audio-1770526090966_wjbj3z.ogg	raw	t	audio/ogg	5634	audio-1770526090966.ogg	2026-02-07 23:48:11.904117	chat
66	137	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770526115/chat-storage/audio-1770526111064_idiz7s.ogg	chat-storage/audio-1770526111064_idiz7s	video	t	audio/ogg	109045	audio-1770526111064.ogg	2026-02-07 23:48:34.855008	chat
67	138	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770526340/chat-storage/audio-1770526335298_ytdits.ogg	chat-storage/audio-1770526335298_ytdits	video	t	audio/ogg	43289	audio-1770526335298.ogg	2026-02-07 23:52:20.082129	chat
68	139	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770526623/chat-storage/audio-1770526619526_mbxqxa.ogg	chat-storage/audio-1770526619526_mbxqxa	video	t	audio/ogg	65530	audio-1770526619526.ogg	2026-02-07 23:57:03.302116	chat
69	141	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770526661/chat-storage/audio-1770526656955_qqolkl.ogg	chat-storage/audio-1770526656955_qqolkl	video	t	audio/ogg	51992	audio-1770526656955.ogg	2026-02-07 23:57:40.829315	chat
70	145	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770526911/chat-storage/audio-1770526906410_pl1rqv.ogg	chat-storage/audio-1770526906410_pl1rqv	video	t	audio/ogg	56827	audio-1770526906410.ogg	2026-02-08 00:01:51.256227	chat
71	146	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770526981/chat-storage/audio-1770526970896_zhboor.ogg	chat-storage/audio-1770526970896_zhboor	video	t	audio/ogg	46190	audio-1770526970896.ogg	2026-02-08 00:03:00.713402	chat
72	147	https://res.cloudinary.com/dotwbioku/raw/upload/v1770527110/chat-storage/audio-1770527108477_mjyjv3.ogg	chat-storage/audio-1770527108477_mjyjv3.ogg	raw	t	audio/ogg	3904	audio-1770527108477.ogg	2026-02-08 00:05:09.284144	chat
73	149	https://res.cloudinary.com/dotwbioku/image/upload/v1770527197/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_pyygul.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_pyygul	image	f	image/jpeg	169350	WhatsApp Image 2025-09-22 at 9.19.00 PM.jpeg	2026-02-08 00:06:36.552173	chat
74	150	https://res.cloudinary.com/dotwbioku/image/upload/v1770527272/chat-storage/image-1770527269818_xswqzj.jpg	chat-storage/image-1770527269818_xswqzj	image	f	image/jpeg	556174	image-1770527269818.jpeg	2026-02-08 00:07:51.382444	chat
75	152	https://res.cloudinary.com/dotwbioku/raw/upload/v1770527405/chat-storage/CARTA_DE_VACACIONES_mnmf0k.docx	chat-storage/CARTA_DE_VACACIONES_mnmf0k.docx	raw	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	14013	CARTA DE VACACIONES .docx	2026-02-08 00:10:04.91186	chat
76	155	https://res.cloudinary.com/dotwbioku/raw/upload/v1770527730/chat-storage/audio-1770527728342_k5qktt.ogg	chat-storage/audio-1770527728342_k5qktt.ogg	raw	t	audio/ogg	7673	audio-1770527728342.ogg	2026-02-08 00:15:29.441361	chat
77	157	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770527959/chat-storage/audio-1770527954980_wvucb2.ogg	chat-storage/audio-1770527954980_wvucb2	video	t	audio/ogg	69398	audio-1770527954980.ogg	2026-02-08 00:19:19.050577	chat
78	159	https://res.cloudinary.com/dotwbioku/raw/upload/v1770529058/chat-storage/audio-1770529056451_bzfyz1.ogg	chat-storage/audio-1770529056451_bzfyz1.ogg	raw	t	audio/ogg	8530	audio-1770529056451.ogg	2026-02-08 00:37:37.212933	chat
79	163	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770530269/chat-storage/audio-1770530226468_mv5jm1.ogg	chat-storage/audio-1770530226468_mv5jm1	video	t	audio/ogg	55860	audio-1770530226468.ogg	2026-02-08 00:57:49.359165	chat
80	166	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770530292/chat-storage/audio-1770530287269_uykcz4.ogg	chat-storage/audio-1770530287269_uykcz4	video	t	audio/ogg	71332	audio-1770530287269.ogg	2026-02-08 00:58:12.40901	chat
81	187	https://res.cloudinary.com/dotwbioku/video/upload/ac_opus/v1770592574/chat-storage/audio-1770592569978_uxxdip.ogg	chat-storage/audio-1770592569978_uxxdip	video	t	audio/ogg	78101	audio-1770592569978.ogg	2026-02-08 18:16:14.758339	chat
82	191	https://res.cloudinary.com/dotwbioku/raw/upload/v1770592723/chat-storage/audio-1770592722238_moriey.ogg	chat-storage/audio-1770592722238_moriey.ogg	raw	t	audio/ogg	9571	audio-1770592722238.ogg	2026-02-08 18:18:43.114622	chat
83	196	https://res.cloudinary.com/dotwbioku/raw/upload/v1770593306/chat-storage/audio-1770593304607_uwfhd1.ogg	chat-storage/audio-1770593304607_uwfhd1.ogg	raw	t	audio/ogg	2102	audio-1770593304607.ogg	2026-02-08 18:28:26.048169	chat
84	197	https://res.cloudinary.com/dotwbioku/raw/upload/v1770593318/chat-storage/audio-1770593317426_itrpax.ogg	chat-storage/audio-1770593317426_itrpax.ogg	raw	t	audio/ogg	10786	audio-1770593317426.ogg	2026-02-08 18:28:38.113439	chat
85	208	https://res.cloudinary.com/dotwbioku/image/upload/v1770690173/chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_h3kjew.jpg	chat-storage/WhatsApp_Image_2025-09-22_at_9.19.00_PM_h3kjew	image	f	image/jpeg	169350	WhatsApp Image 2025-09-22 at 9.19.00 PM.jpeg	2026-02-09 21:22:51.857064	chat
86	208	https://res.cloudinary.com/dotwbioku/video/upload/v1770690174/chat-storage/audio-1770690168201_sygwyi.mp4	chat-storage/audio-1770690168201_sygwyi	video	t	audio/webm	92606	audio-1770690168201.webm	2026-02-09 21:22:52.664044	chat
87	209	https://res.cloudinary.com/dotwbioku/video/upload/v1770690260/chat-storage/audio-1770690254032_hvutag.mp4	chat-storage/audio-1770690254032_hvutag	video	t	audio/webm	68431	audio-1770690254032.webm	2026-02-09 21:24:20.877932	chat
88	210	https://res.cloudinary.com/dotwbioku/video/upload/v1770690456/chat-storage/audio-1770690449647_uzwj2b.mp4	chat-storage/audio-1770690449647_uzwj2b	video	t	audio/webm	61662	audio-1770690449647.webm	2026-02-09 21:27:35.373383	chat
\.


--
-- Data for Name: user_dm_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_dm_reads (user_id, agent_a, agent_b, last_read_at) FROM stdin;
1	1	2	2026-02-09 21:38:50.959985
2	1	2	2026-02-09 23:55:59.618403
\.


--
-- Data for Name: user_global_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_global_reads (user_id, last_read_at) FROM stdin;
1	2026-02-09 22:17:13.115469
2	2026-02-09 23:55:56.417942
\.


--
-- Data for Name: user_group_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_group_reads (user_id, group_id, last_read_at) FROM stdin;
1	1	2026-02-09 22:35:35.574313
2	1	2026-02-09 23:56:12.43809
\.


--
-- Name: agent_dm_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_dm_messages_id_seq', 32, true);


--
-- Name: chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chats_id_seq', 33, true);


--
-- Name: global_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.global_messages_id_seq', 6, true);


--
-- Name: group_chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.group_chats_id_seq', 1, true);


--
-- Name: group_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.group_messages_id_seq', 4, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 211, true);


--
-- Name: quick_phrases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quick_phrases_id_seq', 2, true);


--
-- Name: storage_chat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_chat_id_seq', 88, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- PostgreSQL database dump complete
--

\unrestrict gCdB67GzbMoue89ztH92xh3xR3jbeMfLYeLSIHTslk2xXX00Z81JMyWBLWhiQpU

