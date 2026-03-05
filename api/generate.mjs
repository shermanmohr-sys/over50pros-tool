import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { skills, intent } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY || !SB_URL || !SB_KEY) {
    return res.status(500).json({ error: "Configuration Error", message: "Missing API keys in Vercel." });
  }

  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro"
  ];

  let aiData = null;
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: `You are a career consultant for professionals over 50. Generate a JSON array of 12 creative project or business ideas.
            
            User Skills: ${Array.isArray(skills) ? skills.join(', ') : skills}
            User Goal: ${intent}
            
            RESPONSE FORMAT: Return ONLY a valid JSON array of objects.
            Each object must have:
            - "title": (String)
            - "description": (String)
            - "skillsUsed": (Array of strings)
            
            Do not include markdown formatting or backticks.` }] 
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const result = await response.json();

      if (response.ok && result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
        aiData = result;
        break; 
      } else {
        lastError = result.error?.message || "Invalid response structure";
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  if (!aiData) {
    return res.status(500).json({ error: "AI Connection Failed", message: `All models failed. Last error: ${lastError}` });
  }

  try {
    let aiText = aiData.candidates[0].content.parts[0].text;
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const cleanIdeas = JSON.parse(aiText);

    const supabase = createClient(SB_URL, SB_KEY);
    supabase.from('saved_projects').insert([{
      skills_input: skills,
      intent: intent,
      additional_ideas: cleanIdeas
    }]).catch(e => console.error("DB Error:", e));

    return res.status(200).json({ free_ideas: Array.isArray(cleanIdeas) ? cleanIdeas.slice(0, 3) : [] });

  } catch (error) {
    return res.status(500).json({ error: "Data Format Error", message: error.message });
  }
}
