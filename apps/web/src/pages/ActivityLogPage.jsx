import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import AppShell from '@/components/AppShell.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

const ActivityLogPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Rely on collection listRule (landlord_id / user_id / staff employer scope).
        const res = await pb.collection('activity_logs').getList(1, 100, {
          sort: '-created',
          $autoCancel: false,
        });
        if (!cancelled) setItems(res.items);
      } catch (e) {
        console.error(e);
        toast.error('Could not load activity log.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  return (
    <>
      <Helmet>
        <title>Activity log — BELIBELI</title>
      </Helmet>
      <AppShell>
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
          <div className="mb-8 flex items-center gap-3">
            <ScrollText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
              <p className="text-sm text-muted-foreground">
                Recent actions across invoices, payments, and leases (when logged).
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latest events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No activity recorded yet. Actions will appear here as you use the system.
                  </p>
                ) : (
                  items.map((row) => (
                    <div key={row.id} className="py-4 first:pt-0">
                      <p className="font-medium text-sm">{row.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.entity_type && row.entity_id
                          ? `${row.entity_type} · ${row.entity_id}`
                          : row.details || '—'}
                      </p>
                      {row.details && row.entity_type && (
                        <p className="text-sm text-muted-foreground mt-1">{row.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(row.created).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </AppShell>
    </>
  );
};

export default ActivityLogPage;
