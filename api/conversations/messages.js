/**
 * GET /api/conversations/messages?convId=123
 */
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sb     = getSupabase();
  const convId = req.query.convId;

  if (!sb)     return res.json({ ok: false, data: [] });
  if (!convId) return res.status(400).json({ ok: false, error: 'convId required' });

  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('sent_at', { ascending: true });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, data: data || [] });
}
