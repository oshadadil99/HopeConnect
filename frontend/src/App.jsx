import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Report from './pages/Report';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/AdminDashboard';
import NgoDashboard from './pages/ngo/NgoDashboard';
import SocialWorkerPortal from './pages/social-worker/SocialWorkerPortal';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/report" element={<Report />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ngo/*"
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <NgoDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social-worker/*"
          element={
            <ProtectedRoute allowedRoles={['social_worker']}>
              <SocialWorkerPortal />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
