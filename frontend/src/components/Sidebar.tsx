import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Portfolio', href: '/portfolio', icon: ChartPieIcon },
  { name: 'Trading', href: '/trading', icon: BanknotesIcon },
  { name: 'AI Assistant', href: '/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Strategies', href: '/strategies', icon: ArrowTrendingUpIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar - Dark theme */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#0f172a] px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <img src="/logo-dark.png" alt="G2E Trading" className="h-10 w-auto" />
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
                        className={({ isActive }) =>
                          classNames(
                            isActive
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-300 hover:bg-slate-800 hover:text-white',
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
                                  : 'text-gray-400 group-hover:text-white',
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
                <div className="rounded-lg bg-slate-800 p-4">
                  <p className="text-xs font-medium text-gray-400">Connected Brokers</p>
                  <p className="mt-1 text-sm font-semibold text-white">0 accounts</p>
                  <NavLink
                    to="/settings"
                    className="mt-2 inline-flex text-xs text-primary-400 hover:text-primary-300"
                  >
                    Connect broker &rarr;
                  </NavLink>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar - Dark theme */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a] border-t border-slate-700">
        <nav className="flex justify-around py-2">
          {navigation.slice(0, 5).map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                classNames(
                  isActive ? 'text-primary-400' : 'text-gray-400',
                  'flex flex-col items-center p-2 text-xs'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={classNames(
                      isActive ? 'text-primary-400' : 'text-gray-500',
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
