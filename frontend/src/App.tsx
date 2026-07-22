import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { api } from './services/api';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import ApplicationEditor from './pages/ApplicationEditor';
import { Sparkles, LogOut, User, Briefcase } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainContent() {
  const { isAuthenticated, setUser, logout, user, setLoading } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile' | 'workspace'>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  // Sync user profile data on load
  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthenticated) {
        setLoading(true);
        try {
          const userResponse = await api.auth.getMe();
          setUser(userResponse);
        } catch {
          // Token expired or invalid
          logout();
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUser();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Auth />;
  }

  const navigateToWorkspace = (id: number) => {
    setSelectedAppId(id);
    setCurrentPage('workspace');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="glass border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div 
          onClick={() => { setCurrentPage('dashboard'); setSelectedAppId(null); }}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-brand-200 rounded-lg flex items-center justify-center shadow-md shadow-brand-500/10 group-hover:scale-105 transition-transform">
            <Sparkles className="text-bg-dark text-lg" size={18} />
          </div>
          <span className="font-extrabold text-white tracking-tight text-lg">TailorCV</span>
        </div>

        {/* Navigation buttons */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/40 p-1 border border-slate-850 rounded-xl">
          <button
            onClick={() => { setCurrentPage('dashboard'); setSelectedAppId(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${currentPage === 'dashboard' || currentPage === 'workspace' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Briefcase size={13} />
            <span>Applications</span>
          </button>
          <button
            onClick={() => { setCurrentPage('profile'); setSelectedAppId(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${currentPage === 'profile' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <User size={13} />
            <span>Master Profile</span>
          </button>
        </nav>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right hidden sm:flex">
            <div className="text-xs">
              <span className="font-semibold text-white block">{user?.full_name || 'Job Seeker'}</span>
              <span className="text-slate-500 text-[10px] block">{user?.email}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-center text-brand-400 font-bold uppercase text-xs">
              {(user?.full_name || user?.email || 'U')[0]}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Body container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {currentPage === 'dashboard' && (
          <Dashboard 
            onSelectApplication={navigateToWorkspace}
            onNavigateToProfile={() => setCurrentPage('profile')}
          />
        )}
        {currentPage === 'profile' && (
          <ProfilePage 
            onBackToDashboard={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'workspace' && selectedAppId !== null && (
          <ApplicationEditor 
            applicationId={selectedAppId}
            onBackToDashboard={() => { setCurrentPage('dashboard'); setSelectedAppId(null); }}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainContent />
    </QueryClientProvider>
  );
}
