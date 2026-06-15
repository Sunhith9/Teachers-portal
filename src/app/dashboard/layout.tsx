'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="lg:pl-64 transition-all duration-300">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />

        <main className="p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
