import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from './store/authStore';
import wsService from './services/websocket';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TrackingPage from './pages/TrackingPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import GeofencesPage from './pages/GeofencesPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import MaintenancePage from './pages/MaintenancePage';
import TasksPage from './pages/TasksPage';
import FuelPage from './pages/FuelPage';
import DriverBehaviorPage from './pages/DriverBehaviorPage';
import TemperaturePage from './pages/TemperaturePage';
import CompaniesPage from './pages/CompaniesPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Protected route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated, accessToken, user } = useAuthStore();

  // Apply language direction on mount and language change
  useEffect(() => {
    const lang = i18n.language || 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      wsService.connect(accessToken);
    }
    return () => wsService.disconnect();
  }, [isAuthenticated, accessToken]);

  // Apply theme
  useEffect(() => {
    const theme = user?.theme || localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [user?.theme]);

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
      } />
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="geofences" element={<GeofencesPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="fuel" element={<FuelPage />} />
        <Route path="driver-behavior" element={<DriverBehaviorPage />} />
        <Route path="temperature" element={<TemperaturePage />} />
        <Route path="companies" element={
          <ProtectedRoute roles={['super_admin']}>
            <CompaniesPage />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={
          <ProtectedRoute roles={['super_admin', 'admin']}>
            <UsersPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
