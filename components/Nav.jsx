'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Receipt, Target, BellRing, Users, Download, User, LogOut, Menu, X } from 'lucide-react';
import OnboardingTour from './OnboardingTour';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/reminders', label: 'Reminders', icon: BellRing },
  { href: '/groups', label: 'Splits', icon: Users },
  { href: '/export', label: 'Export', icon: Download },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Nav() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <nav className="border-b border-ink-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-ink-900">
            <Image src="/logo-icon.png" alt="Mr Pocket" width={28} height={28} className="object-contain" />
            <span>Mr Pocket</span>
          </a>

          {/* Desktop links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => {
              const isActive = pathname === link.href;
              const classes = isActive
                ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors bg-brand-50 text-brand-700'
                : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors text-ink-500 hover:text-ink-900 hover:bg-ink-50';
              return (
                <a key={link.href} href={link.href} data-tour={link.href === '/transactions' ? 'transactions' : link.href === '/goals' ? 'goals' : link.href === '/groups' ? 'groups' : link.href === '/profile' ? 'profile' : undefined} className={classes}>
                  <link.icon size={16} />
                  <span className="hidden lg:inline">{link.label}</span>
                </a>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-ink-500 hover:text-outflow hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden lg:inline">Log Out</span>
            </button>
          </div>

          {/* Mobile: hamburger + logout icon only */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-ink-500 hover:text-outflow hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>
      <OnboardingTour canOpen={pathname === '/dashboard'} />

      {/* Mobile slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={closeMenu} />
          <div className="absolute top-0 left-0 h-full w-72 bg-white shadow-xl p-4 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 font-bold text-ink-900">
                <Image src="/logo-icon.png" alt="Mr Pocket" width={24} height={24} className="object-contain" />
                Mr Pocket
              </span>
              <button onClick={closeMenu} className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-50">
                <X size={20} />
              </button>
            </div>

            {LINKS.map((link) => {
              const isActive = pathname === link.href;
              const classes = isActive
                ? 'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium bg-brand-50 text-brand-700'
                : 'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-ink-600 hover:bg-ink-50';
              return (
                <a key={link.href} href={link.href} onClick={closeMenu} className={classes}>
                  <link.icon size={18} />
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}