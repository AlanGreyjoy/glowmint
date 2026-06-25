import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Center, Loader, Text } from '@mantine/core';

import { AppShellLayout } from './components/AppShell';
import { useSetupGate } from './hooks/useSetupGate';
import { AioPage } from './pages/AioPage';
import { DashboardPage } from './pages/DashboardPage';
import { LightingPage } from './pages/LightingPage';
import { PeripheralsPage } from './pages/PeripheralsPage';
import { SetupPage } from './pages/SetupPage';
import { WelcomePage } from './pages/WelcomePage';

function MainApp() {
  const setup = useSetupGate();

  if (setup.loading) {
    return (
      <Center mih="100vh">
        <div style={{ textAlign: 'center' }}>
          <Loader size="sm" mb="sm" />
          <Text c="dimmed">Loading Glowmint…</Text>
        </div>
      </Center>
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
  return <MainApp />;
}
