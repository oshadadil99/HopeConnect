import { Router } from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ALLOWED_TYPES = ['birth_certificate', 'medical_report', 'police_report'];

// GET /api/documents?case_id=... — list documents for a case
router.get('/', requireAuth, async (req, res) => {
  const { case_id } = req.query;
  if (!case_id) return res.status(400).json({ error: 'case_id query param is required' });

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('case_id', case_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/documents/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { case_id, document_type } = req.body;
  if (!case_id || !document_type) return res.status(400).json({ error: 'case_id and document_type are required' });
  if (!ALLOWED_TYPES.includes(document_type)) {
    return res.status(400).json({ error: `document_type must be one of: ${ALLOWED_TYPES.join(', ')}` });
  }

  const ext = req.file.originalname.split('.').pop();
  const storagePath = `cases/${case_id}/${Date.now()}_${document_type}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from('documents')
    .insert({ case_id, uploaded_by: req.user.id, file_url: publicUrl, document_type })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

const EXTRACT_PROMPT = `Analyze this birth certificate. Extract the following fields and return ONLY a raw JSON object with no markdown, no code fences, no explanation:
{"firstName":string|null,"lastName":string|null,"dateOfBirth":"YYYY-MM-DD"|null,"gender":string|null,"district":string|null}
Set any field to null if it cannot be found or is illegible.`;

// POST /api/documents/extract — AI extraction from birth certificate image or PDF
router.post('/extract', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { mimetype, buffer } = req.file;
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!ALLOWED_MIME.includes(mimetype)) {
    return res.status(400).json({ error: 'File must be jpg, png, webp, or pdf' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([
      { inlineData: { data: buffer.toString('base64'), mimeType: mimetype } },
      EXTRACT_PROMPT,
    ]);

    const raw = result.response.text().trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('Document extraction error:', err.message);
    res.status(500).json({ error: 'Failed to extract data from document.' });
  }
});

export default router;
