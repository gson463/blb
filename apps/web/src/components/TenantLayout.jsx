import React from 'react';
import TenantShell from './TenantShell.jsx';

const TenantLayout = ({ children }) => {
  return (
    <TenantShell>
      <main className="flex-1 py-8">{children}</main>
    </TenantShell>
  );
};

export default TenantLayout;
