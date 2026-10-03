import { insertArticle, getArticleBySourceUrl, recordSyncSuccess } from './db.js';

// Configuration des flux RSS d'actualité pour le journal
export const RSS_FEEDS = [
  {
    name: "Algérie360 - Politique & Société",
    url: "https://www.algerie360.com/feed/",
    section: "algerie",
    categoryPrefix: "POLITIQUE & SOCIÉTÉ DZ",
    defaultAuthor: "Correspondant Alger"
  },
  {
    name: "France 24 - International & Géopolitique",
    url: "https://www.france24.com/fr/rss",
    section: "monde",
    categoryPrefix: "GÉOPOLITIQUE & MONDE",
    defaultAuthor: "Desk International"
  },
  {
    name: "France 24 - Moyen-Orient & Région",
    url: "https://www.france24.com/fr/moyen-orient/rss",
    section: "monde",
    categoryPrefix: "DIPLOMATIE & PROCHE-ORIENT",
    defaultAuthor: "Envoyé Spécial"
  },
  {
    name: "DZFoot - Sport Algérien",
    url: "https://www.dzfoot.com/feed",
    section: "sport",
    categoryPrefix: "SPORT & COMPÉTITIONS DZ",
    defaultAuthor: "Rédaction Sport"
  },
  {
    name: "France 24 - Sports Internationaux",
    url: "https://www.france24.com/fr/sports/rss",
    section: "sport",
    categoryPrefix: "SPORT MONDIAL",
    defaultAuthor: "Desk Sport"
  },
  {
    name: "France 24 - Art, Culture & Création",
    url: "https://www.france24.com/fr/culture/rss",
    section: "art-culture",
    categoryPrefix: "ART & CULTURE",
    defaultAuthor: "Chroniqueur Culture"
  }
];

// Parser XML RSS simple et résilient (sans dépendance externe)
function parseXmlItems(xmlText) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const itemMatches = xmlText.match(itemRegex) || [];

  for (const rawItem of itemMatches) {
    try {
      // Extraction du titre
      const titleMatch = rawItem.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
                         rawItem.match(/<title>([\s\S]*?)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : '';
      title = decodeHtmlEntities(title);

      // Extraction du lien
      const linkMatch = rawItem.match(/<link>([\s\S]*?)<\/link>/i);
      let link = linkMatch ? linkMatch[1].trim() : '';

      // Extraction de la date
      const dateMatch = rawItem.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();

      // Extraction de l'auteur
      const authorMatch = rawItem.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/i) ||
                          rawItem.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i) ||
                          rawItem.match(/<author>([\s\S]*?)<\/author>/i);
      let author = authorMatch ? authorMatch[1].trim() : '';

      // Extraction de la description / résumé
      const descMatch = rawItem.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
                        rawItem.match(/<description>([\s\S]*?)<\/description>/i);
      let rawDescription = descMatch ? descMatch[1] : '';

      // Extraction du contenu complet si présent
      const contentMatch = rawItem.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/i) ||
                           rawItem.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
      let rawContent = contentMatch ? contentMatch[1] : rawDescription;

      // Extraction de l'image (media:content, enclosure, ou tag img dans description/content)
      let imageUrl = null;
      const mediaMatch = rawItem.match(/<media:content[^>]+url=["']([^"']+)["']/i);
      const enclosureMatch = rawItem.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      const imgTagMatch = (rawContent + rawDescription).match(/<img[^>]+src=["']([^"']+)["']/i);

      if (mediaMatch) imageUrl = mediaMatch[1];
      else if (enclosureMatch) imageUrl = enclosureMatch[1];
      else if (imgTagMatch) imageUrl = imgTagMatch[1];

      // Nettoyage du texte
      const cleanSummary = stripHtml(rawDescription).slice(0, 320).trim();
      const cleanContent = formatContentForReader(rawContent, cleanSummary);

      if (title && link) {
        items.push({
          title,
          link,
          pubDate,
          author,
          summary: cleanSummary || title,
          content: cleanContent,
          imageUrl
        });
      }
    } catch (e) {
      // Ignorer l'item malformé
    }
  }

  return items;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, "...")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function formatContentForReader(rawHtml, fallbackSummary) {
  let text = stripHtml(rawHtml);
  if (!text || text.length < 50) {
    text = fallbackSummary;
  }

  // Découper en paragraphes cohérents
  const sentences = text.split(/(?<=[.!?])\s+/);
  const paragraphs = [];
  let currentPara = [];

  for (const sentence of sentences) {
    currentPara.push(sentence);
    if (currentPara.join(' ').length > 250) {
      paragraphs.push(currentPara.join(' '));
      currentPara = [];
    }
  }
  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(' '));
  }

  return paragraphs.map(p => p.trim()).filter(Boolean).join('\n\n');
}

function makeSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) + '-' + Date.now().toString().slice(-4);
}

// Filtre géopolitique éditorial :
// Ne jamais parler d'Israël ou du Maroc, sauf si l'article a un rapport direct avec l'Algérie.
export function passesGeopoliticalFilter(item) {
  const fullText = `${item.title || ''} ${item.summary || ''} ${item.content || ''}`.toLowerCase();
  
  const sensitiveRegex = /\b(isra[eë]l|isra[eë]lien(s|ne|nes)?|tel[\s\-]aviv|tsahal|netanyahou|netanyahu|maroc|marocain(s|e|es)?|rabat|makhzen)\b/i;
  
  if (sensitiveRegex.test(fullText)) {
    // Autorisé UNIQUEMENT s'il y a un lien direct avec l'Algérie
    const algeriaRegex = /\b(alg[eé]rie|alg[eé]rien(s|ne|nes)?|alger)\b/i;
    return algeriaRegex.test(fullText);
  }

  return true;
}

// Fonction principale de synchronisation quotidienne
export async function syncRssFeeds(limitPerFeed = 4) {
  const results = {
    addedCount: 0,
    filteredCount: 0,
    errors: [],
    details: []
  };

  const todayStr = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Journal-Presse/2.0; Algérie & Monde)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        results.errors.push(`Flux ${feed.name}: HTTP ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const parsedItems = parseXmlItems(xml);
      let feedAdded = 0;

      for (const item of parsedItems.slice(0, limitPerFeed)) {
        // Application du filtre éditorial géopolitique
        if (!passesGeopoliticalFilter(item)) {
          results.filteredCount++;
          continue; // Rejeté conformément à la charte éditoriale
        }

        // Vérifier si l'article existe déjà en base locale via son lien source
        const existing = getArticleBySourceUrl(item.link);
        if (existing) {
          continue; // Déjà présent dans la base locale
        }

        const slug = makeSlug(item.title);
        const hours = item.pubDate.getHours().toString().padStart(2, '0');
        const minutes = item.pubDate.getMinutes().toString().padStart(2, '0');
        const categoryTag = `${feed.categoryPrefix} / ${hours}:${minutes}`;

        insertArticle({
          slug,
          title: item.title,
          subtitle: item.summary.slice(0, 150) + '...',
          section: feed.section,
          category_tag: categoryTag,
          author: item.author || feed.defaultAuthor,
          published_date: todayStr,
          read_time: `${Math.max(2, Math.round(item.content.length / 500))} min de lecture`,
          summary: item.summary,
          content: item.content,
          image_url: item.imageUrl,
          image_caption: item.imageUrl ? `Photo de presse / Dépêche — ${feed.name}` : '',
          is_headline: 0,
          is_brief: 0,
          is_featured: 1,
          order_rank: 10,
          source_url: item.link
        });

        results.addedCount++;
        feedAdded++;
      }

      results.details.push({ feed: feed.name, added: feedAdded });
    } catch (err) {
      results.errors.push(`Flux ${feed.name}: ${err.message}`);
    }
  }

  // Enregistrer la date et l'heure du sync réussi
  if (results.errors.length < RSS_FEEDS.length) {
    recordSyncSuccess();
  }

  return results;
}
