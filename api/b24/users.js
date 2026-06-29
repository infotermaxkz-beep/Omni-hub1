export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const webhook = process.env.BITRIX24_WEBHOOK_URL;

  // Admins from env
  const admins = [
    { id: process.env.ADMIN_1_ID || '1', name: process.env.ADMIN_1_NAME || 'Ответственный 1', dept: process.env.ADMIN_1_DEPT || '' },
    { id: process.env.ADMIN_2_ID || '3', name: process.env.ADMIN_2_NAME || 'Ответственный 2', dept: process.env.ADMIN_2_DEPT || '' },
    { id: process.env.ADMIN_3_ID || '5', name: process.env.ADMIN_3_NAME || 'Ответственный 3', dept: process.env.ADMIN_3_DEPT || '' },
  ];

  if (!webhook) {
    return res.json({
      configured: false,
      admins,
      workers: [
        { id: '2', name: 'Асель Байжанова',       dept: 'Логистика' },
        { id: '4', name: 'Бекзат Нурмагамбетов', dept: 'Склад' },
        { id: '6', name: 'Гульнар Кожахметова',  dept: 'Доставка' },
        { id: '7', name: 'Расул Сейтжанов',      dept: 'Бухгалтерия' },
        { id: '8', name: 'Зарина Абенова',        dept: 'Поддержка' },
      ],
    });
  }

  try {
    const adminIds = admins.map(a => a.id);
    const r = await fetch(`${webhook}user.get.json?ACTIVE=Y`);
    const { result } = await r.json();

    const all = (result || []).map(u => ({
      id: u.ID,
      name: [u.NAME, u.LAST_NAME].filter(Boolean).join(' '),
      dept: u.WORK_POSITION || '',
    }));

    res.json({
      configured: true,
      admins: all.filter(u => adminIds.includes(u.id)),
      workers: all.filter(u => !adminIds.includes(u.id)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
