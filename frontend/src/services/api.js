import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Authenticated client — attaches JWT when a session exists
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

client.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Public client — no auth header, used for unauthenticated endpoints
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

// Children
export const createChild = (payload) => client.post('/api/children', payload).then(r => r.data);
export const getChildren = () => client.get('/api/children').then(r => r.data);

// Cases
export const getCases = () => client.get('/api/cases').then(r => r.data);
export const createCase = (payload) => client.post('/api/cases', payload).then(r => r.data);
export const assignCase = (id, assigned_ngo_id) =>
  client.put(`/api/cases/${id}/assign`, { assigned_ngo_id }).then(r => r.data);
export const updateCaseStatus = (id, status) =>
  client.put(`/api/cases/${id}/status`, { status }).then(r => r.data);

// Case updates
export const getCaseUpdates = (caseId) =>
  client.get(`/api/cases/${caseId}/updates`).then(r => r.data);
export const addCaseUpdate = (caseId, update_text) =>
  client.post(`/api/cases/${caseId}/updates`, { update_text }).then(r => r.data);

// Documents
export const getDocuments = (caseId) =>
  client.get(`/api/documents?case_id=${caseId}`).then(r => r.data);
export const uploadDocument = (caseId, documentType, file) => {
  const form = new FormData();
  form.append('case_id', caseId);
  form.append('document_type', documentType);
  form.append('file', file);
  return client.post('/api/documents/upload', form).then(r => r.data);
};

// Profiles
export const getProfiles = (role) =>
  client.get(`/api/profiles?role=${role}`).then(r => r.data);

// Admin — User Management
export const getUsers = () =>
  client.get('/api/admin/users').then(r => r.data);
export const createUser = (payload) =>
  client.post('/api/admin/users', payload).then(r => r.data);
export const deleteUser = (id) =>
  client.delete(`/api/admin/users/${id}`).then(r => r.data);

// Admin — Public Reports
export const getPublicReports = () =>
  client.get('/api/admin/public-reports').then(r => r.data);
export const updatePublicReportStatus = (id, status) =>
  client.put(`/api/admin/public-reports/${id}`, { status }).then(r => r.data);

// Public — no auth required
export const submitPublicReport = (payload) =>
  publicClient.post('/api/admin/public-reports', payload).then(r => r.data);
