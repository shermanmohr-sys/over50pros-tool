import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { skills, intent, email } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY || !SB_URL || !SB_KEY) {
    return res.status(500).json({ error: "Config Error", message: "Environment keys are missing." });
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `JSON ONLY. Generate 12 career ideas for skills: ${skills}. Goal: ${intent}. Schema: [{"title": "string", "description": "string", "skillsUsed": ["string"]}]` }] 
        }]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Google_API_Rejected", 
        raw: result.error || result 
      });
    }

    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: "Empty_Response", raw: result });
    }

    let text = result.candidates[0].content.parts[0].text;
    const cleanJson = JSON.parse(text.replace(/```json|```/g, "").trim());

    const supabase = createClient(SB_URL, SB_KEY);
    supabase.from('saved_projects').insert([{
      skills_input: skills,
      intent: intent,
      additional_ideas: cleanJson,
      email: email
    }]).catch(() => {});

    return res.status(200).json({ free_ideas: cleanJson.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Bridge_Crash", message: err.message });
  }
}
