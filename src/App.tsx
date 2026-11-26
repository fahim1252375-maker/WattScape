import React, { lazy, Suspense } from 'react';
import { WattScapeProvider, useWattScape } from './context/WattScapeContext';
import { AppModeProvider, useAppMode } from './context/AppModeContext';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AppShell } from './components/layout/AppShell';

const AuthScreen = lazy(() => import('./views/EntryAndPortfolioScreens').then((m) => ({ default: m.AuthScreen })));
const LandingScreen = lazy(() => import('./views/EntryAndPortfolioScreens').then((m) => ({ default: m.LandingScreen })));
const OrganizationWorkspaceScreen = lazy(() => import('./views/EntryAndPortfolioScreens').then((m) => ({ default: m.OrganizationWorkspaceScreen })));
const PortfolioOverviewScreen = lazy(() => import('./views/EntryAndPortfolioScreens').then((m) => ({ default: m.PortfolioOverviewScreen })));
const TwinViewerScreen = lazy(() => import('./views/TwinViewerScreen').then((m) => ({ default: m.TwinViewerScreen })));
const LiveWorkspaceScreen = lazy(() => import('./views/LiveWorkspaceScreen'));
const AssetManagementScreen = lazy(() => import('./views/TwinManagementScreens').then((m) => ({ default: m.AssetManagementScreen })));
const FloorExplorerScreen = lazy(() => import('./views/TwinManagementScreens').then((m) => ({ default: m.FloorExplorerScreen })));
const TwinEditorScreen = lazy(() => import('./views/TwinManagementScreens').then((m) => ({ default: m.TwinEditorScreen })));
const DataQualityCenterScreen = lazy(() => import('./views/MonitoringAndQualityScreens').then((m) => ({ default: m.DataQualityCenterScreen })));
const MultiResourceMonitoringScreen = lazy(() => import('./views/MonitoringAndQualityScreens').then((m) => ({ default: m.MultiResourceMonitoringScreen })));
const CollaborationCenterScreen = lazy(() => import('./views/WorkAndCollabScreens').then((m) => ({ default: m.CollaborationCenterScreen })));
const MaintenanceCenterScreen = lazy(() => import('./views/WorkAndCollabScreens').then((m) => ({ default: m.MaintenanceCenterScreen })));
const AiIntelligenceScreen = lazy(() => import('./views/AnalyticsAndAiScreens').then((m) => ({ default: m.AiIntelligenceScreen })));
const AnalyticsReportingScreen = lazy(() => import('./views/AnalyticsAndAiScreens').then((m) => ({ default: m.AnalyticsReportingScreen })));
const SimulationLabScreen = lazy(() => import('./views/SimulationAndImpactScreens').then((m) => ({ default: m.SimulationLabScreen })));
const SustainabilityCenterScreen = lazy(() => import('./views/SimulationAndImpactScreens').then((m) => ({ default: m.SustainabilityCenterScreen })));
const VerifiedImpactLedgerScreen = lazy(() => import('./views/SimulationAndImpactScreens').then((m) => ({ default: m.VerifiedImpactLedgerScreen })));
const AutomationStudioScreen = lazy(() => import('./views/ConnectAndAdminScreens').then((m) => ({ default: m.AutomationStudioScreen })));
const IntegrationHubScreen = lazy(() => import('./views/ConnectAndAdminScreens').then((m) => ({ default: m.IntegrationHubScreen })));
const SecurityGovernanceScreen = lazy(() => import('./views/ConnectAndAdminScreens').then((m) => ({ default: m.SecurityGovernanceScreen })));
const SettingsScreen = lazy(() => import('./views/ConnectAndAdminScreens').then((m) => ({ default: m.SettingsScreen })));

function ScreenLoading() {
  return <div className="grid min-h-48 place-items-center p-6 text-sm text-[var(--ws-text-secondary)]" role="status">Loading WattScape view…</div>;
}

function WattScapeRouter() {
  const { screen } = useWattScape();

  if (screen === 'landing') return <Suspense fallback={<ScreenLoading />}><LandingScreen /></Suspense>;
  if (screen === 'auth') return <Suspense fallback={<ScreenLoading />}><AuthScreen /></Suspense>;

  const renderInner = () => {
    switch (screen) {
      case 'workspace':
        return <OrganizationWorkspaceScreen />;
      case 'portfolio-overview':
        return <PortfolioOverviewScreen />;
      case 'twin-viewer':
        return <TwinViewerScreen />;
      case 'twin-editor':
        return <TwinEditorScreen />;
      case 'floor-explorer':
        return <FloorExplorerScreen />;
      case 'assets':
        return <AssetManagementScreen />;
      case 'monitoring':
        return <MultiResourceMonitoringScreen />;
      case 'data-quality':
        return <DataQualityCenterScreen />;
      case 'maintenance':
        return <MaintenanceCenterScreen />;
      case 'collaboration':
        return <CollaborationCenterScreen />;
      case 'analytics':
        return <AnalyticsReportingScreen />;
      case 'ai-intelligence':
        return <AiIntelligenceScreen />;
      case 'simulation':
        return <SimulationLabScreen />;
      case 'sustainability':
        return <SustainabilityCenterScreen />;
      case 'impact-ledger':
        return <VerifiedImpactLedgerScreen />;
      case 'integrations':
        return <IntegrationHubScreen />;
      case 'automation':
        return <AutomationStudioScreen />;
      case 'security':
        return <SecurityGovernanceScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <TwinViewerScreen />;
    }
  };

  return <AppShell><Suspense fallback={<ScreenLoading />}>{renderInner()}</Suspense></AppShell>;
}

function ApplicationModeRouter() {
  const { mode } = useAppMode();
  const auth = useAuth();
  if (mode === 'live') return <Suspense fallback={<ScreenLoading />}><LiveWorkspaceScreen /></Suspense>;
  if (auth.user && mode === 'demo') {
    // OIDC users are never allowed into the synthetic demo stores by accident.
    return <LiveModeNotice />;
  }
  return <WattScapeProvider><WattScapeRouter /></WattScapeProvider>;
}

function LiveModeNotice() {
  const { setMode } = useAppMode();
  return <main className="min-h-screen grid place-items-center bg-[var(--ws-canvas)] p-6 text-[var(--ws-text-primary)]"><section className="max-w-lg rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-6"><h1 className="text-xl font-semibold">Choose a workspace mode</h1><p className="my-3 text-sm text-[var(--ws-text-secondary)]">You are signed in to the live identity provider. Demo fixtures are kept separate from your live organization data.</p><button className="rounded bg-[var(--ws-brand-teal)] px-4 py-2 text-sm font-semibold" onClick={() => setMode('live')}>Open Live API Mode</button></section></main>;
}

export default function App() {
  return <AppModeProvider><AuthProvider><ApplicationModeRouter /></AuthProvider></AppModeProvider>;
}
