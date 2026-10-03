import { supabase } from './supabase.ts';
import { getAllArticles, getEditionMetadata, getWeather, getEditorialNotes } from './db.js';

export async function uploadAllToSupabase() {
  console.log('🔄 Démarrage du transfert vers Supabase...');

  // 1. Métadonnées
  const metadata = getEditionMetadata();
  if (metadata) {
    const { error: metaErr } = await supabase.from('edition_metadata').upsert({
      id: 1,
      paper_name: metadata.paper_name,
      motto: metadata.motto,
      edition_number: metadata.edition_number,
      edition_date: metadata.edition_date,
      edition_tag: metadata.edition_tag,
      intent_of_day: metadata.intent_of_day,
      top_left_banner: metadata.top_left_banner,
      top_right_banner: metadata.top_right_banner
    });
    if (metaErr) console.warn('Erreur metadata Supabase:', metaErr.message);
    else console.log('✅ Métadonnées transférées.');
  }

  // 2. Météo
  const weather = getWeather();
  if (weather) {
    const { error: wErr } = await supabase.from('weather').upsert({
      id: 1,
      city: weather.city,
      temp: weather.temp,
      condition: weather.condition,
      wind: weather.wind,
      temp_min: weather.temp_min,
      temp_max: weather.temp_max,
      note: weather.note
    });
    if (wErr) console.warn('Erreur météo Supabase:', wErr.message);
    else console.log('✅ Météo transférée.');
  }

  // 3. Notes éditoriales
  const notes = getEditorialNotes();
  for (const p of notes.priorities) {
    await supabase.from('editorial_notes').insert({
      section_type: 'priority',
      item_num: p.item_num,
      title: p.title,
      subtitle: p.subtitle,
      order_rank: p.order_rank
    });
  }
  for (const t of notes.todos) {
    await supabase.from('editorial_notes').insert({
      section_type: 'todo',
      item_num: t.item_num,
      title: t.title,
      subtitle: t.subtitle,
      order_rank: t.order_rank
    });
  }
  console.log('✅ Notes éditoriales transférées.');

  // 4. Articles
  const articles = getAllArticles();
  let count = 0;
  for (const art of articles) {
    const { error } = await supabase.from('articles').upsert({
      slug: art.slug,
      title: art.title,
      subtitle: art.subtitle,
      section: art.section,
      category_tag: art.category_tag,
      author: art.author,
      published_date: art.published_date,
      read_time: art.read_time,
      summary: art.summary,
      content: art.content,
      image_url: art.image_url,
      image_caption: art.image_caption,
      is_headline: art.is_headline,
      is_brief: art.is_brief,
      is_featured: art.is_featured,
      order_rank: art.order_rank,
      source_url: art.source_url
    }, { onConflict: 'slug' });

    if (!error) count++;
  }
  console.log(`✅ ${count} articles transférés vers Supabase.`);
}

// Exécution directe si appelé en script CLI
if (process.argv[1]?.endsWith('seed-supabase.js')) {
  uploadAllToSupabase()
    .then(() => console.log('🎉 Synchronisation terminée !'))
    .catch(err => console.error('Erreur:', err.message));
}
