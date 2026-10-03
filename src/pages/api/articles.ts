import type { APIRoute } from 'astro';
import { insertArticle, updateArticle, deleteArticle } from '../../lib/db.js';

export const prerender = false;

// POST: Créer un nouvel article
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Génération automatique d'un slug propre si non fourni
    if (!data.slug) {
      data.slug = (data.title || 'article')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);
    }

    if (!data.published_date) {
      data.published_date = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());
    }

    insertArticle(data);
    return new Response(JSON.stringify({ success: true, slug: data.slug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Mettre à jour un article existant
export const PUT: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    if (!data.id) {
      return new Response(JSON.stringify({ success: false, error: "Identifiant manquant" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updateArticle(data.id, data);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Supprimer un article
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '', 10);
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Identifiant requis" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    deleteArticle(id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
