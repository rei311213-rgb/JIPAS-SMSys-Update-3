import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini API Proxy
app.post('/api/ai/generate-comment', async (req, res) => {
  try {
    const { studentName, subjects, performanceLevel } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `You are a professional school teacher. Write a concise, personalized terminal report comment for a student named ${studentName}. 
    Subjects and scores: ${JSON.stringify(subjects)}. 
    General performance level: ${performanceLevel}. 
    The comment should be encouraging, professional, and highlight specific strengths or areas for improvement. Keep it to 2-3 sentences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.json({ comment: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// At-Risk Detection API
app.post('/api/ai/analyze-at-risk', async (req, res) => {
  try {
    const { studentData } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Analyze the following student performance data and identify if the student is "At Risk" of academic failure or significant drop in performance. 
    Data: ${JSON.stringify(studentData)}. 
    Return a JSON object with: 
    { "isAtRisk": boolean, "riskLevel": "Low" | "Medium" | "High", "reason": "concise explanation", "suggestions": ["suggestion1", "suggestion2"] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Server-side Duplicate Payments Validator
app.post('/api/payments/validate', (req, res) => {
  try {
    const { payments } = req.body;
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'Payments list is required as an array.' });
    }

    const flaggedPaymentIds: string[] = [];
    const seenMap = new Map<string, string>(); // key -> id

    payments.forEach((p: any) => {
      if (!p || !p.id) return;
      const isVoid = p.status === 'Voided' || p.isVoided === true;
      if (isVoid) return;

      const studentKey = (p.studentId || p.admissionNo || '').trim().toLowerCase();
      const amountKey = Number(p.paid ?? p.amount ?? 0);
      const dateKey = (p.date || '').trim();
      const key = `${studentKey}-${amountKey}-${dateKey}`;

      if (seenMap.has(key)) {
        flaggedPaymentIds.push(p.id);
        const originalId = seenMap.get(key)!;
        if (!flaggedPaymentIds.includes(originalId)) {
          flaggedPaymentIds.push(originalId);
        }
      } else {
        seenMap.set(key, p.id);
      }
    });

    res.json({ flaggedPaymentIds });
  } catch (err: any) {
    console.error('Duplicate payment validation error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Vite middleware for development
async function setupDevMiddleware() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  setupDevMiddleware().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
}

export default app;
