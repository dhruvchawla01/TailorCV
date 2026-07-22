import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Mail, Lock, User, Sparkles, AlertTriangle } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { setToken, setUser, setLoading, isLoading } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch auth config to check if Google SSO is enabled
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await api.auth.getConfig();
        if (config.google_client_id) {
          setGoogleClientId(config.google_client_id);
        }
      } catch (err) {
        console.error('Failed to load Google Auth configuration:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await api.auth.googleLogin(response.credential);
      setToken(res.access_token);
      const userResponse = await api.auth.getMe();
      setUser(userResponse);
    } catch (err: any) {
      setServerError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load Google Identity Services SDK when client ID is available
  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        google.accounts.id.renderButton(
          document.getElementById('googleButton'),
          { theme: 'outline', size: 'large', width: 384, text: 'signin_with' }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    setServerError(null);
    try {
      if (isLogin) {
        const response = await api.auth.login(data.email, data.password);
        setToken(response.access_token);
        const userResponse = await api.auth.getMe();
        setUser(userResponse);
      } else {
        await api.auth.register(data.email, data.password, data.fullName);
        // Automatically login after successful registration
        const response = await api.auth.login(data.email, data.password);
        setToken(response.access_token);
        const userResponse = await api.auth.getMe();
        setUser(userResponse);
      }
    } catch (err: any) {
      setServerError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setServerError(null);
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-brand-200 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-brand-500/25">
            <Sparkles className="text-bg-dark text-xl animate-pulse" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">TailorCV</h2>
          <p className="text-slate-400 text-sm mt-1 text-center">
            {isLogin ? 'Sign in to generate ATS-friendly resumes' : 'Create your master professional profile'}
          </p>
        </div>

        {/* Error Notification */}
        {serverError && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-sm">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  className={`w-full bg-slate-900/60 border border-slate-700 text-white rounded-xl py-2.5 pl-11 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${errors.fullName ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500' : ''}`}
                  {...register('fullName', { required: !isLogin })}
                />
              </div>
              {errors.fullName && <p className="text-red-400 text-xs mt-1">Full Name is required</p>}
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                className={`w-full bg-slate-900/60 border border-slate-700 text-white rounded-xl py-2.5 pl-11 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${errors.email ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500' : ''}`}
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                })}
              />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full bg-slate-900/60 border border-slate-700 text-white rounded-xl py-2.5 pl-11 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors ${errors.password ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500' : ''}`}
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
              />
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message as string}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-brand-600 to-teal-500 text-white font-semibold py-2.5 rounded-xl hover:from-brand-500 hover:to-teal-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {googleClientId && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-850" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0f172a] px-2 text-slate-400">Or continue with</span>
              </div>
            </div>

            <div className="flex justify-center">
              <div id="googleButton" className="w-full flex justify-center" />
            </div>
          </>
        )}

        {/* Mode Switcher */}
        <div className="mt-8 text-center text-slate-400 text-sm border-t border-slate-800/80 pt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="text-brand-500 hover:text-brand-400 font-semibold cursor-pointer underline transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
