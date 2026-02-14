import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { brokerageApi } from '../lib/api';
import type { BrokerConnection } from '../types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Portfolio', href: '/portfolio', icon: ChartPieIcon },
  { name: 'Trading', href: '/trading', icon: BanknotesIcon },
  { name: 'Research', href: '/research', icon: MagnifyingGlassIcon },
  { name: 'AI Assistant', href: '/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Strategies', href: '/strategies', icon: ArrowTrendingUpIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

// Mobile bottom nav shows first 5 items
const mobileNavItems = navigation.slice(0, 5);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface SidebarProps {
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export function Sidebar({ mobileMenuOpen, onCloseMobileMenu }: SidebarProps) {
  const { theme } = useTheme();
  const [brokerCount, setBrokerCount] = useState(0);

  useEffect(() => {
    brokerageApi.getConnections()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const active = data.filter((b: BrokerConnection) => b.status === 'active');
        setBrokerCount(active.length);
      })
      .catch(() => {});
  }, []);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <img
          src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
          alt="G2E Trading"
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={onCloseMobileMenu}
                    className={({ isActive }) =>
                      classNames(
                        isActive
                          ? 'bg-primary-600 text-white'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-slate-800 hover:text-white'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                        'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={classNames(
                            isActive
                              ? 'text-white'
                              : theme === 'dark'
                                ? 'text-gray-400 group-hover:text-white'
                                : 'text-gray-400 group-hover:text-primary-600',
                            'h-6 w-6 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>

          {/* Account status */}
          <li className="mt-auto">
            <div className={classNames(
              "rounded-lg p-4",
              theme === 'dark' ? "bg-slate-800" : "bg-gray-50"
            )}>
              <p className={classNames(
                "text-xs font-medium",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>Connected Brokers</p>
              <p className={classNames(
                "mt-1 text-sm font-semibold",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>{brokerCount} {brokerCount === 1 ? 'account' : 'accounts'}</p>
              {brokerCount === 0 && (
                <NavLink
                  to="/settings"
                  onClick={onCloseMobileMenu}
                  className="mt-2 inline-flex text-xs text-primary-500 hover:text-primary-400"
                >
                  Connect broker &rarr;
                </NavLink>
              )}
            </div>
          </li>
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className={classNames(
          "flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4 border-r",
          theme === 'dark'
            ? "bg-[#0f172a] border-slate-700"
            : "bg-white border-gray-200"
        )}>
          {navContent}
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onCloseMobileMenu}
          />
          {/* Drawer */}
          <div className={classNames(
            "fixed inset-y-0 left-0 w-72 flex flex-col px-6 pb-4 overflow-y-auto",
            theme === 'dark'
              ? "bg-[#0f172a]"
              : "bg-white"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex h-16 shrink-0 items-center">
                <img
                  src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                  alt="G2E Trading"
                  className="h-10 w-auto"
                />
              </div>
              <button
                onClick={onCloseMobileMenu}
                className={classNames(
                  "p-2 rounded-md",
                  theme === 'dark' ? "text-gray-300 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col mt-4">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <NavLink
                          to={item.href}
                          onClick={onCloseMobileMenu}
                          className={({ isActive }) =>
                            classNames(
                              isActive
                                ? 'bg-primary-600 text-white'
                                : theme === 'dark'
                                  ? 'text-gray-300 hover:bg-slate-800 hover:text-white'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                              'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className={classNames(
                                  isActive
                                    ? 'text-white'
                                    : theme === 'dark'
                                      ? 'text-gray-400 group-hover:text-white'
                                      : 'text-gray-400 group-hover:text-primary-600',
                                  'h-6 w-6 shrink-0'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className={classNames(
        "lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t",
        theme === 'dark'
          ? "bg-[#0f172a] border-slate-700"
          : "bg-white border-gray-200"
      )}>
        <nav className="flex justify-around py-2">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                classNames(
                  isActive
                    ? 'text-primary-500'
                    : theme === 'dark' ? 'text-gray-400' : 'text-gray-500',
                  'flex flex-col items-center p-2 text-xs'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={classNames(
                      isActive
                        ? 'text-primary-500'
                        : theme === 'dark' ? 'text-gray-500' : 'text-gray-400',
                      'h-6 w-6'
                    )}
                  />
                  <span className="mt-1">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
