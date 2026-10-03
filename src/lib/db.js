import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { supabase } from './supabase.ts';

// Gestion de l'environnement Vercel Serverless (process.cwd est en lecture seule, seul /tmp est inscriptible)
const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
let DB_DIR = path.resolve(process.cwd(), 'data');
let DB_PATH = path.join(DB_DIR, 'journal.db');

if (isVercel) {
  DB_DIR = '/tmp/mon_journal_data';
  const tmpDbPath = path.join(DB_DIR, 'journal.db');
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    // Copie de la base initiale si présente dans le projet
    const originalDb = path.resolve(process.cwd(), 'data', 'journal.db');
    if (fs.existsSync(originalDb) && !fs.existsSync(tmpDbPath)) {
      fs.copyFileSync(originalDb, tmpDbPath);
    }
  } catch (err) {
    console.warn('Notice Vercel FS setup:', err);
  }
  DB_PATH = tmpDbPath;
} else {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

let db;
try {
  db = new DatabaseSync(DB_PATH);
  // Activation du mode WAL pour de meilleures performances
  db.exec(`PRAGMA journal_mode = WAL;`);
} catch (e) {
  console.warn('Fallback SQLite mémoire:', e);
  db = new DatabaseSync(':memory:');
}

// Schéma des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS edition_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_name TEXT NOT NULL,
    motto TEXT NOT NULL,
    edition_number TEXT NOT NULL,
    edition_date TEXT NOT NULL,
    edition_tag TEXT NOT NULL,
    intent_of_day TEXT NOT NULL,
    top_left_banner TEXT NOT NULL,
    top_right_banner TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_sync_date TEXT,
    last_sync_timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    temp INTEGER NOT NULL,
    condition TEXT NOT NULL,
    wind TEXT NOT NULL,
    temp_min INTEGER NOT NULL,
    temp_max INTEGER NOT NULL,
    note TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS editorial_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_type TEXT NOT NULL, /* 'priority', 'todo', 'quote' */
    item_num TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    order_rank INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    section TEXT NOT NULL, /* 'algerie', 'monde', 'economie-tech', 'culture-societe', 'tribune' */
    category_tag TEXT NOT NULL,
    author TEXT NOT NULL,
    published_date TEXT NOT NULL,
    read_time TEXT NOT NULL DEFAULT '3 min',
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    image_caption TEXT,
    is_headline INTEGER DEFAULT 0,
    is_brief INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    order_rank INTEGER DEFAULT 0,
    source_url TEXT
  );
