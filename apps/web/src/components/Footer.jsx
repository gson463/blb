import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAppConfig } from '@/lib/appConfig';

const Footer = () => {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await getAppConfig();
        if (!cancelled) setCfg(row);
      } catch {
        if (!cancelled) setCfg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = cfg?.landlord_public_name?.trim();
  const email = cfg?.contact_email?.trim();
  const phone = cfg?.contact_phone?.trim();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <span className="font-bold text-lg">BELIBELI DIGITAL MANAGER</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Professional property management software designed for modern landlords and property managers.
            </p>
          </div>

          {/* Tenant resources */}
          <div>
            <span className="font-semibold text-sm mb-4 block">Tenant resources</span>
            <nav className="flex flex-col space-y-2">
              <Link
                to="/tenant/guide"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                How to use the portal
              </Link>
              <Link
                to="/tenant/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Tenant sign in
              </Link>
            </nav>
          </div>

          {/* Contact — from system configuration */}
          <div>
            <span className="font-semibold text-sm mb-4 block">Contact</span>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              {displayName && <p className="text-foreground/90 font-medium">{displayName}</p>}
              {email && (
                <p>
                  Email:{' '}
                  <a href={`mailto:${email}`} className="hover:text-foreground underline-offset-2 hover:underline">
                    {email}
                  </a>
                </p>
              )}
              {phone && <p>Phone: {phone}</p>}
              {!displayName && !email && !phone && (
                <p className="text-muted-foreground/80">
                  Contact details are set by your landlord in system configuration.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BELIBELI DIGITAL MANAGER. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
