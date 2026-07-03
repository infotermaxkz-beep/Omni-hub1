/**
 * POST /api/auth/login
 * Body: { adminId, password }
 * Validates against env vars ADMIN_1_PASSWORD / ADMIN_2_PASSWORD / ADMIN_3_PASSWORD
 *
 * NOTE: This is basic protection suitable for an internal trusted tool,
 * not bank-grade security. Don't share the OmniHub URL publicly.
 */
const SLOT_BY_ID = { '1': 'ADMIN_1_PASSWORD', '42': 'ADMIN_2_PASSWORD', '98': 'ADMIN_3_PASSWORD' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { adminId, password } = req.body || {};
  const envKey = SLOT_BY_ID[String(adminId)];
  const correct = envKey ? process.env[envKey] : null;

  // If no password configured for this admin yet, allow through (so the app
  // still works before passwords are set in Vercel env vars).
  if (!correct) {
    return res.json({ ok: true, warning: 'Пароль не задан в Vercel env vars — доступ без пароля' });
  }

  if (String(password) === String(correct)) {
    return res.json({ ok: true });
  }

  res.status(401).json({ ok: false, error: 'Неверный пароль' });
}
