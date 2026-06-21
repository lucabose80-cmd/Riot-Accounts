
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AppThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AccountDetail } from './pages/AccountDetail';
import { ShareView } from './pages/ShareView';

function App() {
  return (
    <AppThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/share/:shareId" element={<ShareView />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/account/:id" element={
              <ProtectedRoute>
                <AccountDetail />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </AppThemeProvider>
  );
}

export default App;
