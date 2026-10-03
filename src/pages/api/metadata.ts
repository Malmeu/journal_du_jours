import type { APIRoute } from 'astro';
import { updateEditionMetadata, updateWeather } from '../../lib/db.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { type, data } = await request.json();
    
    if (type === 'weather') {
      updateWeather(data);
      return new Response(JSON.stringify({ success: true, message: "Météo mise à jour" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'metadata') {
      updateEditionMetadata(data);
      return new Response(JSON.stringify({ success: true, message: "Métadonnées de l'édition mises à jour" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Type inconnu" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
