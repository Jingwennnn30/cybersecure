import React, { useState } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-4 rounded-full shadow-lg transition-all duration-300 transform
          ${isOpen 
            ? 'bg-amber-400 hover:bg-amber-500 scale-110' 
            : 'bg-amber-500 hover:bg-amber-600 scale-100'
          }
        `}
      >
        <ChatBubbleLeftRightIcon 
          className="h-6 w-6 text-black" 
          aria-hidden="true" 
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-sm text-gray-600">How can I help you today?</p>
          </div>
          <div className="p-4">
            <p className="text-gray-600">Chat functionality coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIChatbot;