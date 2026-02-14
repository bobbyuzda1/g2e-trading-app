import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Bars3Icon, BellIcon, UserCircleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={classNames(
      "sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8",
      theme === 'dark'
        ? "bg-[#0f172a] border-slate-700"
        : "bg-white border-gray-200"
    )}>
      {/* Mobile menu button */}
      <button
        type="button"
        className={classNames(
          "-m-2.5 p-2.5 lg:hidden",
          theme === 'dark' ? "text-gray-300" : "text-gray-700"
        )}
        onClick={onOpenMobileMenu}
        aria-label="Open sidebar"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className={classNames(
        "h-6 w-px lg:hidden",
        theme === 'dark' ? "bg-slate-600" : "bg-gray-200"
      )} aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Welcome text */}
        <div className="flex flex-1 items-center">
          <span className={classNames(
            "text-sm",
            theme === 'dark' ? "text-gray-300" : "text-gray-500"
          )}>Welcome back!</span>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={classNames(
              "-m-2.5 p-2.5 rounded-md transition-colors",
              theme === 'dark'
                ? "text-gray-300 hover:bg-slate-800 hover:text-white"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            )}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="sr-only">Toggle theme</span>
            {theme === 'dark' ? (
              <SunIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className={classNames(
              "-m-2.5 p-2.5",
              theme === 'dark'
                ? "text-gray-300 hover:text-white"
                : "text-gray-400 hover:text-gray-500"
            )}
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className={classNames(
            "hidden lg:block lg:h-6 lg:w-px",
            theme === 'dark' ? "bg-slate-600" : "bg-gray-200"
          )} aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <UserCircleIcon className={classNames(
                "h-8 w-8",
                theme === 'dark' ? "text-gray-300" : "text-gray-400"
              )} aria-hidden="true" />
              <span className="hidden lg:flex lg:items-center">
                <span
                  className={classNames(
                    "ml-4 text-sm font-semibold leading-6",
                    theme === 'dark' ? "text-white" : "text-gray-900"
                  )}
                  aria-hidden="true"
                >
                  {user?.full_name || user?.email || 'User'}
                </span>
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className={classNames(
                "absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md py-2 shadow-lg ring-1 focus:outline-none",
                theme === 'dark'
                  ? "bg-slate-800 ring-slate-700"
                  : "bg-white ring-gray-900/5"
              )}>
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/settings"
                      className={classNames(
                        active
                          ? theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                          : '',
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900',
                        'block px-3 py-1 text-sm leading-6'
                      )}
                    >
                      Settings
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => logout()}
                      className={classNames(
                        active
                          ? theme === 'dark' ? 'bg-slate-700' : 'bg-gray-50'
                          : '',
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900',
                        'block w-full text-left px-3 py-1 text-sm leading-6'
                      )}
                    >
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}
