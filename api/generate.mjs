export default async function handler(req, res) {
  // Use the exact name from your Vercel Environment Variables
  const API_KEY = process.env.GEMINI_API_KEY; 

  if (!API_KEY) {
    return res.status(500).json({ error: "API Key is missing in Vercel settings." });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: "Suggest 12 business ideas for a professional over 50." }] 
        }]
      })
    });

    const data = await response.json();
    
    // This sends the AI's answer back to your website
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "The AI connection failed." });
  }
}