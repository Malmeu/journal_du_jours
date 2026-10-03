import type { APIRoute } from 'astro';
import { updateArticleImage } from '../../lib/db.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    if (!data.id) {
      return new Response(JSON.stringify({ success: false, error: "Identifiant d'article requis" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updateArticleImage(data.id, data.image_url || null, data.image_caption || '');
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