`);

// Migration rétroactive pour source_url si table déjà existante
try {
  db.exec(`ALTER TABLE articles ADD COLUMN source_url TEXT;`);
} catch (e) {
  // Colonne déjà existante
}

// Initialisation des données si la base est vide
function seedInitialData() {
  const metadataCount = db.prepare('SELECT COUNT(*) as count FROM edition_metadata').get();
  if (metadataCount.count === 0) {
    db.prepare(`
      INSERT INTO edition_metadata (
        paper_name, motto, edition_number, edition_date, edition_tag, intent_of_day, top_left_banner, top_right_banner
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Malmeu Matin — Algérie & Monde',
      "Le quotidien d'actualité politique, géopolitique, économie, tech, sport et art.",
      'NO 0276',
      'SAMEDI 3 OCTOBRE 2026',
      'ÉDITION NATIONALE & INTERNATIONALE',
      'Édition du jour : Équilibres géopolitiques mondiaux, réformes nationales, culture, sport et innovations.',
      'LE QUOTIDIEN D\'INFORMATION',
      'POLITIQUE, GÉOPOLITIQUE, ÉCONOMIE, SPORT & CULTURE'
    );
  } else {
    // Mettre à jour l'en-tête pour refléter les nouvelles thématiques
    db.prepare(`
      UPDATE edition_metadata SET
        paper_name = ?,
        motto = ?,
        top_left_banner = ?,
        top_right_banner = ?
      WHERE id = 1
    `).run(
      'Malmeu Matin — Algérie & Monde',
      "Le quotidien d'actualité politique, géopolitique, économie, tech, sport et art.",
      "LE QUOTIDIEN D'INFORMATION",
      'POLITIQUE, GÉOPOLITIQUE, ÉCONOMIE, SPORT & CULTURE'
    );
  }

  const weatherCount = db.prepare('SELECT COUNT(*) as count FROM weather').get();
  if (weatherCount.count === 0) {
    db.prepare(`
      INSERT INTO weather (city, temp, condition, wind, temp_min, temp_max, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ALGER',
      26,
      'COUVERT',
      'Couvert, avec un vent autour de 7 km/h.',
      24,
      28,
      'Conditions calmes pour commencer la journée.'
    );
  }

  const notesCount = db.prepare('SELECT COUNT(*) as count FROM editorial_notes').get();
  if (notesCount.count === 0) {
    const insertNote = db.prepare(`
      INSERT INTO editorial_notes (section_type, item_num, title, subtitle, order_rank)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertNote.run('priority', '01', 'Revue des annonces de Sidi Abdellah et du pôle IA', '', 1);
    insertNote.run('priority', '02', 'Tester une nouvelle API ou solution SaaS locale', '', 2);
    insertNote.run('todo', '01', 'Veille appels à projets et subventions startups', '', 1);
    insertNote.run('todo', '02', 'Rapport d\'analyse sur les débits fibre en Méditerranée', '', 2);
  }

  const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get();
  if (articleCount.count === 0) {
    const insertArticle = db.prepare(`
      INSERT INTO articles (
        slug, title, subtitle, section, category_tag, author, published_date,
        read_time, summary, content, image_url, image_caption, is_headline, is_brief, is_featured, order_rank
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Article de Une (Headline)
    insertArticle.run(
      'universite-alger-3-societe-capital-risque',
      "L'Université Alger 3 lance la première société universitaire de capital-risque d'Algérie",
      "Une étape charnière pour le financement précoce des startups issues de la recherche académique et des laboratoires nationaux.",
      'economie-tech',
      'ÉCONOMIE / ÉCOSYSTÈME STARTUPS DZ / 21:31',
      'Rédaction Économie & Innovation',
      'Vendredi 2 Octobre 2026',
      '5 min de lecture',
      "L'Université Alger 3 marque un tournant historique dans le rapprochement entre le monde universitaire et l'investissement à risque en fondant son propre véhicule d'investissement pour les projets technologiques.",
      `## Un rapprochement inédit entre la recherche et le capital-risque

C'est une première nationale qui pourrait transformer en profondeur la valorisation de la recherche scientifique en Algérie. L'Université d'Alger 3 a officiellement annoncé la constitution de sa propre société par actions de capital-risque, dotée d'une gouvernance mixte associant universitaires, entrepreneurs chevronnés et gestionnaires de fonds institutionnels.

Cette initiative pionnière vise à combler le fossé traditionnel qui sépare les découvertes de laboratoire de leur mise sur le marché. Trop souvent, les prototypes élaborés par les étudiants-chercheurs et les enseignants restaient cantonnés au rang de mémoires ou de démonstrateurs techniques, faute de capitaux d'amorçage adaptés à la prise de risque technologique.

### Un fonds d'amorçage dédié aux brevets universitaires

Dotée d'une première enveloppe stratégique abondée conjointement par le ministère de l'Enseignement Supérieur, des banques publiques et des business angels de la diaspora, cette société de capital-risque interviendra dès le stade de pré-amorçage (*pre-seed*) :

> « Nous ne voulons plus que nos diplômés les plus brillants soient contraints d'abandonner leur propriété intellectuelle ou de partir à l'étranger faute de quelques millions de dinars pour tester leur viabilité commerciale. Ce véhicule financier leur offre une rampe de lancement directe depuis le campus. »
> — *Pr. K. Bensalem, recteur et initiateur du projet.*

Les domaines prioritaires ciblés pour les premiers investissements couvrent :
1. **L'Intelligence Artificielle appliquée** : traitement du langage naturel pour les dialectes régionaux et solutions d'optimisation logistique portuaire.
2. **L'Agritech et la gestion hydrique** : capteurs connectés basse consommation pour les périmètres irrigués des hauts plateaux et du Sahara.
3. **La Fintech et la conformité** : infrastructures de paiement alternatif et micro-assurance numérique.

### Une dynamique pour l'ensemble du territoire

Le ministre de l'Économie de la Connaissance a salué cette avancée, soulignant qu'elle servira d'étalon pour d'autres universités à Constantine, Oran, Ouargla et Sétif. La création d'un cadre réglementaire adapté, autorisant les universités à détenir des participations directes dans des entreprises dérivées (*spin-offs*), constitue le catalyseur législatif attendu depuis plusieurs années par les acteurs de l'écosystème.`,
      '/images/alger_headline.jpg',
      "Gravure de presse — Alger, carrefour d'innovation et d'intelligence artificielle.",
      1, 0, 1, 1
    );

    // 2. En bref 1
    insertArticle.run(
      'fibre-optique-alger-capitales-gigabits',
      "Fibre optique : Alger rejoint le club mondial des capitales gigabits",
      "Le déploiement accéléré du FTTH place Alger parmi les métropoles les mieux connectées du continent.",
      'economie-tech',
      'SCIENCES / INFRASTRUCTURES & NUMÉRIQUE DZ / 09:04',
      'Africtelegraph',
      '2 Octobre 2026',
      '2 min',
      "Fibre optique : Alger rejoint le club mondial des capitales gigabits grâce à l'interconnexion sous-marine et l'extension du réseau urbain haute capacité.",
      `Le réseau de fibre optique jusqu'au domicile (FTTH) d'Alger vient de franchir le cap symbolique du million de foyers raccordables en débit symétrique gigabit. 

Selon les derniers relevés de l'Autorité de régulation (ARPCE), la vitesse médiane mesurée a augmenté de 140 % en un an. Cette montée en puissance s'accompagne d'une réduction drastique de la latence vers les nœuds d'échange européens via les câbles sous-marins Medex et Alval.`,
      null, null,
      0, 1, 0, 2
    );

    // 3. En bref 2
    insertArticle.run(
      'sante-numerique-tunisie-algerie-libye-mauritanie',
      "Santé numérique : la Tunisie renforce sa coopération avec l'Algérie, la Libye et la Mauritanie",
      "Vers un dossier médical maghrébin partagé et des protocoles de télémédecine transfrontaliers.",
      'monde',
      'SCIENCES / INFRASTRUCTURES & NUMÉRIQUE DZ / 08:00',
      'La Presse de Tunisie',
      '2 Octobre 2026',
      '3 min',
      "Santé numérique : la Tunisie renforce sa coopération avec l'Algérie, la Libye et la Mauritanie pour bâtir une infrastructure commune de télémédecine.",
      `Les représentants des ministères de la Santé et du Numérique de Tunis, d'Alger, de Tripoli et de Nouakchott ont convenu d'un protocole d'interopérabilité pour les urgences médicales et le suivi des patients transfrontaliers.

Ce projet inclut le partage sécurisé des données de radiologie et la formation conjointe d'ingénieurs biomédicaux à l'exploitation des systèmes d'aide au diagnostic basés sur l'apprentissage automatique.`,
      null, null,
      0, 1, 0, 3
    );

    // 4. En bref 3
    insertArticle.run(
      'sidi-abdellah-coeur-technologique-ia-algerienne',
      "Sidi Abdellah, futur cœur technologique de l'IA algérienne",
      "Le cyberparc et l'École nationale supérieure d'IA mutualisent un supercalculateur haute performance.",
      'algerie',
      'SCIENCES / INFRASTRUCTURES & NUMÉRIQUE DZ / 13:30',
      'Le Soir d\'Algérie',
      '2 Octobre 2026',
      '2 min',
      "Sidi Abdellah, futur cœur technologique de l'IA algérienne avec la mise en service du pôle de calcul intensif partagé.",
      `La ville nouvelle de Sidi Abdellah consolide sa vocation de cluster technologique. L'École nationale supérieure d'intelligence artificielle (ENSIA) et les startups du cyberparc disposent désormais d'un accès direct à une grappe de calcul GPU souveraine.

Cet équipement permet d'entraîner localement des modèles de traitement automatique des langues et des simulations industrielles pour le raffinage et la logistique.`,
      null, null,
      0, 1, 0, 4
    );

    // 5. Article IA & Tech
    insertArticle.run(
      'algerie-oussama-djaidri-ia-developpeurs',
      "Algérie : Oussama Djaidri allie pratique et IA pour former les développeurs de demain",
      "Une approche pédagogique immersive qui repense la formation d'ingénieurs à l'ère des agents autonomes et du pair programming.",
      'economie-tech',
      'IA & TECH / FORMATION / 11:20',
      'We Are Tech',
      '2 Octobre 2026',
      '4 min',
      "Algérie : Oussama Djaidri allie pratique et IA pour former les développeurs de demain avec des programmes axés sur l'autonomie et le code augmenté.",
      `À l'heure où les grands modèles de langage redéfinissent la façon d'écrire des logiciels, l'apprentissage de la programmation en Algérie vit sa propre révolution. Oussama Djaidri, formateur et architecte logiciel réputé de la scène tech nationale, a mis au point une méthode hybride qui place l'assistant IA non pas comme un substitut, mais comme un tuteur d'ingénierie en temps réel.

### De la syntaxe brute à l'architecture de systèmes

« Dans le monde d'aujourd'hui, apprendre par cœur la syntaxe d'une boucle n'a plus grand sens », explique-t-il lors d'un atelier à Alger. « Ce qui compte, c'est la rigueur conceptuelle : savoir poser un problème, décomposer une architecture, tester les cas limites et challenger les propositions de l'IA. »

Les cohortes formées travaillent sur des projets réels d'entreprises locales :
- Conception d'APIs résilientes pour les services de livraison urbaine
- Déploiement d'architectures événementielles pour les plateformes e-commerce
- Intégration de modèles de transcription et de synthèse vocale pour le darija algérien

Cette approche suscite un engouement massif, attirant à la fois des étudiants universitaires et des professionnels en reconversion vers les métiers du cloud et de l'ingénierie logicielle.`,
      '/images/tech_developers.jpg',
      "Gravure d'atelier — Ingénieurs et étudiants développant des systèmes intelligents à Alger.",
      0, 0, 1, 5
    );

    // 6. Article Monde & Géopolitique des Câbles
    insertArticle.run(
      'mediterranee-la-guerre-invisible-des-cables-sous-marins',
      "Méditerranée : La diplomatie invisible des câbles sous-marins et des flux de données mondiaux",
      "Entre l'Afrique du Nord et l'Europe, les fonds marins concentrent les nouveaux enjeux de souveraineté numérique et de résilience continentale.",
      'monde',
      'INTERNATIONAL / GÉOPOLITIQUE DES RÉSEAUX / 17:45',
      'Envoyé Spécial International',
      '1 Octobre 2026',
      '6 min',
      "Analyse approfondie de la cartographie sous-marine en Méditerranée : comment l'Algérie et le pourtour méditerranéen s'affirment comme des carrefours incontournables des autoroutes de l'information.",
      `## L'épine dorsale silencieuse de la mondialisation

Alors que les satellites et l'espace captent l'attention médiatique, 99 % des communications intercontinentales transitent toujours par d'infimes faisceaux de fibres de verre reposant sur les fonds marins. La Méditerranée, berceau historique du commerce maritime, s'est imposée comme le canal le plus dense de transit de données entre l'Europe, le continent africain, le Moyen-Orient et l'Asie.

Dans cette nouvelle géographie du cyberespace, l'Algérie tire parti de ses 1 200 kilomètres de littoral pour multiplier les points d'atterrissement stratégiques. Les stations d'Alger, d'Annaba et d'Oran ne se contentent plus de sécuriser la bande passante nationale : elles deviennent des relais incontournables pour interconnecter les pays d'Afrique subsaharienne au cœur névralgique de Marseille et de Gênes.

### Des investissements colossaux en redondance

Face aux risques de coupures accidentelles causées par le chalutage ou les mouvements sismiques, les consortiums internationaux ont déployé des routes sous-marines de nouvelle génération dotées de répéteurs optiques amplifiés et d'un routage maillé autonome.

> « La souveraineté d'une nation au XXIe siècle ne se mesure pas seulement à ses frontières terrestres, mais à sa capacité à maintenir ses canaux numériques ouverts quoi qu'il advienne. »
> — *Extrait du rapport stratégique sur les infrastructures critiques méditerranéennes.*

Les observateurs soulignent également la montée en puissance de data centers neutres à Alger, permettant de garder une part croissante des données générées localement sur le sol national, réduisant ainsi la dépendance envers les serveurs distants.`,
      '/images/world_fiber.jpg',
      "Carte gravée — Réseau sous-marin en Méditerranée reliant l'Algérie et l'Europe.",
      0, 0, 1, 6
    );

    // 7. Tribune / Fenêtre libre
    insertArticle.run(
      'tribune-matinee-productive-souverainete-numerique',
      "Fenêtre libre : Matinée productive et réflexions sur l'artisanat du code",
      "Pourquoi la sobriété numérique et la clarté typographique rendent la pensée plus libre et féconde.",
      'tribune',
      'FENÊTRE LIBRE / CHRONIQUE / 07:15',
      'Chroniqueur du Matin',
      '2 Octobre 2026',
      '3 min',
      "Chronique d'une matinée de travail au calme : redécouvrir la valeur du temps long, de l'attention sans distraction et d'une presse qui invite à la réflexion.",
      `Il y a un charme incomparable à ouvrir un journal au petit matin, lorsque la ville s'éveille à peine et que les bruits de la rue se mêlent au murmure du café qui passe.

Dans un monde saturé de notifications éphémères et de flux infinis conçus pour fragmenter notre concentration, l'expérience d'un journal — qu'il soit d'encre et de papier ou composé avec la même pureté sur un écran sobre — est un acte de résistance bienveillante.

Lire sans distraction, c'est offrir à son esprit l'espace nécessaire pour relier des faits apparemment distants, pour comprendre comment un fonds d'investissement à Alger 3 résonne avec une négociation de câbles sous-marins à Marseille, ou comment un algorithme open source peut vivifier l'artisanat de nos médinas.

Que cette matinée soit pour vous productive, sereine et fertile.`,
      null, null,
      0, 0, 0, 7
    );
  }
}

