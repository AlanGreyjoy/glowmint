import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShellLayout } from './components/AppShell';
import { Spinner, Toaster } from './components/ui';
import { useSetupGate } from './hooks/useSetupGate';
import { AioPage } from './pages/AioPage';
import { CanvasPage } from './pages/CanvasPage';
import { DashboardPage } from './pages/DashboardPage';
import { LightingPage } from './pages/LightingPage';
import { PeripheralsPage } from './pages/PeripheralsPage';
import { SetupPage } from './pages/SetupPage';
import { WelcomePage } from './pages/WelcomePage';

function MainApp() {
  const setup = useSetupGate();

  if (setup.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading Glowmint…</p>
        </div>
      </div>
    );
  }

  if (setup.needsWizard) {
    return <WelcomePage onComplete={() => void setup.refresh()} />;
  }

  return (
    <BrowserRouter>
      <AppShellLayout>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                showSetupBanner={setup.showBanner}
                onOpenSetup={() => void setup.reopenWizard()}
              />
            }
          />
          <Route path="/aio" element={<AioPage />} />
          <Route path="/canvas" element={<CanvasPage />} />
          <Route path="/lighting" element={<LightingPage />} />
          <Route path="/peripherals" element={<PeripheralsPage />} />
          <Route
            path="/setup"
            element={<SetupPage onRerunWizard={() => void setup.reopenWizard()} />}
          />
        </Routes>
      </AppShellLayout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <>
      <MainApp />
      <Toaster />
    </>
  );
}
