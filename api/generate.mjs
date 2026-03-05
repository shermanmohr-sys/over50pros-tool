import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { skills, intent } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY || !SB_URL || !SB_KEY) {
    return res.status(500).json({ error: "Config Error", message: "Environment keys are missing in Vercel." });
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `You are a high-level consultant for professionals over 50. 
          Generate 12 creative, high-income project or business ideas.
          
          Skills: ${Array.isArray(skills) ? skills.join(', ') : skills}
          Goal: ${intent}
          
          FORMAT: Return ONLY a valid JSON array of objects. 
          Each object must have "title", "description", and "skillsUsed" (array).
          Do not include any conversational text or markdown code blocks.` }] 
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`AI Provider Error: ${data.error.message}`);
    }

    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      throw new Error("The AI returned an empty response. Check safety filters.");
    }

    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const cleanIdeas = JSON.parse(aiText);

    const supabase = createClient(SB_URL, SB_KEY);
    supabase.from('saved_projects').insert([{
      skills_input: skills,
      intent: intent,
      additional_ideas: cleanIdeas
    }]).catch(e => console.error("BRIDGE: DB Error:", e));

    return res.status(200).json({ free_ideas: Array.isArray(cleanIdeas) ? cleanIdeas.slice(0, 3) : [] });

  } catch (error) {
    return res.status(500).json({ error: "Server Error", message: error.message });
  }
}
