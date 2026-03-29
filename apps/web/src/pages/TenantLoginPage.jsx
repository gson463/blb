import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Lock, Mail, KeyRound, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const TenantLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      const userRole = result.user.role;
      if (userRole === 'tenant') {
        navigate('/tenant/dashboard');
        return;
      }
      pb.authStore.clear();
      setError(
        'This is not a tenant account. Owners and staff use the other sign-in page.'
      );
      setLoading(false);
      return;
    }

    setError(result.error);
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Tenant sign in — BELIBELI</title>
        <meta
          name="description"
          content="Tenant portal — invoices, payments, and your home."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col lg:flex-row bg-[hsl(160_25%_8%)]">
        <div className="relative lg:w-[46%] xl:w-[44%] min-h-[200px] lg:min-h-screen overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-white">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[hsl(160_30%_10%)] via-[hsl(175_28%_12%)] to-[hsl(200_35%_9%)]"
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="absolute top-0 right-0 w-[min(100%,420px)] h-[min(100%,420px)] bg-emerald-500/20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/4 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-emerald-400/25">
                <Home className="h-6 w-6 text-emerald-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                  Tenant portal
                </p>
                <p className="text-lg font-semibold tracking-tight">BELIBELI</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative z-10 hidden lg:block space-y-6 max-w-md"
          >
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.15] text-white">
              Welcome to your{' '}
              <span className="text-emerald-400">tenant portal</span>
            </h1>
            <p className="text-sm text-white/65 leading-relaxed">
              View invoices, pay rent, and track your tenancy — using the account your landlord
              created for you.
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <KeyRound className="h-5 w-5 shrink-0 text-emerald-400/90 mt-0.5" />
                <span>Sign in with the email and password your landlord provided.</span>
              </li>
              <li className="flex items-start gap-3">
                <Leaf className="h-5 w-5 shrink-0 text-emerald-400/90 mt-0.5" />
                <span>This page is for tenants only — not for owners or staff.</span>
              </li>
            </ul>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="relative z-10 hidden lg:block text-xs text-white/35"
          >
            © {new Date().getFullYear()} · Tenant portal
          </motion.p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="w-full max-w-[400px]"
          >
            <div className="lg:hidden mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                <Home className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tenant portal
                </p>
                <p className="font-semibold text-foreground">BELIBELI</p>
              </div>
            </div>

            <div className="mb-8 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Tenant sign in
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use your tenant account email and password.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-xl shadow-black/[0.04] p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="tenant-email"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                    <Input
                      id="tenant-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      className="h-12 pl-10 rounded-xl border-border/90 bg-background/50 focus-visible:ring-emerald-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="tenant-password"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                    <Input
                      id="tenant-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className="h-12 pl-10 rounded-xl border-border/90 bg-background/50 focus-visible:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20"
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    'Enter portal'
                  )}
                </Button>
              </form>
            </div>

            <div className="mt-8 space-y-3 text-center text-xs text-muted-foreground leading-relaxed">
              <p>
                <Link to="/tenant/guide" className="text-foreground/80 hover:underline">
                  How to use the portal
                </Link>
              </p>
              <p>
                <Link to="/" className="text-foreground/80 hover:underline">
                  ← Back to home
                </Link>
                {' · '}
                <Link to="/login" className="text-foreground/80 hover:underline">
                  Owner / staff sign-in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default TenantLoginPage;
