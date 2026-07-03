import { Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { OrganizationDetailPage } from './pages/OrganizationDetailPage';
import { OrganizationFormPage } from './pages/OrganizationFormPage';
import { MembersPage } from './pages/MembersPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { MemberFormPage } from './pages/MemberFormPage';
import { InformantsPage } from './pages/InformantsPage';
import { InformantDetailPage } from './pages/InformantDetailPage';
import { InformantFormPage } from './pages/InformantFormPage';
import { CasesPage } from './pages/CasesPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { EvidencePage } from './pages/EvidencePage';
import { HideoutsPage } from './pages/HideoutsPage';
import { SurveillancePage } from './pages/SurveillancePage';
import { ArrestsPage } from './pages/ArrestsPage';
import { NotesPage } from './pages/NotesPage';
import { SearchPage } from './pages/SearchPage';
import { BrouillonsPage } from './pages/BrouillonsPage';
import { SettingsPage } from './pages/SettingsPage';
import { WantedPersonsPage } from './pages/WantedPersonsPage';
import { LogsPage } from './pages/LogsPage';
import { MapPage } from './pages/MapPage';
import { PeriodicReportsPage } from './pages/PeriodicReportsPage';
import { PlantationsPage } from './pages/PlantationsPage';
import { PlantationDetailPage } from './pages/PlantationDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <h1 style={{ color: 'white', fontSize: 20, marginBottom: 16 }}>Une erreur est survenue</h1>
            <p style={{ color: '#9ca3af', marginBottom: 16 }}>{this.state.error?.message || 'Erreur inconnue'}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 16px', background: '#284d8a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              Rafraîchir
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #22d3ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#9ca3af', marginTop: 16 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />
      <Route path="/organizations/new" element={<ProtectedRoute><OrganizationFormPage /></ProtectedRoute>} />
      <Route path="/organizations/:id" element={<ProtectedRoute><OrganizationDetailPage /></ProtectedRoute>} />
      <Route path="/organizations/:id/edit" element={<ProtectedRoute><OrganizationFormPage /></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
      <Route path="/members/new" element={<ProtectedRoute><MemberFormPage /></ProtectedRoute>} />
      <Route path="/members/:id" element={<ProtectedRoute><MemberDetailPage /></ProtectedRoute>} />
      <Route path="/members/:id/edit" element={<ProtectedRoute><MemberFormPage /></ProtectedRoute>} />
      <Route path="/informants" element={<ProtectedRoute><InformantsPage /></ProtectedRoute>} />
      <Route path="/informants/new" element={<ProtectedRoute><InformantFormPage /></ProtectedRoute>} />
      <Route path="/informants/:id" element={<ProtectedRoute><InformantDetailPage /></ProtectedRoute>} />
      <Route path="/informants/:id/edit" element={<ProtectedRoute><InformantFormPage /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
      <Route path="/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
      <Route path="/evidence" element={<ProtectedRoute><EvidencePage /></ProtectedRoute>} />
      <Route path="/hideouts" element={<ProtectedRoute><HideoutsPage /></ProtectedRoute>} />
      <Route path="/surveillance" element={<ProtectedRoute><SurveillancePage /></ProtectedRoute>} />
      <Route path="/arrests" element={<ProtectedRoute><ArrestsPage /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/brouillons" element={<ProtectedRoute><BrouillonsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/wanted" element={<ProtectedRoute><WantedPersonsPage /></ProtectedRoute>} />
      <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><PeriodicReportsPage /></ProtectedRoute>} />
      <Route path="/plantations" element={<ProtectedRoute><PlantationsPage /></ProtectedRoute>} />
      <Route path="/plantations/:id" element={<ProtectedRoute><PlantationDetailPage /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute><div style={{ padding: 32, textAlign: 'center', color: 'white' }}><h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Favoris</h2><p style={{ color: '#9ca3af' }}>Ajoutez des éléments en favoris pour les retrouver rapidement.</p></div></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <AppRoutes />
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
