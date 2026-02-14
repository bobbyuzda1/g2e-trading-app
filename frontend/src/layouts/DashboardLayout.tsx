import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={theme === 'dark' ? 'min-h-screen bg-[#0d1117]' : 'min-h-screen bg-gray-50'}>
      {/* Sidebar */}
      <Sidebar mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Page content */}
        <main className="py-6 pb-24 lg:pb-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className={`py-3 text-center text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
          <Link to="/disclosures" className="hover:underline">Disclosures &amp; Terms of Use</Link>
        </footer>
      </div>
    </div>
  );
}
