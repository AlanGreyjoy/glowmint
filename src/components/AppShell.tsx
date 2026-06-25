import { useMemo, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppShell, NavLink as MantineNavLink, Text, Title } from '@mantine/core';
import { Droplets, Keyboard, LayoutDashboard, Lightbulb, Settings } from 'lucide-react';

import { PageBackground } from './ui';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/aio', label: 'AIO / LCD', icon: Droplets },
  { to: '/lighting', label: 'Lighting', icon: Lightbulb },
  { to: '/peripherals', label: 'Peripherals', icon: Keyboard },
  { to: '/setup', label: 'Setup', icon: Settings },
];

export function AppShellLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';
  const backgroundSeed = useMemo(() => Math.random().toString(36).slice(2), []);

  return (
    <>
      {isDashboard ? <PageBackground seed={backgroundSeed} /> : null}
      <AppShell navbar={{ width: 256, breakpoint: 'sm' }} padding="md">
        <AppShell.Navbar p="md">
          <div style={{ marginBottom: 32 }}>
            <Title order={3} c="cyan.3">
              Glowmint
            </Title>
            <Text size="xs" c="dimmed">
              Linux iCUE alternative
            </Text>
          </div>
          {links.map(({ to, label, icon: Icon }) => (
            <MantineNavLink
              key={to}
              component={NavLink}
              to={to}
              end={to === '/'}
              label={label}
              leftSection={<Icon size={16} />}
              mb={4}
            />
          ))}
        </AppShell.Navbar>
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
}
