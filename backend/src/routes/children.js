import { Router } from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('social_worker'), async (req, res) => {
  const { first_name, last_name, date_of_birth } = req.body;
  if (!first_name || !last_name || !date_of_birth) {
    return res.status(400).json({ error: 'first_name, last_name, and date_of_birth are required' });
  }
  const { data, error } = await supabase
    .from('children')
    .insert({ first_name, last_name, date_of_birth, created_by: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/', requireAuth, async (req, res) => {
  let query = supabase.from('children').select('*');
  if (req.user.role === 'social_worker') {
    query = query.eq('created_by', req.user.id);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
