require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Supabase and Gemini
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Route to save Needs
app.post('/add-need', async (req, res) => {
  const { error } = await supabase.from('needs').insert([req.body]);
  res.json(error ? { error: error.message } : { message: "Need Saved! ✅" });
});

// Route to register Volunteers
app.post('/register-volunteer', async (req, res) => {
  const { error } = await supabase.from('volunteers').insert([req.body]);
  res.json(error ? { error: error.message } : { message: "Volunteer Registered! 🤝" });
});

// The AI Matching Route
app.get('/match', async (req, res) => {
  try {
    const { data: needs } = await supabase.from('needs').select('*');
    const { data: volunteers } = await supabase.from('volunteers').select('*');

    // Check if both tables have data
    if (!needs?.length || !volunteers?.length) {
      return res.json({ message: "Waiting for more data in Supabase..." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Context: Community Rescue matching.
      Needs: ${JSON.stringify(needs)}
      Volunteers: ${JSON.stringify(volunteers)}
      Task: Match them based on location and skills. 
      Return ONLY a JSON array of objects with keys: "need", "volName", "volContact", and "reason".
      No extra text, no markdown. Just the array.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    const cleanJson = text.match(/\[.*\]/s);

    if (cleanJson) {
      res.json(JSON.parse(cleanJson[0]));
    } else {
      throw new Error("Invalid AI response");
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Matching failed. Please refresh." });
  }
});

// CRITICAL: Listen to Railway's assigned port
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SYSTEM LIVE ON PORT ${PORT}`);
});