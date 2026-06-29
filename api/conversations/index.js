/**
 * GET  /api/conversations        — список диалогов
 * POST /api/conversations        — создать диалог
 * POST /api/conversations/[id]/messages — отправить сообщение
 */
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sb = getSupabase();
  if (!sb) return res.json({ ok: false, error: 'Supabase not configured', data: [] });

  // GET — list conversations
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, data: data || [] });
  }

  // POST — create conversation or send message
  if (req.method === 'POST') {
    const body = req.body;

    // Send message to existing conversation
    if (body.conversationId && body.text !== undefined) {
      const { data: msg, error } = await sb
        .from('messages')
        .insert({
          conversation_id: body.conversationId,
          from_type:  body.fromType || 'admin',
          admin_id:   body.adminId || null,
          admin_name: body.adminName || null,
          text:       body.text,
          files:      body.files || [],
        })
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });

      // Update conversation last message
      await sb.from('conversations').update({
        last_message:    body.text,
        last_message_at: new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      }).eq('id', body.conversationId);

      return res.json({ ok: true, message: msg });
    }

    // Create new conversation
    const { data: conv, error } = await sb
      .from('conversations')
      .insert({
        channel:      body.channel,
        client_name:  body.clientName,
        client_phone: body.clientPhone,
        last_message: body.lastMessage || '',
        status:       'open',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, conversation: conv });
  }

  res.status(405).end();
}
