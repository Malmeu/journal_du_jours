import { defineMiddleware } from 'astro:middleware';
import { ensureTodayEdition, isSyncDue } from './lib/db.js';
import { syncRssFeeds } from './lib/rss.js';

let isSyncing = false;

// Intervalle de fond : actualisation automatique toutes les 4 heures
const FOUR_HOURS = 4 * 60 * 60 * 1000;
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (!isSyncing) {
      isSyncing = true;
      syncRssFeeds(3)
        .then(res => console.log(`[Auto-Sync Cron] ${res.addedCount} nouveaux articles ingérés.`))
        .catch(err => console.error('[Auto-Sync Cron Erreur]', err.message))
        .finally(() => { isSyncing = false; });
    }
  }, FOUR_HOURS);
}

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Mise à jour de la date du jour de l'édition si la journée a changé
  ensureTodayEdition();

  // 2. Déclenchement automatique au premier visiteur du matin ou après expiration du délai (4 heures)
  if (!isSyncing && isSyncDue(4)) {
    isSyncing = true;
    // Exécution asynchrone en arrière-plan pour ne pas faire attendre le visiteur
    syncRssFeeds(4)
      .then(res => {
        if (res.addedCount > 0) {
          console.log(`[Auto-Sync Quotidien] ${res.addedCount} articles ajoutés automatiquement.`);
        }
      })
      .catch(err => console.error('[Auto-Sync Quotidien Erreur]', err.message))
      .finally(() => {
        isSyncing = false;
      });
  }

  return next();
});
