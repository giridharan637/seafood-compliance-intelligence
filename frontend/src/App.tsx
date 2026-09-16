import React, { useState, useEffect, Suspense, lazy } from 'react';
import { NavigationRole, AdminTab } from './types';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardShellSkeleton } from './components/SkeletonLoaders';

// Direct import for initial Landing Page for zero lag on first paint
import { RoleSelectionLanding } from './components/RoleSelectionLanding';

// Lazy load other dashboard views for code-splitting and rapid website loading
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ComplianceOfficerDashboard = lazy(() => import('./components/ComplianceOfficerDashboard').then(m => ({ default: m.ComplianceOfficerDashboard })));
const TransportOperationsDashboard = lazy(() => import('./components/TransportOperationsDashboard').then(m => ({ default: m.TransportOperationsDashboard })));
const FailureModesPage = lazy(() => import('./components/FailureModesPage').then(m => ({ default: m.FailureModesPage })));
const FieldWorkflowMap = lazy(() => import('./components/FieldWorkflowMap').then(m => ({ default: m.FieldWorkflowMap })));
const BaselineExperimentPage = lazy(() => import('./components/BaselineExperimentPage').then(m => ({ default: m.BaselineExperimentPage })));
const ThresholdTuningPage = lazy(() => import('./components/ThresholdTuningPage').then(m => ({ default: m.ThresholdTuningPage })));
const ErrorAnalysisPage = lazy(() => import('./components/ErrorAnalysisPage').then(m => ({ default: m.ErrorAnalysisPage })));
const UserFeedbackPage = lazy(() => import('./components/UserFeedbackPage').then(m => ({ default: m.UserFeedbackPage })));
const TechnicalDocsPage = lazy(() => import('./components/TechnicalDocsPage').then(m => ({ default: m.TechnicalDocsPage })));
const DatasetExplorerPage = lazy(() => import('./components/DatasetExplorerPage').then(m => ({ default: m.DatasetExplorerPage })));
const ManualComplianceEntryPage = lazy(() => import('./components/ManualComplianceEntryPage').then(m => ({ default: m.ManualComplianceEntryPage })));

function getRouteFromPath(pathname: string): { role: NavigationRole; tab: AdminTab } {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';

  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/home') {
    return { role: 'LANDING', tab: 'Dashboard' };
  }

  if (cleanPath === '/compliance' || cleanPath === '/compliance-hub') {
    return { role: 'COMPLIANCE', tab: 'Dashboard' };
  }

  if (cleanPath === '/transport' || cleanPath === '/operations') {
    return { role: 'TRANSPORT', tab: 'Dashboard' };
  }

  if (cleanPath === '/failure-modes') {
    return { role: 'FAILURE_MODES', tab: 'Dashboard' };
  }

  if (cleanPath === '/workflow-map') {
    return { role: 'WORKFLOW_MAP', tab: 'Dashboard' };
  }

  if (cleanPath === '/threshold-tuning') {
    return { role: 'THRESHOLD_TUNING', tab: 'Dashboard' };
  }

  if (cleanPath === '/error-analysis') {
    return { role: 'ERROR_ANALYSIS', tab: 'Dashboard' };
  }

  if (cleanPath === '/user-feedback') {
    return { role: 'USER_FEEDBACK', tab: 'Dashboard' };
  }

  if (cleanPath === '/tech-docs') {
    return { role: 'TECH_DOCS', tab: 'Dashboard' };
  }

  // Admin Routes
  if (cleanPath.startsWith('/admin')) {
    let tab: AdminTab = 'Dashboard';
    if (cleanPath.includes('/shipments')) tab = 'Shipments';
    else if (cleanPath.includes('/batches')) tab = 'Batches';
    else if (cleanPath.includes('/sensors')) tab = 'Sensors';
    else if (cleanPath.includes('/users')) tab = 'Users';
    else if (cleanPath.includes('/routes')) tab = 'Routes';
    else if (cleanPath.includes('/system-health') || cleanPath.includes('/health')) tab = 'Health';
    else if (cleanPath.includes('/reports')) tab = 'Reports';
    else if (cleanPath.includes('/experiments')) tab = 'Experiments';
    else if (cleanPath.includes('/settings')) tab = 'Settings';
    else if (cleanPath.includes('/dataset-explorer')) tab = 'DatasetExplorer';
    return { role: 'ADMIN', tab };
  }

  if (cleanPath === '/dataset-explorer') {
    return { role: 'DATASET_EXPLORER', tab: 'Dashboard' };
  }

  if (cleanPath === '/experiments') {
    return { role: 'EXPERIMENTS', tab: 'Dashboard' };
  }

  if (cleanPath === '/manual-entry' || cleanPath === '/manual-compliance-entry') {
    return { role: 'MANUAL_ENTRY', tab: 'Dashboard' };
  }

  // Fallback to landing
  return { role: 'LANDING', tab: 'Dashboard' };
}

