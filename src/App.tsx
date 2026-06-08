import { Routes, Route } from 'react-router-dom';
import Layout        from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute    from './components/AdminRoute';

import Home          from './pages/Home';
import AuthPage      from './pages/AuthPage';
import Dashboard     from './pages/Dashboard';
import FamilyTree    from './pages/FamilyTree';
import MyProfile     from './pages/MyProfile';
import PersonDetail  from './pages/PersonDetail';
import SetupProfile  from './pages/SetupProfile';
import AddSibling    from './pages/AddSibling';
import AdminDashboard from './pages/admin/AdminDashboard';
import AddAncestor   from './pages/admin/AddAncestor';
import AddRelative   from './pages/AddRelative';

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Public */}
        <Route path="/"           element={<Home />} />
        <Route path="/auth"       element={<AuthPage />} />
        <Route path="/family-tree" element={<FamilyTree />} />

        {/* Protected — requires login */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/my-profile" element={
          <ProtectedRoute><MyProfile /></ProtectedRoute>
        } />
        <Route path="/setup-profile" element={
          <ProtectedRoute><SetupProfile /></ProtectedRoute>
        } />
        <Route path="/person/:id" element={
          <ProtectedRoute><PersonDetail /></ProtectedRoute>
        } />
        <Route path="/edit-person/:id" element={
          <ProtectedRoute><SetupProfile /></ProtectedRoute>
        } />
        <Route path="/add-sibling/:id" element={
          <ProtectedRoute><AddSibling /></ProtectedRoute>
        } />
        <Route path="/add-relative/:personId/:role" element={
          <ProtectedRoute><AddRelative /></ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/add-ancestor" element={
          <AdminRoute><AddAncestor /></AdminRoute>
        } />
        <Route path="/admin/edit-ancestor/:id" element={
          <AdminRoute><AddAncestor /></AdminRoute>
        } />

        {/* 404 */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h1 className="font-serif text-6xl font-bold text-burgundy-200 mb-4">404</h1>
            <p className="text-gray-500 mb-6">Page not found.</p>
            <a href="/" className="btn-primary text-sm">Go home</a>
          </div>
        } />
      </Routes>
    </Layout>
  );
}
