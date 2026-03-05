import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { skills, intent, email } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

  let availableModels = [];
  try {
    // REAL DISCOVERY: Ask Google exactly what this API Key is allowed to use
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const listData = await listRes.json();
    availableModels = listData.models?.map(m => m.name) || [];
  } catch (e) {
    console.error("Discovery failed", e);
  }

  // Pick the best match from the ACTUAL list provided by Google
  const preferred = [
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro-latest",
    "models/gemini-1.5-pro",
    "models/gemini-pro"
  ];
  
  const targetModel = preferred.find(p => availableModels.includes(p)) || availableModels[0];

  if (!targetModel) {
    return res.status(404).json({ 
      error: "No Authorized Models", 
      message: "The Google API key provided is not authorized for any generative models. Check your Google AI Studio project and billing status.",
      debug_list: availableModels 
    });
  }

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

    // Supabase Log (Async/Non-blocking)
    const supabase = createClient(SB_URL, SB_KEY);
    supabase.from('saved_projects').insert([{
      skills_input: skills,
      intent: intent,
      additional_ideas: cleanJson,
      email: email
    }]).catch(() => {});

    return res.status(200).json({ 
      free_ideas: cleanJson.slice(0, 3), 
      model: targetModel,
      total_generated: cleanJson.length
    });

  } catch (err) {
    return res.status(500).json({ 
      error: "Bridge_Crash", 
      message: err.message, 
      discovered_models: availableModels 
    });
  }
}
