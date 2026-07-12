import { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authActions } from '../store/authSlice';

const validateEmail = (email: string) => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
  return '';
};

const validatePassword = (password: string) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
};

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailRef = useRef<HTMLInputElement>(null);

  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(authActions.clearError()), 6000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr || pErr) {
      if (eErr) emailRef.current?.focus();
      return;
    }

    dispatch(authActions.loginRequest({ email, password, remember }));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-black/20 to-slate-900/40" />
      <div className="absolute inset-0 backdrop-blur-[3px]" />

      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-300/15 rounded-full blur-3xl" />

      <div
        className="relative z-10 w-full max-w-[530px] mx-4"
        style={{
          background: 'rgba(30,30,30,0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="px-10 py-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10B981' }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white/90">ADIU PAYROLL</span>
          </div>
          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-white leading-tight mb-1">Welcome Back</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Sign in to access your payroll dashboard</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="flex items-start gap-3 bg-rose-500/20 border border-rose-400/30 rounded-xl p-3.5 mb-6"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-200">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5 max-w-[380px] mx-auto">
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold mb-1.5 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6B7280' }} />
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailError}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    border: emailError ? '1px solid rgba(251,146,60,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  className="w-full pl-9 pr-3 py-3 text-sm transition-all placeholder:text-white/25 focus:border-white focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
                  placeholder="you@company.com"
                  autoComplete="email"
                  onFocus={(e) => (e.target.style.borderColor = '#fff')}
                  onBlur={(e) => {
                    e.target.style.borderColor = emailError ? 'rgba(251,146,60,0.5)' : 'rgba(255,255,255,0.1)';
                    setTouched((p) => ({ ...p, email: true }));
                  }}
                />
              </div>
              {emailError && (
                <p className="text-xs text-rose-300 mt-1.5 font-medium">{emailError}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold mb-1.5 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6B7280' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!passwordError}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    border: passwordError ? '1px solid rgba(251,146,60,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  className="w-full pl-9 pr-9 py-3 text-sm transition-all placeholder:text-white/25 focus:border-white focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  onFocus={(e) => (e.target.style.borderColor = '#fff')}
                  onBlur={(e) => {
                    e.target.style.borderColor = passwordError ? 'rgba(251,146,60,0.5)' : 'rgba(255,255,255,0.1)';
                    setTouched((p) => ({ ...p, password: true }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors rounded focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
                  style={{ color: '#6B7280' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-rose-300 mt-1.5 font-medium">{passwordError}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className="w-[18px] h-[18px] rounded flex items-center justify-center transition-all group-hover:border-white/40 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/40"
                  style={{
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: remember ? '#10B981' : 'transparent',
                    borderColor: remember ? '#10B981' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {remember && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm select-none transition-colors group-hover:text-white/70" style={{ color: '#9CA3AF' }}>
                  Remember me
                </span>
              </label>
            </div>

            <button
              type="button"
              className="w-full text-sm font-medium text-left transition-colors rounded hover:text-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
              style={{ color: '#10B981' }}
            >
              Forgot password?
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
              style={{ background: '#10B981' }}
            >
              {loading ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
