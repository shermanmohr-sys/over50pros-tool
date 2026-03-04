import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { skills, email, intent, userId } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    // 1. Get the AI Report
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate a 12-idea report for skills: ${skills}. Intent: ${intent}.` }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const aiData = await response.json();
    const cleanReport = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // 2. Save to your new Supabase Tables
    const { error } = await supabase
      .from('saved_projects')
      .insert([
        { 
          user_id: userId, 
          skills_input: skills, 
          intent: intent, 
          featured_project: cleanReport.featured_project,
          additional_ideas: cleanReport.additional_ideas 
        }
      ]);

    if (error) throw error;

    // 3. Return only what the user is allowed to see (Free tier gets 3)
    res.status(200).json({
      free_ideas: cleanReport.additional_ideas.slice(0, 3),
      total_count: 12
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