// Exécuter le seed au chargement
seedInitialData();

// Requêtes d'accès
export function getEditionMetadata() {
  return db.prepare('SELECT * FROM edition_metadata ORDER BY id DESC LIMIT 1').get();
}

export function updateEditionMetadata(data) {
  return db.prepare(`
    UPDATE edition_metadata
    SET paper_name = ?, motto = ?, edition_number = ?, edition_date = ?, edition_tag = ?, intent_of_day = ?
    WHERE id = 1
  `).run(
    data.paper_name, data.motto, data.edition_number, data.edition_date, data.edition_tag, data.intent_of_day
  );
}

export function getWeather() {
  return db.prepare('SELECT * FROM weather ORDER BY id DESC LIMIT 1').get();
}

export function updateWeather(data) {
  return db.prepare(`
    UPDATE weather
    SET temp = ?, condition = ?, wind = ?, temp_min = ?, temp_max = ?, note = ?
    WHERE id = 1
  `).run(
    data.temp, data.condition, data.wind, data.temp_min, data.temp_max, data.note
  );
}

export function getEditorialNotes() {
  const priorities = db.prepare("SELECT * FROM editorial_notes WHERE section_type = 'priority' ORDER BY order_rank ASC").all();
  const todos = db.prepare("SELECT * FROM editorial_notes WHERE section_type = 'todo' ORDER BY order_rank ASC").all();
  return { priorities, todos };
}

