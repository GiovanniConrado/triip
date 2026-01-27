
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Welcome from './views/Welcome';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Home from './views/Home';
import TripSuggestions from './views/TripSuggestions';
import TripAbout from './views/TripAbout';
import SuggestionDetail from './views/SuggestionDetail';
import AddTrip from './views/AddTrip';
import EditTrip from './views/EditTrip';
import Holidays from './views/Holidays';
import Finance from './views/Finance';
import AddSuggestion from './views/AddSuggestion';
import Profile from './views/Profile';
import Notifications from './views/Notifications';
import Friends from './views/Friends';
import CompleteProfile from './views/CompleteProfile';
import Inspiration from './views/Inspiration';
import JoinTrip from './views/JoinTrip';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Loading from './components/Loading';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loading />;

  if (!user) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  // If user is logged in but has no profile, and isn't already on the complete-profile page
  if (!profile && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/welcome" element={<PublicRoute><Welcome /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/trips" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/trip/:id" element={<ProtectedRoute><TripSuggestions /></ProtectedRoute>} />
      <Route path="/trip/:id/about" element={<ProtectedRoute><TripAbout /></ProtectedRoute>} />
      <Route path="/trip/:id/add-suggestion" element={<ProtectedRoute><AddSuggestion /></ProtectedRoute>} />
      <Route path="/trip/:id/suggestion/:suggestionId" element={<ProtectedRoute><SuggestionDetail /></ProtectedRoute>} />
      <Route path="/add-trip" element={<ProtectedRoute><AddTrip /></ProtectedRoute>} />
      <Route path="/edit-trip/:id" element={<ProtectedRoute><EditTrip /></ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute><Holidays /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/finance/:tripId" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/finance/:tripId/add" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
      <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
      <Route path="/inspiration" element={<ProtectedRoute><Inspiration /></ProtectedRoute>} />
      <Route path="/join/:id" element={<JoinTrip />} />

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-warm-cream flex justify-center overflow-x-hidden">
          <div className="w-full max-w-[480px] shadow-2xl min-h-screen bg-warm-cream relative">
            <AppRoutes />
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
