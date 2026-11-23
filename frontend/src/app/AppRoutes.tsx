import { Navigate, Route, Routes } from "react-router-dom";

import { AdminShell } from "../components/layout/AdminShell";
import { PartnerShell } from "../components/layout/PartnerShell";
import { AdminLoginPage } from "../pages/AdminLogin";
import { AddCustomerPage } from "../pages/AddCustomer";
import { AdminCardSettingsPage } from "../pages/admin/AdminCardSettings";
import { AdminCustomerDetailPage } from "../pages/admin/AdminCustomerDetail";
import { AdminCustomersPage } from "../pages/admin/AdminCustomers";
import { AdminDashboardPage } from "../pages/admin/AdminDashboard";
import { AdminChangePasswordPage } from "../pages/admin/AdminChangePassword";
import { AdminHospitalsPage } from "../pages/admin/AdminHospitals";
import { AdminLocationsPage } from "../pages/admin/AdminLocations";
import { AdminPartnersPage } from "../pages/admin/AdminPartners";
import { AdminProfilePage } from "../pages/admin/AdminProfile";
import { AdminReportsPage } from "../pages/admin/AdminReports";
import { ChangePasswordPage } from "../pages/ChangePassword";
import { CustomerDetailPage } from "../pages/CustomerDetail";
import { CustomersPage } from "../pages/Customers";
import { DashboardPage } from "../pages/Dashboard";
import { EditCustomerPage } from "../pages/EditCustomer";
import { FindCardPage } from "../pages/FindCard";
import { HospitalsPage } from "../pages/Hospitals";
import { LoginPage } from "../pages/Login";
import { NotFoundPage } from "../pages/NotFound";
import { PrintingPage } from "../pages/Printing";
import { ProfilePage } from "../pages/Profile";
import { PublicCardStatusPage } from "../pages/PublicCardStatus";
import { SupportPage } from "../pages/Support";
import { RedirectIfAuthenticated, RequireAdmin, RequirePartner } from "./guards";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/admin/login"
        element={
          <RedirectIfAuthenticated>
            <AdminLoginPage />
          </RedirectIfAuthenticated>
        }
      />

      <Route path="/card-status/:cardId" element={<PublicCardStatusPage />} />

      <Route element={<RequirePartner />}>
        <Route element={<PartnerShell />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/customers" element={<CustomersPage />} />
          <Route path="/app/customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="/app/customers/:customerId/edit" element={<EditCustomerPage />} />
          <Route path="/app/add-customer" element={<AddCustomerPage />} />
          <Route path="/app/printing" element={<PrintingPage />} />
          {/* Legacy deep links — Today's Card and Total Printing merged into
              one Printing page with tabs (see Printing.tsx). */}
          <Route path="/app/today-card" element={<Navigate to="/app/printing" replace />} />
          <Route path="/app/total-printing" element={<Navigate to="/app/printing?tab=history" replace />} />
          <Route path="/app/find-card" element={<FindCardPage />} />
          <Route path="/app/hospitals" element={<HospitalsPage />} />
          <Route path="/app/support" element={<SupportPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/profile/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/partners" element={<AdminPartnersPage />} />
          <Route path="/admin/hospitals" element={<AdminHospitalsPage />} />
          <Route path="/admin/locations" element={<AdminLocationsPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/customers/:customerId" element={<AdminCustomerDetailPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/card-settings" element={<AdminCardSettingsPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/profile/change-password" element={<AdminChangePasswordPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
