/**
 * GET /api/b24/tasks-active?userId=42
 * Returns active B24 tasks for one employee (for TV display)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { userId } = req.query;
  const webhook = process.env.BITRIX24_WEBHOOK_URL;

  if (!webhook || !userId) return res.json({ tasks: [] });

  try {
    const r = await fetch(
      `${webhook}tasks.task.list.json` +
      `?filter[RESPONSIBLE_ID]=${userId}` +
      `&filter[STATUS]=2` +          // 2 = In Progress
      `&select[]=ID` +
      `&select[]=TITLE` +
      `&select[]=PRIORITY` +
      `&select[]=DEADLINE` +
      `&select[]=STATUS` +
      `&select[]=GROUP_ID` +
      `&order[PRIORITY]=desc` +
      `&order[DEADLINE]=asc`
    );
    const d = await r.json();

    // Also fetch NEW tasks (status 1)
    const r2 = await fetch(
      `${webhook}tasks.task.list.json` +
      `?filter[RESPONSIBLE_ID]=${userId}` +
      `&filter[STATUS]=1` +          // 1 = New
      `&select[]=ID&select[]=TITLE&select[]=PRIORITY&select[]=DEADLINE&select[]=STATUS` +
      `&order[PRIORITY]=desc`
    );
    const d2 = await r2.json();

    const tasks = [
      ...(d.result?.tasks || []),
      ...(d2.result?.tasks || []),
    ];

    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ tasks: [], error: e.message });
  }
}
