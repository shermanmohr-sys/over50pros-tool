import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Log 1: Input Received - Monitor data coming from your website
  console.log("API Triggered. Inputs:", JSON.stringify(req.body));

  const { skills, intent } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Safety Check: Verify Vercel has your keys
  if (!API_KEY || !SB_URL || !SB_KEY) {
    console.error("Critical Error: Missing Environment Variables in Vercel.");
    return res.status(500).json({ error: "Configuration Error", message: "Missing API keys in Vercel." });
  }

  try {
    // Log 2: Call the AI
    // FIX 1: Using v1beta to match specific API key permissions/project setup
    console.log("Requesting ideas from Gemini AI (v1beta)...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `You are a high-level career consultant for professionals over 50. 
          Generate 12 creative, high-income project or business ideas.
          
          User Skills: ${Array.isArray(skills) ? skills.join(', ') : skills}
          User Goal: ${intent}
          
          RESPONSE FORMAT: Return ONLY a valid JSON array of objects.
          Each object must have:
          - "title": (String)
          - "description": (String)
          - "skillsUsed": (Array of strings)
          
          Do not include any conversational text, markdown, or backticks.` }] 
        }]
      })
    });

    const data = await response.json();
    
    // Safety check for AI response
    if (data.error) {
      console.error("Gemini API Error details:", JSON.stringify(data.error));
      throw new Error(`AI Provider Error: ${data.error.message}`);
    }

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error("AI Response structure unexpected. Raw:", JSON.stringify(data));
      throw new Error("AI response was empty or blocked by safety filters.");
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    // FIX 2: THE SCRUBBER - Removes AI formatting (like \`\`\`json) that causes JSON.parse to fail
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Log 3: Parse the AI's answer
    const cleanIdeas = JSON.parse(aiText);
    console.log("Success: Generated and parsed ideas.");

    // Log 4: Save to Supabase (Background task)
    const supabase = createClient(SB_URL, SB_KEY);
    supabase.from('saved_projects').insert([{
      skills_input: skills,
      intent: intent,
      additional_ideas: cleanIdeas
    }]).then(() => console.log("DB: Successfully recorded session."))
      .catch(e => console.error("DB: Background save failed.", e));

    // Return just the first 3 ideas to the website
    return res.status(200).json({ 
      free_ideas: Array.isArray(cleanIdeas) ? cleanIdeas.slice(0, 3) : [] 
    });

  } catch (error) {
    console.error("SERVER CRITICAL ERROR:", error.message);
    return res.status(500).json({ error: "Server Error", message: error.message });
  }
}
