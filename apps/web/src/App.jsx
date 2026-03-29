
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProtectedStaffRoute from './components/ProtectedStaffRoute.jsx';
import TenantLayout from './components/TenantLayout.jsx';

// Public Pages
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';

// Landlord Pages
import LandlordDashboard from './pages/LandlordDashboard.jsx';
import PropertyManagement from './pages/PropertyManagement.jsx';
import UnitManagement from './pages/UnitManagement.jsx';
import TenantManagement from './pages/TenantManagement.jsx';
import LeaseManagement from './pages/LeaseManagement.jsx';
import InvoiceManagement from './pages/InvoiceManagement.jsx';
import PaymentManagement from './pages/PaymentManagement.jsx';
import PaymentHistory from './pages/PaymentHistory.jsx';

// Staff Pages
import StaffDashboard from './pages/StaffDashboard.jsx';
import StaffManagement from './pages/StaffManagement.jsx';
import StaffProfilePage from './pages/StaffProfilePage.jsx';

// Report Pages
import ReportsDashboard from './pages/reports/ReportsDashboard.jsx';
import FinancialReport from './pages/reports/FinancialReport.jsx';
import OccupancyReport from './pages/reports/OccupancyReport.jsx';
import PaymentAnalytics from './pages/reports/PaymentAnalytics.jsx';
import LeaseReport from './pages/reports/LeaseReport.jsx';
import PropertyReport from './pages/reports/PropertyReport.jsx';

// Tenant Pages
import TenantDashboard from './pages/TenantDashboard.jsx';
import TenantUnitPage from './pages/TenantUnitPage.jsx';
import TenantLeasePage from './pages/TenantLeasePage.jsx';
import TenantInvoicesPage from './pages/TenantInvoicesPage.jsx';
import TenantPaymentHistoryPage from './pages/TenantPaymentHistoryPage.jsx';
import TenantPaymentUploadPage from './pages/TenantPaymentUploadPage.jsx';
import TenantProfilePage from './pages/TenantProfilePage.jsx';
import LandlordProfilePage from './pages/LandlordProfilePage.jsx';
import TenantLoginPage from './pages/TenantLoginPage.jsx';
import SystemConfigurationPage from './pages/SystemConfigurationPage.jsx';
import TenantGuidePage from './pages/TenantGuidePage.jsx';
import SmsNotificationsPage from './pages/SmsNotificationsPage.jsx';
import ActivityLogPage from './pages/ActivityLogPage.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/tenant/login" element={<TenantLoginPage />} />
          <Route path="/tenant/guide" element={<TenantGuidePage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LandlordProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Landlord Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LandlordDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <PropertyManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/units"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <UnitManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <TenantManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leases"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LeaseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <InvoiceManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <PaymentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-history"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <PaymentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-management"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <StaffManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <SystemConfigurationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/sms"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <SmsNotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <ActivityLogPage />
              </ProtectedRoute>
            }
          />

          {/* Staff Routes */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedStaffRoute>
                <StaffDashboard />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/properties"
            element={
              <ProtectedStaffRoute requiredPermission="view_properties">
                <PropertyManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/units"
            element={
              <ProtectedStaffRoute requiredPermission="view_units">
                <UnitManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/tenants"
            element={
              <ProtectedStaffRoute requiredPermission="view_tenants">
                <TenantManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/leases"
            element={
              <ProtectedStaffRoute requiredPermission="view_leases">
                <LeaseManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/invoices"
            element={
              <ProtectedStaffRoute requiredPermission="view_invoices">
                <InvoiceManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/payments"
            element={
              <ProtectedStaffRoute requiredPermission="view_payments">
                <PaymentManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/payment-history"
            element={
              <ProtectedStaffRoute requiredPermission="view_payments">
                <PaymentHistory />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/staff-management"
            element={
              <ProtectedStaffRoute requiredPermission="manage_staff">
                <StaffManagement />
              </ProtectedStaffRoute>
            }
          />
          <Route
            path="/staff/profile"
            element={
              <ProtectedStaffRoute>
                <StaffProfilePage />
              </ProtectedStaffRoute>
            }
          />

          {/* Report Routes */}
          <Route
            path="/reports/dashboard"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'staff']}>
                <ReportsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/financial"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'staff']}>
                <FinancialReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/occupancy"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'staff']}>
                <OccupancyReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/payment-analytics"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'staff']}>
                <PaymentAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/lease"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'staff']}>
                <LeaseReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/property"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'staff']}>
                <PropertyReport />
              </ProtectedRoute>
            }
          />

          {/* Tenant Routes */}
          <Route
            path="/tenant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantDashboard />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/unit"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantUnitPage />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/lease"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantLeasePage />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/invoices"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantInvoicesPage />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/payment-history"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantPaymentHistoryPage />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/upload-payment"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantPaymentUploadPage />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/profile"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantLayout>
                  <TenantProfilePage />
                </TenantLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
