import { Router } from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/cases — Social Worker creates a case
router.post('/', requireAuth, requireRole('social_worker'), async (req, res) => {
  const { child_id, needs } = req.body;
  if (!child_id) return res.status(400).json({ error: 'child_id is required' });

  const { data, error } = await supabase
    .from('cases')
    .insert({ child_id, reported_by: req.user.id, needs: needs ?? [] })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/cases — list cases, scoped by role
router.get('/', requireAuth, async (req, res) => {
  let query = supabase.from('cases').select(`
    *,
    children ( first_name, last_name, date_of_birth ),
    profiles!cases_reported_by_fkey ( full_name )
  `);

  if (req.user.role === 'social_worker') {
    query = query.eq('reported_by', req.user.id);
  } else if (req.user.role === 'ngo') {
    query = query.eq('assigned_ngo_id', req.user.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/cases/:id — single case
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('cases')
    .select(`*, children ( first_name, last_name, date_of_birth ), profiles!cases_reported_by_fkey ( full_name )`)
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/cases/:id/assign — Admin assigns a case to an NGO
router.put('/:id/assign', requireAuth, requireRole('admin'), async (req, res) => {
  const { assigned_ngo_id } = req.body;
  if (!assigned_ngo_id) return res.status(400).json({ error: 'assigned_ngo_id is required' });

  const { data: ngo, error: ngoError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', assigned_ngo_id)
    .eq('role', 'ngo')
    .single();

  if (ngoError || !ngo) return res.status(400).json({ error: 'Target profile is not a valid NGO' });

  const { data, error } = await supabase
    .from('cases')
    .update({ assigned_ngo_id, status: 'assigned' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/cases/:id/status — Admin updates case status
router.put('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const VALID = ['pending', 'assigned', 'in_progress', 'resolved'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { data, error } = await supabase
    .from('cases')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/cases/:id/updates — fetch progress updates for a case
router.get('/:id/updates', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('case_updates')
    .select('*, profiles!case_updates_ngo_id_fkey ( full_name )')
    .eq('case_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/cases/:id/updates — NGO adds a progress update
router.post('/:id/updates', requireAuth, requireRole('ngo'), async (req, res) => {
  const { update_text } = req.body;
  if (!update_text?.trim()) return res.status(400).json({ error: 'update_text is required' });

  const { data, error } = await supabase
    .from('case_updates')
    .insert({ case_id: req.params.id, ngo_id: req.user.id, update_text: update_text.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
