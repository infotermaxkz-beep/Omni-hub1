/**
 * GET /api/b24/projects
 * Returns list of existing Bitrix24 projects (sonet_group with IS_PROJECT=Y)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const webhook = process.env.BITRIX24_WEBHOOK_URL;
  if (!webhook) return res.json({ ok: false, projects: [] });

  try {
    const r = await fetch(`${webhook}sonet_group.get.json?FILTER[IS_PROJECT]=Y&FILTER[ACTIVE]=Y`);
    const d = await r.json();

    const projects = (d.result || []).map(g => ({
      id:   String(g.ID),
      name: g.NAME,
    }));

    res.json({ ok: true, projects });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, projects: [] });
  }
}
