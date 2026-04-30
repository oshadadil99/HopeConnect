import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ── User Management ───────────────────────────────────────────

router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { full_name, email, password, role, organization_name } = req.body;
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: 'full_name, email, password, and role are required.' });
  }
  const allowed = ['admin', 'ngo', 'social_worker'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, ngo, or social_worker.' });
  }

  // Step 1: create the auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, organization_name: organization_name || null },
  });
  if (error) return res.status(400).json({ error: error.message });

  // Step 2: explicitly upsert the profile row — don't rely on the trigger alone
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: data.user.id,
      full_name,
      role,
      organization_name: organization_name || null,
    });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphan
    await supabase.auth.admin.deleteUser(data.user.id);
    return res.status(500).json({ error: 'Profile creation failed: ' + profileError.message });
  }

  res.status(201).json({ id: data.user.id, email: data.user.email });
});

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, organization_name, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { error } = await supabase.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// ── Public Reports ────────────────────────────────────────────

// No auth — open to anyone
router.post('/public-reports', async (req, res) => {
  const { child_name, child_age, district, concern_type, description, reporter_name, reporter_contact, evidence_urls } = req.body;
  if (!concern_type || !description) {
    return res.status(400).json({ error: 'concern_type and description are required.' });
  }
  const { data, error } = await supabase
    .from('public_reports')
    .insert({
      child_name: child_name || null,
      child_age: child_age || null,
      district: district || null,
      concern_type,
      description,
      reporter_name: reporter_name || null,
      reporter_contact: reporter_contact || null,
      evidence_urls: evidence_urls || [],
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/public-reports', requireAuth, requireRole('admin', 'ngo'), async (req, res) => {
  let query = supabase
    .from('public_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (req.user.role === 'ngo') {
    query = query.eq('assigned_ngo_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/public-reports/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase
    .from('public_reports')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/public-reports/:id/assign', requireAuth, requireRole('admin'), async (req, res) => {
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
    .from('public_reports')
    .update({ assigned_ngo_id, status: 'reviewed' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
