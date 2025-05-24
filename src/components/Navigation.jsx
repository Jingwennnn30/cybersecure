import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  BoltIcon,
  CogIcon,
  UserGroupIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: HomeIcon,
    description: 'Overview and key metrics'
  },
  { 
    name: 'Historical Alerts', 
    href: '/historical', 
    icon: ChartBarIcon,
    description: 'Past security incidents'
  },
  { 
    name: 'AI Insights', 
    href: '/ai-insights', 
    icon: BoltIcon,
    description: 'AI-powered analysis'
  },
  { 
    name: 'Configuration', 
    href: '/config', 
    icon: CogIcon,
    description: 'System settings'
  },
  { 
    name: 'Role Management', 
    href: '/roles', 
    icon: UserGroupIcon,
    description: 'User permissions'
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: DocumentChartBarIcon,
    description: 'Analytics reports'
  },
];

function Navigation() {
  const location = useLocation();

  return (
    <nav className="space-y-1 px-2">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`
              group relative flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-amber-500 text-black shadow-lg'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <div className="flex items-center flex-1 min-w-0">
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200
                  ${isActive
                    ? 'text-black'
                    : 'text-gray-400 group-hover:text-gray-700'
                  }
                `}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <span className="block truncate">{item.name}</span>
                <span 
                  className={`
                    block text-xs truncate transition-opacity duration-200
                    ${isActive ? 'text-black opacity-100' : 'text-gray-400 group-hover:text-gray-700 opacity-75'}
                  `}
                >
                  {item.description}
                </span>
              </div>
            </div>
            {isActive && (
              <span
                className="absolute inset-y-0 left-0 w-1 bg-amber-400 rounded-r-full"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default Navigation;