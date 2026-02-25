export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const prompt = "You are a career strategist helping experienced professionals aged 50+ turn their life and career skills into actionable side projects.\n\nSkills: " + skillList + "\nGoal: " + goalText + "\n\nGenerate exactly 12 side project ideas. Each must:\n- Directly leverage one or more of their listed skills\n- Solve a real problem people will pay for\n- Be completable by one person in 2-12 weeks\n- Be realistic and empowering for someone with decades of experience\n\nReturn a JSON array of exactly 12 objects each with these fields:\n- title (string, max 8 words)\n- description (string, 2 sentences)\n- type (one of: Consulting, Course, Digital Product, Service, Community, Physical Product, App/Tool)\n- skillsUsed (array of 1-3 strings from the skills provided)\n- timeToLaunch (string e.g. 2-3 weeks)\n- earningPotential (string e.g. $500-2k/mo)\n- firstStep (string, one concrete action to take today)\n\nReturn ONLY the JSON array, no other text, no markdown.";

  const k = 'sk-ant-api03-hRFHtHOAZS-gzyNnoS03KDca2xCmQ81Q3zvZxqWjC9181BqQg1J60TZ1orjNfdukOO0XvOB0gWyuHcrqkOp5Q-25ItjQAA';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': k,
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
    const text = data.content.map(function(b) { return b.text || ''; }).join('');
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const ideas = JSON.parse(clean);

    return res.status(200).json({ ideas: ideas });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
