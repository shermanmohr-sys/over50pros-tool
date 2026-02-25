export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { skills = [], goal = 'side-hustle' } = req.body;

  if (!skills.length) {
    return res.status(400).json({ error: 'No skills provided' });
  }

  const goalLabels = {
    'side-hustle': 'generating income through a side hustle',
    'new-job':     'landing a new job or career change',
    'portfolio':   'building an impressive portfolio',
    'freelance':   'starting a freelance or consulting business'
  };

  const goalText  = goalLabels[goal] || goalLabels['side-hustle'];
  const skillList = skills.join(', ');

  const prompt = `You are a career strategist helping experienced professionals aged 50+ turn their life and career skills into actionable side projects.

Skills: ${skillList}
Goal: ${goalText}

Generate exactly 12 side project ideas. Each must:
- Directly leverage one or more of their listed skills
- Solve a real problem people will pay for
- Be completable by one person in 2-12 weeks
- Be realistic and empowering for someone with decades of experience

Return a JSON array of exactly 12 objects each with these fields:
- title (string, max 8 words)
- description (string, 2 sentences: what it is and what problem it solves)
- type (one of: Consulting, Course, Digital Product, Service, Community, Physical Product, App/Tool)
- skillsUsed (array of 1-3 strings from the skills provided)
- timeToLaunch (string e.g. 2-3 weeks)
- earningPotential (string e.g. $500-2k/mo)
- firstStep (string, one concrete action to take today)

Return ONLY the JSON array, no other text, no markdown.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ''x-api-key': 'sk_ant_api03-hRFHtHOAZS_gzyNnoS03KDca2xCmQ81Q3zvZxqWjC9181BqQg1J60TZ1orjNfdukOO0XvOB0gWyuHcrqkOp5Q_25ItjQAA',,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'API error', detail: err });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const ideas = JSON.parse(clean);

    return res.status(200).json({ ideas });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
