import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-500">
            © 2025 CyberSecure. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm">
            <Link to="/privacy" className="text-gray-500 hover:text-amber-600 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-gray-500 hover:text-amber-600 transition-colors">
              Terms of Service
            </Link>
            <Link to="/security" className="text-gray-500 hover:text-amber-600 transition-colors">
              Security Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;