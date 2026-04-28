import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_CHUNKS } from '../data/knowledge-base.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const KNOWLEDGE_BASE = KNOWLEDGE_CHUNKS.join('\n\n---\n\n');

router.post('/', async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const prompt = `You are a helpful assistant for HopeConnect, a child protection platform in Sri Lanka.

Detect the language of the user's question. If the question is in Sinhala, reply in Sinhala. If the question is in English, reply in English. Only use these two languages.

Answer ONLY using the knowledge base below. If the answer is not in the knowledge base, politely say you don't have that information and suggest calling 1929 (ChildLine) for urgent help.

Keep answers concise, friendly, and helpful.

Knowledge Base:
${KNOWLEDGE_BASE}

Question: ${question.trim()}`;

    const result = await chatModel.generateContent(prompt);
    res.json({ answer: result.response.text() });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ error: 'Failed to generate a response. Please try again.' });
  }
});

export default router;