export function App() {
  const [currentRole, setCurrentRole] = useState<NavigationRole>(() => {
    return typeof window !== 'undefined' ? getRouteFromPath(window.location.pathname).role : 'LANDING';
  });
  const [adminTab, setAdminTab] = useState<AdminTab>(() => {
    return typeof window !== 'undefined' ? getRouteFromPath(window.location.pathname).tab : 'Dashboard';
  });

  // Handle browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromPath(window.location.pathname);
      setCurrentRole(route.role);
      setAdminTab(route.tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigates and updates URL without full page reload
  const handleNavigate = (role: NavigationRole) => {
    setCurrentRole(role);

    const rolePathMap: Record<NavigationRole, string> = {
      'LANDING': '/',
      'ADMIN': '/admin/dashboard',
      'COMPLIANCE': '/compliance',
      'TRANSPORT': '/transport',
      'FAILURE_MODES': '/failure-modes',
      'WORKFLOW_MAP': '/workflow-map',
      'EXPERIMENTS': '/admin/experiments',
      'THRESHOLD_TUNING': '/threshold-tuning',
      'ERROR_ANALYSIS': '/error-analysis',
      'USER_FEEDBACK': '/user-feedback',
      'TECH_DOCS': '/tech-docs',
      'DATASET_EXPLORER': '/admin/dataset-explorer',
      'MANUAL_ENTRY': '/manual-entry',
    };

    const targetUrl = rolePathMap[role] || '/';
    window.history.pushState({ role }, '', targetUrl);

    if (role === 'ADMIN') {
      setAdminTab('Dashboard');
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <ErrorBoundary fallbackTitle="Application View Error" fallbackMessage="Unable to render the selected dashboard view. Click Retry to reload.">
          <Suspense fallback={<DashboardShellSkeleton />}>
            {/* Main View Router */}
            {currentRole === 'LANDING' && (
              <RoleSelectionLanding onSelectRole={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'ADMIN' && (
              <AdminDashboard 
                initialTab={adminTab}
                onNavigate={(role) => handleNavigate(role)} 
              />
            )}

            {currentRole === 'COMPLIANCE' && (
              <ComplianceOfficerDashboard onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'TRANSPORT' && (
              <TransportOperationsDashboard onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'FAILURE_MODES' && (
              <FailureModesPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'WORKFLOW_MAP' && (
              <FieldWorkflowMap onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'EXPERIMENTS' && (
              <BaselineExperimentPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'THRESHOLD_TUNING' && (
              <ThresholdTuningPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'ERROR_ANALYSIS' && (
              <ErrorAnalysisPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'USER_FEEDBACK' && (
              <UserFeedbackPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'TECH_DOCS' && (
              <TechnicalDocsPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'DATASET_EXPLORER' && (
              <DatasetExplorerPage onNavigate={(role) => handleNavigate(role)} />
            )}

            {currentRole === 'MANUAL_ENTRY' && (
              <ManualComplianceEntryPage onNavigate={(role) => handleNavigate(role)} />
            )}
          </Suspense>
        </ErrorBoundary>

        {/* Global Toast Notifications */}
        <ToastContainer />
      </div>
    </ToastProvider>
  );
}

export default App;
