import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { skills, intent, email } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

  // 1. HARD-CODED MODEL MATCH
  // Based on your trace, these are the confirmed top-tier models available to you:
  const targetModel = "models/gemini-2.0-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/${targetModel}:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
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

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "API_Rejected", raw: result, modelUsed: targetModel });
    }

    const text = result.candidates[0].content.parts[0].text;
    const cleanJson = JSON.parse(text);

    // 2. FIXED SUPABASE SYNTAX
    if (SB_URL && SB_KEY) {
      const supabase = createClient(SB_URL, SB_KEY);
      // We don't 'await' this to keep the response fast for the user
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
