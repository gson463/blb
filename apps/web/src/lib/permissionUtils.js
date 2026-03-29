
export const ROLE_PERMISSIONS = {
  manager: [
    'view_properties', 'create_properties', 'edit_properties', 'delete_properties',
    'view_invoices', 'create_invoices', 'edit_invoices',
    'view_payments', 'create_payments', 'approve_payments', 'reject_payments',
    'view_reports', 'manage_staff',
    'view_tenants', 'manage_tenants',
    'view_leases', 'manage_leases',
    'view_units', 'manage_units'
  ],
  accountant: [
    'view_invoices', 'create_invoices', 'edit_invoices',
    'view_payments', 'create_payments', 'approve_payments', 'reject_payments',
    'view_reports'
  ],
  collector: [
    'view_properties',
    'view_invoices',
    'view_payments', 'create_payments',
    'view_units',
    'view_tenants'
  ]
};

export const getPermissionsByRole = (role) => {
  if (!role) return [];
  return ROLE_PERMISSIONS[role.toLowerCase()] || [];
};

export const hasPermission = (userRole, action) => {
  if (!userRole) return false;
  // Landlords have all permissions implicitly in this system context
  if (userRole === 'landlord') return true;
  
  const permissions = getPermissionsByRole(userRole);
  return permissions.includes(action);
};

export const canViewProperties = (userRole) => hasPermission(userRole, 'view_properties');
export const canManagePayments = (userRole) => hasPermission(userRole, 'create_payments') || hasPermission(userRole, 'approve_payments');
export const canApprovePayments = (userRole) => hasPermission(userRole, 'approve_payments');
export const canViewReports = (userRole) => hasPermission(userRole, 'view_reports');
export const canManageStaff = (userRole) => hasPermission(userRole, 'manage_staff');

export const getAssignedProperties = (staff) => {
  if (!staff || !staff.assigned_properties) return [];
  return Array.isArray(staff.assigned_properties) ? staff.assigned_properties : [staff.assigned_properties];
};
