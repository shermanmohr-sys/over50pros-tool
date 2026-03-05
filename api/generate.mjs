import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { skills, intent, email } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

  const targetModel = "models/gemini-2.0-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${API_KEY}`;

  // Senior Dev Helper: Exponential Backoff for Rate Limits (429 errors)
  const fetchWithRetry = async (url, options, retries = 3, backoff = 2000) => {
    try {
      const response = await fetch(url, options);
      const result = await response.json();

      // If we hit a rate limit (429), wait and try again
      if (response.status === 429 && retries > 0) {
        console.log(`Rate limit hit. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      return { response, result };
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  try {
    const { response, result } = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `Generate 12 creative, high-income project or business ideas for a professional over 50. 
          Skills: ${skills}. Goal: ${intent}. 
          Return ONLY a JSON array of objects. Schema: [{"title": "string", "description": "string"}]` }] 
        }],
        generationConfig: { 
          responseMimeType: "application/json" 
        }
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "API_Rejected", 
        message: result.error?.message || "Google API Error",
        raw: result, 
        modelUsed: targetModel 
      });
    }

    const text = result.candidates[0].content.parts[0].text;
    const cleanJson = JSON.parse(text);

    if (SB_URL && SB_KEY) {
      const supabase = createClient(SB_URL, SB_KEY);
      supabase.from('saved_projects').insert([{
        skills_input: skills,
        intent: intent,
        additional_ideas: cleanJson,
        email: email
      }]).then(({ error }) => {
        if (error) console.error("Supabase Insert Error:", error);
      });
    }

    return res.status(200).json({ 
      free_ideas: cleanJson.slice(0, 3), 
      model: targetModel,
      total_generated: cleanJson.length
    });

  } catch (err) {
    return res.status(500).json({ 
      error: "Bridge_Crash", 
      message: err.message,
      modelUsed: targetModel
    });
  }
}