export function getHeadlineArticle() {
  return db.prepare('SELECT * FROM articles WHERE is_headline = 1 ORDER BY order_rank ASC LIMIT 1').get();
}

export function getBriefArticles() {
  return db.prepare('SELECT * FROM articles WHERE is_brief = 1 ORDER BY order_rank ASC LIMIT 3').all();
}

// Filtre éditorial : Ne jamais parler d'Israël ou du Maroc, sauf si lien direct avec l'Algérie
export function passesGeopoliticalFilter(article) {
  if (!article) return false;
  const fullText = `${article.title || ''} ${article.summary || ''} ${article.content || ''}`.toLowerCase();
  const sensitiveRegex = /\b(isra[eë]l|isra[eë]lien(s|ne|nes)?|tel[\s\-]aviv|tsahal|netanyahou|netanyahu|maroc|marocain(s|e|es)?|rabat|makhzen)\b/i;
  
  if (sensitiveRegex.test(fullText)) {
    const algeriaRegex = /\b(alg[eé]rie|alg[eé]rien(s|ne|nes)?|alger)\b/i;
    return algeriaRegex.test(fullText);
  }
  return true;
}

export function getFeaturedArticles() {
  const list = db.prepare('SELECT * FROM articles WHERE is_headline = 0 AND is_brief = 0 ORDER BY order_rank ASC').all();
  return list.filter(passesGeopoliticalFilter);
}

