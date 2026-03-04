import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { skills, email, intent } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate 12 project ideas for skills: ${skills.join(', ')}. Intent: ${intent}. Return ONLY JSON.` }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const aiData = await response.json();
    
    // Safety check for AI response
    if (!aiData.candidates || !aiData.candidates[0].content.parts[0].text) {
      throw new Error("AI failed to return valid data.");
    }

    const cleanReport = JSON.parse(aiData.candidates[0].content.parts[0].text);
    const ideas = cleanReport.additional_ideas || cleanReport;

    // Save to Supabase (wrapped in a try/catch so it doesn't break the UI)
    try {
      await supabase.from('saved_projects').insert([{ 
        skills_input: skills, 
        intent: intent, 
        featured_project: cleanReport.featured_project || {},
        additional_ideas: ideas 
      }]);
    } catch (dbError) {
      console.warn("Database save skipped or failed, continuing to display results.");
    }

    // Return the results to the website
    res.status(200).json({
      free_ideas: Array.isArray(ideas) ? ideas.slice(0, 3) : []
    });

  } catch (error) {
    res.status(500).json({ error: "System Error", details: error.message });
  }
}
