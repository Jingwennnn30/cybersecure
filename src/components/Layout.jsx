import React from 'react';
import Navigation from './Navigation';
import FloatingChatbot from './FloatingChatbot';

function Layout({ title, description, children }) {
  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-72 bg-white p-6 shadow-lg border-r border-gray-200 fixed h-screen">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-1">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <h1 className="text-2xl font-bold text-primary">CyberSecure</h1>
            </div>
            <p className="text-sm text-gray-500">Security Analysis Dashboard</p>
          </div>
          <Navigation />
        </aside>

        {/* Main Content */}
        <main className="flex-1 pl-72 h-full overflow-y-auto bg-background-light">
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
              {description && (
                <p className="text-gray-600">{description}</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              {children}
            </div>
          </div>
        </main>

        {/* AI Chatbot */}
        <FloatingChatbot />
      </div>
    </div>
  );
}

export default Layout;