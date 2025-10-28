import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { GmailCallback } from './pages/GmailCallback';
import { GoogleCallback } from './pages/GoogleCallback';
import { OAuthDiagnostics } from './pages/OAuthDiagnostics';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auth/gmail/callback"
          element={
            <ProtectedRoute>
              <GmailCallback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api/auth/google/callback"
          element={<GoogleCallback />}
        />
        <Route
          path="/admin/oauth-diagnostics"
          element={
            <ProtectedRoute>
              <OAuthDiagnostics />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
