import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
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

export function App() {
  const [currentRole, setCurrentRole] = useState<NavigationRole>('LANDING');
  const [adminTab, setAdminTab] = useState<AdminTab>('Dashboard');

  // Resolve path to role and tab
  const resolveRouteFromPath = useCallback((pathname: string) => {
    const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';

    if (cleanPath === '' || cleanPath === '/' || cleanPath === '/home') {
      setCurrentRole('LANDING');
      return;
    }

    if (cleanPath === '/compliance' || cleanPath === '/compliance-hub') {
      setCurrentRole('COMPLIANCE');
      return;
    }

    if (cleanPath === '/transport' || cleanPath === '/operations') {
      setCurrentRole('TRANSPORT');
      return;
    }

    if (cleanPath === '/failure-modes') {
      setCurrentRole('FAILURE_MODES');
      return;
    }

    if (cleanPath === '/workflow-map') {
      setCurrentRole('WORKFLOW_MAP');
      return;
    }

    if (cleanPath === '/threshold-tuning') {
      setCurrentRole('THRESHOLD_TUNING');
      return;
    }

    if (cleanPath === '/error-analysis') {
      setCurrentRole('ERROR_ANALYSIS');
      return;
    }

    if (cleanPath === '/user-feedback') {
      setCurrentRole('USER_FEEDBACK');
      return;
    }

    if (cleanPath === '/tech-docs') {
      setCurrentRole('TECH_DOCS');
      return;
    }

    // Admin Routes
    if (cleanPath.startsWith('/admin')) {
      setCurrentRole('ADMIN');
      if (cleanPath.includes('/shipments')) setAdminTab('Shipments');
      else if (cleanPath.includes('/batches')) setAdminTab('Batches');
      else if (cleanPath.includes('/sensors')) setAdminTab('Sensors');
      else if (cleanPath.includes('/users')) setAdminTab('Users');
      else if (cleanPath.includes('/routes')) setAdminTab('Routes');
      else if (cleanPath.includes('/system-health') || cleanPath.includes('/health')) setAdminTab('Health');
      else if (cleanPath.includes('/reports')) setAdminTab('Reports');
      else if (cleanPath.includes('/experiments')) setAdminTab('Experiments');
      else if (cleanPath.includes('/settings')) setAdminTab('Settings');
      else if (cleanPath.includes('/dataset-explorer')) setAdminTab('DatasetExplorer');
      else setAdminTab('Dashboard');
      return;
    }

    if (cleanPath === '/dataset-explorer') {
      setCurrentRole('DATASET_EXPLORER');
      return;
    }

    if (cleanPath === '/experiments') {
      setCurrentRole('EXPERIMENTS');
      return;
    }

    if (cleanPath === '/manual-entry' || cleanPath === '/manual-compliance-entry') {
      setCurrentRole('MANUAL_ENTRY');
      return;
    }

    // Fallback to landing
    setCurrentRole('LANDING');
  }, []);

  // Handle browser back/forward and initial URL
  useEffect(() => {
    resolveRouteFromPath(window.location.pathname);

    const handlePopState = () => {
      resolveRouteFromPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolveRouteFromPath]);

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
