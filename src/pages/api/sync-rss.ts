import type { APIRoute } from 'astro';
import { syncRssFeeds } from '../../lib/rss.js';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    const results = await syncRssFeeds(5);
    return new Response(JSON.stringify({ success: true, ...results }), {
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
