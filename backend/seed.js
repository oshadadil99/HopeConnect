import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const users = [
  {
    email: 'admin@hopeconnect.lk',
    password: 'Test1234!',
    user_metadata: { full_name: 'Admin User', role: 'admin' },
  },
  {
    email: 'ngo@hopeconnect.lk',
    password: 'Test1234!',
    user_metadata: { full_name: 'NGO User', role: 'ngo', organization_name: 'Hope Foundation' },
  },
  {
    email: 'worker@hopeconnect.lk',
    password: 'Test1234!',
    user_metadata: { full_name: 'Social Worker', role: 'social_worker' },
  },
];

for (const u of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    user_metadata: u.user_metadata,
    email_confirm: true,
  });

  if (error) {
    console.error(`❌ ${u.email}:`, JSON.stringify(error, null, 2));
  } else {
    console.log(`✅ Created: ${u.email} (role: ${u.user_metadata.role})`);
  }
}
