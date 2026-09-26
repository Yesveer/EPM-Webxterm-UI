'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Terminal, Loader2, Lock, Shield, Zap, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { authAPI } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// ─── Floating orb ────────────────────────────────────────────────────────────
function FloatingOrb({ size, x, y, delay }: { size: number; x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left: x, top: y,
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
      }}
      animate={{ y: [0, -20, 0], opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 6 + delay * 1.5, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [tempToken, setTempToken]             = useState<string | null>(null);

  const { login } = useAuth();
  const { branding } = useBranding();
  const router    = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = sessionStorage.getItem('vsay-reset-token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setTempToken(token);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({ title: 'Validation Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Validation Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (!tempToken) return;

    setLoading(true);
    try {
      const result = await authAPI.changePassword(tempToken, newPassword);
      sessionStorage.removeItem('vsay-reset-token');
      login(result.token, result.user, result.session_token, result.available_tenants);
      toast({ title: 'Password set!', description: 'Welcome. Your password has been updated.' });
      window.location.replace('/dashboard');
    } catch (error) {
      toast({
        title: 'Failed to update password',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel — Branding ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.15), transparent)' }}
        />

        <FloatingOrb size={320} x="60%" y="-5%" delay={0} />
        <FloatingOrb size={200} x="-8%" y="55%" delay={1.4} />
        <FloatingOrb size={160} x="70%" y="65%" delay={2.2} />

        {[
          { x: '12%', y: '18%' }, { x: '78%', y: '12%' }, { x: '88%', y: '45%' },
          { x: '8%', y: '78%' },  { x: '55%', y: '88%' }, { x: '35%', y: '5%' },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/50 pointer-events-none"
            style={{ left: pos.x, top: pos.y }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.6, 1] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.6 }}
          />
        ))}

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="relative">
              {!branding.logo_url && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl bg-primary/30 blur-sm pointer-events-none"
                />
              )}
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="" className="relative w-12 h-12 object-contain" />
              ) : (
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <Terminal className="w-6 h-6" />
                </div>
              )}
            </div>
            <span className="text-4xl font-extrabold tracking-tight">
              <span>{branding.name_part1}</span>
              <span className="text-primary">{branding.name_part2}</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
              Secure SSH Access<br />
              <span className="gradient-text">Made Simple</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
              Manage servers, run commands, and monitor your entire infrastructure
              from a single dashboard — browser, CLI, or IDE.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap gap-2.5 mt-10"
          >
            {[
              { icon: Zap,    text: 'Zero open ports' },
              { icon: Shield, text: 'TLS 1.3 encrypted' },
              { icon: Globe,  text: 'Linux · macOS · Windows' },
            ].map((chip, i) => (
              <motion.div
                key={chip.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 border border-border/60 text-xs text-muted-foreground backdrop-blur-sm"
              >
                <chip.icon className="h-3 w-3 text-primary" />
                {chip.text}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel — Form ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="lg:hidden flex items-center justify-center gap-3 mb-8"
          >
            <div className="relative">
              {!branding.logo_url && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl bg-primary/30 blur-sm pointer-events-none"
                />
              )}
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="" className="relative w-10 h-10 object-contain" />
              ) : (
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
                  <Terminal className="w-5 h-5" />
                </div>
              )}
            </div>
            <span className="text-3xl font-extrabold tracking-tight">
              <span>{branding.name_part1}</span>
              <span className="text-primary">{branding.name_part2}</span>
            </span>
          </motion.div>

          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
            >
              <Lock className="w-7 h-7 text-primary" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold">Set your password</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Your account requires a new password before you can continue.
              </p>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-2"
            >
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 transition-all duration-200 focus:border-primary/60 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </motion.div>

            {/* Confirm Password */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.27 }}
              className="space-y-2"
            >
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 transition-all duration-200 focus:border-primary/60 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.34 }}
            >
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={loading || !tempToken}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    'Set New Password'
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
