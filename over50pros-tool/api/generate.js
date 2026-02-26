export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { skills = [], goal = 'side-hustle' } = req.body || {};

  const k = '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';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': k,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello in JSON like: {"test": "hello"}' }]
      })
    });

    const rawText = await response.text();

    return res.status(200).json({
      httpStatus: response.status,
      rawResponse: rawText,
      keyUsed: k.substring(0, 20) + '...'
    });

  } catch (err) {
    return res.status(200).json({
      error: err.message,
      keyUsed: k.substring(0, 20) + '...'
    });
  }
}
```

Commit it, wait 30 seconds, then visit this URL directly in your browser:
```
https://over50pros-tool.vercel.app/api/generate
