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
import { cn } from '../../../lib/utils';

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
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-light/30 via-white to-brand-primary/10" />
      
      {/* Animated Orbs */}
      <motion.div 
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-300/20 rounded-full blur-[120px]" 
      />
      <motion.div 
        animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-200/20 rounded-full blur-[100px]" 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[500px] mx-4 glass rounded-[40px] p-12 border-white shadow-2xl"
      >
        <div className="">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-brand-primary rounded-3xl shadow-xl shadow-brand-900/20 flex items-center justify-center mb-6">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-500 font-medium">Precision payroll for modern enterprises.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-8"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-2xl text-sm transition-all focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:outline-none border border-slate-200 focus:border-brand-primary shadow-sm",
                    emailError && "border-rose-300 bg-rose-50/50"
                  )}
                  placeholder="you@company.com"
                />
              </div>
              {emailError && (
                <p className="text-xs text-rose-500 mt-1 font-bold pl-1">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-bold text-brand-primary hover:text-brand-dark transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-12 py-3.5 bg-white/50 rounded-2xl text-sm transition-all focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:outline-none border border-slate-200 focus:border-brand-primary shadow-sm",
                    passwordError && "border-rose-300 bg-rose-50/50"
                  )}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-rose-500 mt-1 font-bold pl-1">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 border-slate-200 transition-all peer-checked:bg-brand-primary peer-checked:border-brand-primary group-hover:border-brand-primary",
                    remember && "shadow-lg shadow-brand-500/20"
                  )}>
                    {remember && (
                      <svg className="w-3.5 h-3.5 text-white m-auto mt-0.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                  Keep me signed in
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] bg-brand-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-brand-dark hover:shadow-xl hover:shadow-brand-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
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

          <p className="mt-10 text-center text-xs font-bold text-slate-400">
            Powered by ADIU Communication & Finance
          </p>
        </div>
      </motion.div>
    </div>
  );
};
