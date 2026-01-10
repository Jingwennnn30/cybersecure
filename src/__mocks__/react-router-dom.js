import React from 'react';

const mockNavigate = jest.fn();

module.exports = {
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ children }) => <div>{children}</div>,
  Navigate: ({ to }) => <div>Navigate to: {to}</div>,
  useLocation: () => ({ pathname: '/login' }),
  mockNavigate, // Export this so tests can access it
};
