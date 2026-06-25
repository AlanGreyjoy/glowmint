import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Droplets, Keyboard, LayoutDashboard, Lightbulb, Palette, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PageBackground } from './ui';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/aio', label: 'AIO / LCD', icon: Droplets },
  { to: '/canvas', label: 'Canvas', icon: Palette },
  { to: '/lighting', label: 'Lighting', icon: Lightbulb },
  { to: '/peripherals', label: 'Peripherals', icon: Keyboard },
  { to: '/setup', label: 'Setup', icon: Settings },
];

export function AppShellLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';

  return (
    <>
      {isDashboard ? <PageBackground /> : null}
      <div className="relative z-1 flex min-h-screen bg-transparent text-white">
        <aside className="glowmint-glass glowmint-glass--panel w-48 shrink-0 rounded-none px-4 py-5 shadow-[28px_0_80px_rgba(4,14,24,0.12)]">
          <div className="mb-8">
            <h2 className="text-xl font-semibold tracking-tight text-white drop-shadow-sm">
              Glowmint
            </h2>
            <p className="mt-1 text-[0.72rem] leading-tight text-white/62">
              Linux iCUE alternative
            </p>
          </div>
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-linear-to-r from-emerald-500/55 to-teal-400/30 text-white shadow-[0_12px_32px_rgba(16,185,129,0.22)]'
                      : 'text-white/76 hover:bg-white/12 hover:text-white',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
      </div>
    </>
  );
}
