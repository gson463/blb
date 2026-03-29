import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { getAppConfig } from '@/lib/appConfig';
import Header from '@/components/Header.jsx';
import TenantShell from '@/components/TenantShell.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen } from 'lucide-react';

const TenantGuidePage = () => {
  const { isAuthenticated, userRole } = useAuth();
  const useTenantChrome = isAuthenticated && userRole === 'tenant';
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getAppConfig();
        setBody(cfg?.tenant_guide?.trim() ?? '');
      } catch (e) {
        console.error(e);
        setBody('');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const guideMain = (
    <main className="container mx-auto flex-1 px-4 py-10 sm:px-6 lg:px-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tenants</p>
          <h1 className="text-2xl font-semibold tracking-tight">How to use the portal</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : body ? (
        <article className="max-w-none text-foreground/90 whitespace-pre-wrap text-[15px] leading-relaxed">
          {body}
        </article>
      ) : (
        <p className="text-muted-foreground leading-relaxed">
          Your landlord has not published a guide yet. If you need help, use the contact details in the
          footer, or reach out to your landlord directly.
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
          <Link to="/tenant/login">Tenant sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Home</Link>
        </Button>
      </div>
    </main>
  );

  return (
    <>
      <Helmet>
        <title>How to use the tenant portal — BELIBELI</title>
        <meta
          name="description"
          content="Instructions for using the BELIBELI tenant portal: invoices, payments, and your lease."
        />
      </Helmet>
      {useTenantChrome ? <TenantShell>{guideMain}</TenantShell> : (
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          {guideMain}
          <Footer />
        </div>
      )}
    </>
  );
};

export default TenantGuidePage;
