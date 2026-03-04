import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // 1. Ensure we only handle POST requests
  if (req.method !== 'POST') {
    return res.status(450).json({ error: "Method not allowed" });
  }

  const { skills, email, intent } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    // 2. Call the Gemini AI
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `Return a JSON array of 12 project ideas for skills: ${skills.join(', ')}. Intent: ${intent}. Each object needs "title" and "description" keys.` }] 
        }]
      })
    });

    const data = await response.json();
    
    // Safety check for AI response
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("AI response was empty.");
    }

    const aiText = data.candidates[0].content.parts[0].text;
    const cleanIdeas = JSON.parse(aiText.replace(/```json|```/g, ""));

    // 3. Save to Supabase (Non-blocking)
    supabase.from('saved_projects').insert([{
      skills_input: skills,
      intent: intent,
      additional_ideas: cleanIdeas
    }]).then(() => console.log("Saved to DB")).catch(e => console.error("DB Error:", e));

    // 4. Return results immediately
    return res.status(200).json({
      free_ideas: cleanIdeas.slice(0, 3)
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "System Error", details: error.message });
  }
}