export function getArticlesBySection(section) {
  let list;
  if (!section || section === 'tous') {
    list = db.prepare('SELECT * FROM articles ORDER BY order_rank ASC, id DESC').all();
  } else {
    list = db.prepare('SELECT * FROM articles WHERE section = ? ORDER BY order_rank ASC, id DESC').all(section);
  }
  return list.filter(passesGeopoliticalFilter);
}

export function getArticleBySlug(slug) {
  return db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
}

export function getAllArticles() {
  return db.prepare('SELECT * FROM articles ORDER BY order_rank ASC, id DESC').all();
}

export function insertArticle(data) {
  const stmt = db.prepare(`
    INSERT INTO articles (
      slug, title, subtitle, section, category_tag, author, published_date,
      read_time, summary, content, image_url, image_caption, is_headline, is_brief, is_featured, order_rank, source_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.slug, data.title, data.subtitle || '', data.section, data.category_tag,
    data.author, data.published_date, data.read_time || '3 min',
    data.summary, data.content, data.image_url || null, data.image_caption || '',
    data.is_headline ? 1 : 0, data.is_brief ? 1 : 0, data.is_featured ? 1 : 0, data.order_rank || 0,
    data.source_url || null
  );

  // Synchronisation Supabase en arrière-plan
  try {
    supabase.from('articles').upsert({
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle || null,
      section: data.section,
      category_tag: data.category_tag,
      author: data.author,
      published_date: data.published_date,
      read_time: data.read_time || '3 min',
      summary: data.summary,
      content: data.content,
      image_url: data.image_url || null,
      image_caption: data.image_caption || '',
      is_headline: data.is_headline ? 1 : 0,
      is_brief: data.is_brief ? 1 : 0,
      is_featured: data.is_featured ? 1 : 0,
      order_rank: data.order_rank || 0,
      source_url: data.source_url || null
    }, { onConflict: 'slug' }).then(({ error }) => {
      if (error) console.error('Erreur synchro Supabase insertArticle:', error.message);
    });
  } catch (e) {
    console.error('Exception synchro Supabase:', e);
  }

  return result;
}

export function updateArticle(id, data) {
  const stmt = db.prepare(`
    UPDATE articles SET
      slug = ?, title = ?, subtitle = ?, section = ?, category_tag = ?, author = ?, published_date = ?,
      read_time = ?, summary = ?, content = ?, image_url = ?, image_caption = ?, is_headline = ?, is_brief = ?, is_featured = ?, order_rank = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    data.slug, data.title, data.subtitle || '', data.section, data.category_tag,
    data.author, data.published_date, data.read_time || '3 min',
    data.summary, data.content, data.image_url || null, data.image_caption || '',
    data.is_headline ? 1 : 0, data.is_brief ? 1 : 0, data.is_featured ? 1 : 0, data.order_rank || 0,
    id
  );

  // Synchronisation Supabase en arrière-plan
  try {
    const existing = db.prepare('SELECT slug FROM articles WHERE id = ?').get(id);
    if (existing?.slug) {
      supabase.from('articles').update({
        title: data.title,
        subtitle: data.subtitle || null,
        section: data.section,
        category_tag: data.category_tag,
        author: data.author,
        published_date: data.published_date,
        read_time: data.read_time || '3 min',
        summary: data.summary,
        content: data.content,
        image_url: data.image_url || null,
        image_caption: data.image_caption || '',
        is_headline: data.is_headline ? 1 : 0,
        is_brief: data.is_brief ? 1 : 0,
        is_featured: data.is_featured ? 1 : 0,
        order_rank: data.order_rank || 0
      }).eq('slug', existing.slug).then(({ error }) => {
        if (error) console.error('Erreur synchro Supabase updateArticle:', error.message);
      });
    }
  } catch (e) {
    console.error('Exception synchro Supabase update:', e);
  }

  return result;
}

