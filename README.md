# Malmeu Matin — Journal d'Actualités Algérie & Monde

Un quotidien numérique moderne conçu avec **Astro** et propulsé par une base de données locale **SQLite** (`node:sqlite` natif Node.js).
Le site reproduit l'expérience de lecture d'une véritable gazette papier grand format (*broadsheet*) sans distraction.

## 📰 Fonctionnalités

- **Mise en page Broadsheet authentique** :
  - Manchette élégante avec titraille de presse traditionnelle.
  - Widget météo d'Alger avec icônes au trait et citation matinale.
  - Priorités, indices de devises (DZD, EUR, USD, pétrole).
  - Découpage en colonnes avec filets d'imprimerie et section « En bref » en 3 colonnes.
- **Rubriques complètes** :
  - Politique & Société (Algérie)
  - Géopolitique & Actualités Mondiales
  - Sports & Compétitions (Football DZ & international)
  - Art, Culture & Création
  - Économie & Innovations Technologiques
  - Fenêtre libre & Chroniques
- **Filtre géopolitique strict** :
  - Exclusion automatique des articles mentionnant Israël ou le Maroc, sauf s'ils présentent un lien direct et explicite avec l'Algérie.
- **Ingestion RSS quotidienne & autonome** :
  - Récupération automatique des flux d'actualité en temps réel (Algérie360, France 24, DZFoot...).
  - Dédoublonnage via lien source.
  - Surveillance continue avec rafraîchissement automatique.
- **Édition imprimable A4 (PDF 4 pages)** :
  - Vue calibrée pour l'impression A4 portrait (`/edition-pdf`).
- **Espace Rédaction & Gestion de l'édition** :
  - Panneau simplifié pour actualiser les flux, associer des visuels ou supprimer des articles (`/redaction`).
- **Mode lecture immersive** :
  - Choix du papier (Gazette / Blanc / Encre de nuit), ajustement de la taille de texte et lettrines de presse.

## 🚀 Installation & Lancement en local

```bash
# Installation des dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Compiler pour la production
npm run build

# Prévisualiser la production
npm run preview
```

## 🛠️ Stack technique

- **Framework** : [Astro 5](https://astro.build/) (mode SSR avec adaptateur `@astrojs/node`)
- **Base de données** : SQLite natif Node.js (`node:sqlite` DatabaseSync)
- **Typographie** : Playfair Display, Newsreader, Inter, JetBrains Mono
- **Styles** : CSS Vanilla sur-mesure respectant les règles d'imprimerie
