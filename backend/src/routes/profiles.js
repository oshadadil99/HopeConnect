import { Router } from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/profiles?role=ngo  — admin fetches profiles by role
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { role } = req.query;
  let query = supabase.from('profiles').select('id, full_name, role, organization_name');
  if (role) query = query.eq('role', role);
  const { data, error } = await query.order('full_name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
