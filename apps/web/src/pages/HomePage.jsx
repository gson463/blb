import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Building2, Home, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>BELIBELI DIGITAL MANAGER</title>
        <meta
          name="description"
          content="Choose how to sign in: owner & staff, or tenant."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(222_47%_6%)] px-4 py-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(90vw,560px)] h-[min(90vw,560px)] bg-primary/12 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 text-center mb-10 md:mb-14"
        >
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 ring-1 ring-white/15 mb-5">
            <Building2 className="h-8 w-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
            BELIBELI DIGITAL MANAGER
          </h1>
          <p className="text-sm sm:text-base text-white/55 max-w-md mx-auto leading-relaxed">
            Private system. Choose how you want to sign in.
          </p>
        </motion.div>

        <div className="relative z-10 w-full max-w-lg grid gap-4 sm:gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Link
              to="/login"
              className="group flex items-center gap-4 sm:gap-5 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 sm:p-6 text-left transition-all hover:bg-white/[0.1] hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/25">
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-base sm:text-lg">
                  Owner & team
                </p>
                <p className="text-sm text-white/55 mt-0.5">
                  Dashboard, properties, payments, reports
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/35 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            <Link
              to="/tenant/login"
              className="group flex items-center gap-4 sm:gap-5 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 sm:p-6 text-left transition-all hover:bg-white/[0.1] hover:border-emerald-400/35 hover:shadow-lg hover:shadow-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/25">
                <Home className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-base sm:text-lg">
                  Tenant
                </p>
                <p className="text-sm text-white/55 mt-0.5">
                  Tenant portal — invoices, payments, lease
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/35 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="relative z-10 mt-12 text-xs text-white/30 text-center max-w-sm"
        >
          Need a landlord account for first-time setup?{' '}
          <Link to="/signup" className="text-white/50 hover:text-white/70 underline underline-offset-2">
            Register once
          </Link>
        </motion.p>
      </div>
    </>
  );
};

export default HomePage;
