
import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Loading from './components/Loading';

// Lazy loading views
const Welcome = React.lazy(() => import('./views/Welcome'));
const Login = React.lazy(() => import('./views/Login'));
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const Home = React.lazy(() => import('./views/Home'));
const TripSuggestions = React.lazy(() => import('./views/TripSuggestions'));
const TripAbout = React.lazy(() => import('./views/TripAbout'));
const SuggestionDetail = React.lazy(() => import('./views/SuggestionDetail'));
const AddTrip = React.lazy(() => import('./views/AddTrip'));
const EditTrip = React.lazy(() => import('./views/EditTrip'));
const Holidays = React.lazy(() => import('./views/Holidays'));
const Finance = React.lazy(() => import('./views/Finance'));
const AddSuggestion = React.lazy(() => import('./views/AddSuggestion'));
const Profile = React.lazy(() => import('./views/Profile'));
const Notifications = React.lazy(() => import('./views/Notifications'));
const Friends = React.lazy(() => import('./views/Friends'));
const CompleteProfile = React.lazy(() => import('./views/CompleteProfile'));
const Inspiration = React.lazy(() => import('./views/Inspiration'));
const JoinTrip = React.lazy(() => import('./views/JoinTrip'));

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
    <Suspense fallback={<Loading />}>
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
    </Suspense>
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