export function deleteArticle(id) {
  const existing = db.prepare('SELECT slug FROM articles WHERE id = ?').get(id);
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id);

  // Synchronisation Supabase en arrière-plan
  if (existing?.slug) {
    try {
      supabase.from('articles').delete().eq('slug', existing.slug).then(({ error }) => {
        if (error) console.error('Erreur synchro Supabase deleteArticle:', error.message);
      });
    } catch (e) {
      console.error('Exception synchro Supabase delete:', e);
    }
  }

  return result;
}

export function updateArticleImage(id, imageUrl, imageCaption = '') {
  const existing = db.prepare('SELECT slug FROM articles WHERE id = ?').get(id);
  const result = db.prepare('UPDATE articles SET image_url = ?, image_caption = ? WHERE id = ?').run(imageUrl, imageCaption, id);

  // Synchronisation Supabase en arrière-plan
  if (existing?.slug) {
    try {
      supabase.from('articles').update({
        image_url: imageUrl,
        image_caption: imageCaption
      }).eq('slug', existing.slug).then(({ error }) => {
        if (error) console.error('Erreur synchro Supabase updateArticleImage:', error.message);
      });
    } catch (e) {
      console.error('Exception synchro Supabase image:', e);
    }
  }

  return result;
}

export function getArticleBySourceUrl(sourceUrl) {
  if (!sourceUrl) return null;
  return db.prepare('SELECT * FROM articles WHERE source_url = ? LIMIT 1').get(sourceUrl);
}

