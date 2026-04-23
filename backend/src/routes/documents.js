import { Router } from 'express';
import multer from 'multer';
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

export default router;
