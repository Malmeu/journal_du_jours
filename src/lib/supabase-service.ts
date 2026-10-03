import { supabase } from './supabase.ts';
import type { Article, Weather, EditionMetadata, EditorialNote } from '../types/journal.ts';

// Récupération de l'article de Une
export async function getSupabaseHeadlineArticle(): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_headline', 1)
    .order('order_rank', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Article;
}

// Récupération des 3 brèves
export async function getSupabaseBriefArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_brief', 1)
    .order('order_rank', { ascending: true })
    .limit(3);

  if (error || !data) return [];
  return data as Article[];
}

// Récupération des articles mis en avant (hors Une et hors brèves)
export async function getSupabaseFeaturedArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_headline', 0)
    .eq('is_brief', 0)
    .order('order_rank', { ascending: true });

  if (error || !data) return [];
  return data as Article[];
}

// Récupération par rubrique
export async function getSupabaseArticlesBySection(section: string): Promise<Article[]> {
  let query = supabase.from('articles').select('*');
  if (section && section !== 'tous') {
    query = query.eq('section', section);
  }
  const { data, error } = await query.order('id', { ascending: false });

  if (error || !data) return [];
  return data as Article[];
}

// Récupération d'un article par son slug
export async function getSupabaseArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as Article;
}

// Récupération de tous les articles
export async function getSupabaseAllArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('id', { ascending: false });

  if (error || !data) return [];
  return data as Article[];
}

// Insertion d'un article
export async function insertSupabaseArticle(article: Partial<Article>) {
  return await supabase.from('articles').insert([article]).select().single();
}

// Mise à jour de l'image d'un article
export async function updateSupabaseArticleImage(id: number, imageUrl: string | null, imageCaption = '') {
  return await supabase
    .from('articles')
    .update({ image_url: imageUrl, image_caption: imageCaption })
    .eq('id', id);
}

// Suppression d'un article
export async function deleteSupabaseArticle(id: number) {
  return await supabase.from('articles').delete().eq('id', id);
}

// Recherche par source_url pour dédoublonnage RSS
export async function getSupabaseArticleBySourceUrl(sourceUrl: string): Promise<Article | null> {
  if (!sourceUrl) return null;
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('source_url', sourceUrl)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Article;
}

// Métadonnées de l'édition
export async function getSupabaseEditionMetadata(): Promise<EditionMetadata | null> {
  const { data, error } = await supabase
    .from('edition_metadata')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as EditionMetadata;
}

// Météo
export async function getSupabaseWeather(): Promise<Weather | null> {
  const { data, error } = await supabase
    .from('weather')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Weather;
}

// Notes éditoriales (priorités, à ne pas oublier)
export async function getSupabaseEditorialNotes() {
  const { data: priorities } = await supabase
    .from('editorial_notes')
    .select('*')
    .eq('section_type', 'priority')
    .order('order_rank', { ascending: true });

  const { data: todos } = await supabase
    .from('editorial_notes')
    .select('*')
    .eq('section_type', 'todo')
    .order('order_rank', { ascending: true });

  return {
    priorities: (priorities || []) as EditorialNote[],
    todos: (todos || []) as EditorialNote[]
  };
}

// Suivi de la synchronisation RSS
export async function recordSupabaseSyncSuccess() {
  const todayStr = new Intl.DateTimeFormat('fr-CA').format(new Date());
  return await supabase.from('sync_log').insert([
    { last_sync_date: todayStr, last_sync_timestamp: Date.now() }
  ]);
}