export function setArticleHeadline(id) {
  // Remettre à zéro l'ancien headline
  db.prepare('UPDATE articles SET is_headline = 0').run();
  return db.prepare('UPDATE articles SET is_headline = 1 WHERE id = ?').run(id);
}

// Helpers de synchronisation automatique quotidienne
export function getLastSync() {
  return db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT 1').get();
}

export function recordSyncSuccess() {
  const todayStr = new Intl.DateTimeFormat('fr-CA').format(new Date()); // YYYY-MM-DD
  return db.prepare(`
    INSERT INTO sync_log (last_sync_date, last_sync_timestamp)
    VALUES (?, ?)
  `).run(todayStr, Date.now());
}

export function isSyncDue(maxAgeHours = 4) {
  const last = getLastSync();
  if (!last) return true;
  
  const todayStr = new Intl.DateTimeFormat('fr-CA').format(new Date());
  if (last.last_sync_date !== todayStr) return true; // Nouveau jour !

  // Plus de X heures écoulées depuis la dernière synchro
  const elapsedMs = Date.now() - (last.last_sync_timestamp || 0);
  return elapsedMs > maxAgeHours * 60 * 60 * 1000;
}

// Met à jour automatiquement la date du jour de l'édition
export function ensureTodayEdition() {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const todayFormatted = formatter.format(new Date()).toUpperCase();

  const current = getEditionMetadata();
  if (current && current.edition_date !== todayFormatted) {
    db.prepare('UPDATE edition_metadata SET edition_date = ? WHERE id = ?').run(todayFormatted, current.id);
  }
}


