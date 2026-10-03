-- ============================================================================
-- SCHÉMA SUPABASE POSTGRESQL — JOURNAL D'ACTUALITÉS ALGÉRIE & MONDE
-- À exécuter dans le SQL Editor de votre tableau de bord Supabase
-- ============================================================================

-- 1. Table des articles
CREATE TABLE IF NOT EXISTS public.articles (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  section TEXT NOT NULL, -- 'algerie', 'monde', 'sport', 'art-culture', 'economie-tech', 'tribune'
  category_tag TEXT NOT NULL,
  author TEXT NOT NULL,
  published_date TEXT NOT NULL,
  read_time TEXT DEFAULT '3 min',
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  image_caption TEXT,
  is_headline INT DEFAULT 0,
  is_brief INT DEFAULT 0,
  is_featured INT DEFAULT 1,
  order_rank INT DEFAULT 0,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour accélérer les recherches de slug et rubriques
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_section ON public.articles(section);
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON public.articles(source_url);

-- 2. Table des métadonnées de l'édition
CREATE TABLE IF NOT EXISTS public.edition_metadata (
  id BIGSERIAL PRIMARY KEY,
  paper_name TEXT NOT NULL,
  motto TEXT NOT NULL,
  edition_number TEXT NOT NULL,
  edition_date TEXT NOT NULL,
  edition_tag TEXT NOT NULL,
  intent_of_day TEXT NOT NULL,
  top_left_banner TEXT NOT NULL,
  top_right_banner TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table de la météo
CREATE TABLE IF NOT EXISTS public.weather (
  id BIGSERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  temp INT NOT NULL,
  condition TEXT NOT NULL,
  wind TEXT NOT NULL,
  temp_min INT NOT NULL,
  temp_max INT NOT NULL,
  note TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table des notes éditoriales (priorités, à ne pas oublier)
CREATE TABLE IF NOT EXISTS public.editorial_notes (
  id BIGSERIAL PRIMARY KEY,
  section_type TEXT NOT NULL, -- 'priority', 'todo', 'quote'
  item_num TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  order_rank INT DEFAULT 0
);

-- 5. Table de log de synchronisation RSS
CREATE TABLE IF NOT EXISTS public.sync_log (
  id BIGSERIAL PRIMARY KEY,
  last_sync_date TEXT NOT NULL,
  last_sync_timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edition_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Politiques pour la lecture publique (accessible à tous les lecteurs du journal)
CREATE POLICY "Lecture publique articles" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Lecture publique metadata" ON public.edition_metadata FOR SELECT USING (true);
CREATE POLICY "Lecture publique weather" ON public.weather FOR SELECT USING (true);
CREATE POLICY "Lecture publique notes" ON public.editorial_notes FOR SELECT USING (true);
CREATE POLICY "Lecture publique sync_log" ON public.sync_log FOR SELECT USING (true);

-- Politiques pour l'écriture avec la clé API (insertion, modification, suppression)
CREATE POLICY "Écriture articles" ON public.articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Écriture metadata" ON public.edition_metadata FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Écriture weather" ON public.weather FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Écriture notes" ON public.editorial_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Écriture sync_log" ON public.sync_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- DONNÉES INITIALES (SEED DE DÉMARRAGE)
-- ============================================================================

INSERT INTO public.edition_metadata (
  paper_name, motto, edition_number, edition_date, edition_tag, intent_of_day, top_left_banner, top_right_banner
) VALUES (
  'Malmeu Matin — Algérie & Monde',
  'Le grand quotidien d''actualité politique, géopolitique, économie, tech, sport et art.',
  'NO 0276',
  'SAMEDI 3 OCTOBRE 2026',
  'ÉDITION NATIONALE & INTERNATIONALE',
  'Édition du jour : Équilibres géopolitiques mondiaux, réformes nationales, culture, sport et innovations.',
  'LE QUOTIDIEN D''INFORMATION',
  'POLITIQUE, GÉOPOLITIQUE, ÉCONOMIE, SPORT & CULTURE'
) ON CONFLICT DO NOTHING;

INSERT INTO public.weather (city, temp, condition, wind, temp_min, temp_max, note)
VALUES ('ALGER', 26, 'COUVERT', 'Couvert, avec un vent autour de 7 km/h.', 24, 28, 'Conditions calmes pour commencer la journée.')
ON CONFLICT DO NOTHING;

INSERT INTO public.editorial_notes (section_type, item_num, title, subtitle, order_rank)
VALUES 
  ('priority', '01', 'Revue des annonces de Sidi Abdellah et du pôle IA', '', 1),
  ('priority', '02', 'Tester une nouvelle API ou solution SaaS locale', '', 2),
  ('todo', '01', 'Veille appels à projets et subventions startups', '', 1),
  ('todo', '02', 'Rapport d''analyse sur les débits fibre en Méditerranée', '', 2)
ON CONFLICT DO NOTHING;

-- Grand sujet de Une
INSERT INTO public.articles (
  slug, title, subtitle, section, category_tag, author, published_date,
  read_time, summary, content, image_url, image_caption, is_headline, is_brief, is_featured, order_rank
) VALUES (
  'universite-alger-3-societe-capital-risque',
  'L''Université Alger 3 lance la première société universitaire de capital-risque d''Algérie',
  'Une étape charnière pour le financement précoce des startups issues de la recherche académique et des laboratoires nationaux.',
  'economie-tech',
  'ÉCONOMIE / ÉCOSYSTÈME STARTUPS DZ / 21:31',
  'Rédaction Économie & Innovation',
  'Samedi 3 Octobre 2026',
  '5 min de lecture',
  'L''Université Alger 3 marque un tournant historique dans le rapprochement entre le monde universitaire et l''investissement à risque en fondant son propre véhicule d''investissement.',
  '## Un rapprochement inédit entre la recherche et le capital-risque\n\nC''est une première nationale qui pourrait transformer en profondeur la valorisation de la recherche scientifique en Algérie.\n\nDotée d''une première enveloppe stratégique, cette société de capital-risque interviendra dès le stade de pré-amorçage pour propulser l''IA, l''Agritech et la Fintech.',
  '/images/alger_headline.jpg',
  'Gravure de presse — Alger, carrefour d''innovation et d''intelligence artificielle.',
  1, 0, 1, 1
) ON CONFLICT (slug) DO NOTHING;
