import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  BoltIcon,
  CogIcon,
  UserGroupIcon,
  DocumentChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';

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
    description: 'System settings',
    adminOnly: true
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
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [role, setRole] = useState(() => sessionStorage.getItem('userRole'));

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          setRole(fetchedRole);
          sessionStorage.setItem('userRole', fetchedRole);
        }
      } else {
        setRole(null);
        sessionStorage.removeItem('userRole');
      }
    };
    fetchRole();
  }, [user]);

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      await signOut(auth);
      sessionStorage.removeItem('userRole');
      navigate("/login");
    }
  };

  return (
    <nav className="space-y-1 px-2 flex flex-col h-full">
      <div className="flex-1">
        {navigation
          .filter(item => !item.adminOnly || role === 'admin')
          .map((item) => {
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
      </div>
      {/* Logout button at the bottom */}
      <button
        onClick={handleLogout}
        className="flex items-center w-full mt-6 px-4 py-3 text-sm font-medium rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
        Log Out
      </button>
    </nav>
  );
}

export default Navigation;