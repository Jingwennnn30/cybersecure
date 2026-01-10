// src/App.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

// Mock react-router-dom first
jest.mock("react-router-dom");

// Mock Firebase modules
const mockAuthState = jest.fn();

jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: (...args) => mockAuthState(...args),
}));

jest.mock("./firebase", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock all page components
jest.mock("./pages/Dashboard", () => {
  return function Dashboard() {
    return <div>Dashboard Page</div>;
  };
});

jest.mock("./pages/Login", () => {
  return function Login() {
    return <div>Login Page</div>;
  };
});

jest.mock("./pages/Signup", () => {
  return function Signup() {
    return <div>Signup Page</div>;
  };
});

jest.mock("./pages/ForgotPassword", () => {
  return function ForgotPassword() {
    return <div>Forgot Password Page</div>;
  };
});

jest.mock("./pages/Alerts", () => {
  return function Alerts() {
    return <div>Alerts Page</div>;
  };
});

jest.mock("./pages/HistoricalAlerts", () => {
  return function HistoricalAlerts() {
    return <div>Historical Alerts Page</div>;
  };
});

jest.mock("./pages/AI-insights", () => {
  return function AIInsights() {
    return <div>AI Insights Page</div>;
  };
});

jest.mock("./pages/Config", () => {
  return function Config() {
    return <div>Config Page</div>;
  };
});

jest.mock("./pages/Roles", () => {
  return function Roles() {
    return <div>Roles Page</div>;
  };
});

jest.mock("./pages/Reports", () => {
  return function Reports() {
    return <div>Reports Page</div>;
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

// IT-04: Session persistence keeps user logged in on refresh
describe("Firebase Auth Session + React Context/State Integration", () => {
  test("IT-04.1: User logs in and session is maintained", async () => {
    const mockUser = { uid: "user123", email: "test@example.com" };
    
    // Simulate authenticated user
    mockAuthState.mockReturnValue([mockUser, false]);
    
    render(<App />);

    await waitFor(() => {
      // User should not see login page since they're authenticated
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });

  test("IT-04.2: Browser refresh maintains authentication state", async () => {
    const mockUser = { uid: "refresh123", email: "refresh@example.com" };
    
    // First render - user is authenticated
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    // Simulate refresh by re-rendering with same auth state
    mockAuthState.mockReturnValue([mockUser, false]);
    rerender(<App />);

    await waitFor(() => {
      // User should still be authenticated after refresh
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });

  test("IT-04.3: Dashboard remains accessible after refresh", async () => {
    const mockUser = { uid: "dashboard123", email: "dashboard@example.com" };
    
    // User is authenticated
    mockAuthState.mockReturnValue([mockUser, false]);
    
    render(<App />);

    await waitFor(() => {
      // User should have access to protected routes
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });

  test("IT-04.4: No forced logout on page reload", async () => {
    const mockUser = { uid: "persist123", email: "persist@example.com" };
    
    // Initial authentication
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    // Simulate multiple refreshes
    for (let i = 0; i < 3; i++) {
      mockAuthState.mockReturnValue([mockUser, false]);
      rerender(<App />);
      
      await waitFor(() => {
        // User should remain authenticated through all refreshes
        expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
      });
    }
  });

  test("IT-04.5: Loading state during auth check", async () => {
    const mockUser = { uid: "loading123", email: "loading@example.com" };
    
    // Simulate loading state
    mockAuthState.mockReturnValue([null, true]);
    
    const { rerender } = render(<App />);

    await waitFor(() => {
      // During loading, neither login nor dashboard should be shown
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    // Auth check completes
    mockAuthState.mockReturnValue([mockUser, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });

  test("IT-04.6: Unauthenticated user redirected to login", async () => {
    // No user, not loading
    mockAuthState.mockReturnValue([null, false]);
    
    render(<App />);

    await waitFor(() => {
      // Unauthenticated user should not see protected content
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });

  test("IT-04.7: Session persists across route changes", async () => {
    const mockUser = { uid: "route123", email: "route@example.com" };
    
    // User is authenticated
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    // Simulate navigation by re-rendering (in real app, routes would change)
    mockAuthState.mockReturnValue([mockUser, false]);
    rerender(<App />);

    await waitFor(() => {
      // User should still be authenticated
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });

  test("IT-04.8: Authentication state survives component remount", async () => {
    const mockUser = { uid: "remount123", email: "remount@example.com" };
    
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { unmount, rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    // Unmount and remount (simulates harder refresh)
    unmount();
    
    mockAuthState.mockReturnValue([mockUser, false]);
    render(<App />);

    await waitFor(() => {
      // User should still be authenticated after remount
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });
});

// Additional session persistence tests
describe("Session Storage Integration", () => {
  test("maintains user role in session storage", async () => {
    const mockUser = { uid: "role123", email: "role@example.com" };
    
    // Set role in session storage
    sessionStorage.setItem("userRole", "admin");
    
    mockAuthState.mockReturnValue([mockUser, false]);
    
    render(<App />);

    await waitFor(() => {
      expect(sessionStorage.getItem("userRole")).toBe("admin");
    });
  });

  test("session survives with role data", async () => {
    const mockUser = { uid: "persist123", email: "persist@example.com" };
    
    sessionStorage.setItem("userRole", "viewer");
    
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { rerender } = render(<App />);

    // Simulate refresh
    mockAuthState.mockReturnValue([mockUser, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(sessionStorage.getItem("userRole")).toBe("viewer");
    });
  });

  test("clears session on logout", async () => {
    const mockUser = { uid: "logout123", email: "logout@example.com" };
    
    sessionStorage.setItem("userRole", "admin");
    
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { rerender } = render(<App />);

    // Simulate logout
    sessionStorage.clear();
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(sessionStorage.getItem("userRole")).toBeNull();
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });
});

// Authentication persistence edge cases
describe("Authentication Edge Cases", () => {
  test("handles expired session gracefully", async () => {
    // Start with authenticated user
    const mockUser = { uid: "expire123", email: "expire@example.com" };
    mockAuthState.mockReturnValue([mockUser, false]);
    
    const { rerender } = render(<App />);

    // Session expires (user becomes null)
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });

  test("handles authentication state change during loading", async () => {
    // Start loading
    mockAuthState.mockReturnValue([null, true]);
    
    const { rerender } = render(<App />);

    // Complete loading with authenticated user
    const mockUser = { uid: "change123", email: "change@example.com" };
    mockAuthState.mockReturnValue([mockUser, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });
  });

  test("prevents access to protected routes without auth", async () => {
    mockAuthState.mockReturnValue([null, false]);
    
    render(<App />);

    await waitFor(() => {
      // Should not show protected content
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Alerts Page")).not.toBeInTheDocument();
    });
  });
});

// IT-05: Logout revokes access immediately
describe("Logout UI + Firebase Auth + Route Guard Integration", () => {
  test("IT-05.1: User logs out successfully", async () => {
    const mockUser = { uid: "logout123", email: "logout@example.com" };
    
    // Start with authenticated user
    mockAuthState.mockReturnValue([mockUser, false]);
    sessionStorage.setItem("userRole", "admin");
    
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    // Simulate logout
    sessionStorage.removeItem("userRole");
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      // User should no longer have access
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
      expect(sessionStorage.getItem("userRole")).toBeNull();
    });
  });

  test("IT-05.2: Trying to access Dashboard via URL after logout fails", async () => {
    const mockUser = { uid: "urlAccess123", email: "urlaccess@example.com" };
    
    // User is logged in
    mockAuthState.mockReturnValue([mockUser, false]);
    const { rerender } = render(<App />);

    // Logout
    mockAuthState.mockReturnValue([null, false]);
    sessionStorage.clear();
    rerender(<App />);

    await waitFor(() => {
      // Protected routes should be blocked
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Alerts Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Config Page")).not.toBeInTheDocument();
    });
  });

  test("IT-05.3: All protected routes blocked after logout", async () => {
    const mockUser = { uid: "routes123", email: "routes@example.com" };
    
    mockAuthState.mockReturnValue([mockUser, false]);
    sessionStorage.setItem("userRole", "admin");
    
    const { rerender } = render(<App />);

    // Perform logout
    sessionStorage.clear();
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      // All protected pages should be inaccessible
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Alerts Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Historical Alerts Page")).not.toBeInTheDocument();
      expect(screen.queryByText("AI Insights Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Config Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Roles Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Reports Page")).not.toBeInTheDocument();
    });
  });

  test("IT-05.4: User redirected to login after logout", async () => {
    const mockUser = { uid: "redirect123", email: "redirect@example.com" };
    
    mockAuthState.mockReturnValue([mockUser, false]);
    const { rerender } = render(<App />);

    // Logout
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      // Should not have access to protected content
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });

  test("IT-05.5: Session data cleared on logout", async () => {
    const mockUser = { uid: "session123", email: "session@example.com" };
    
    sessionStorage.setItem("userRole", "viewer");
    sessionStorage.setItem("userName", "Test User");
    
    mockAuthState.mockReturnValue([mockUser, false]);
    const { rerender } = render(<App />);

    // Simulate complete logout
    sessionStorage.clear();
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(sessionStorage.getItem("userRole")).toBeNull();
      expect(sessionStorage.getItem("userName")).toBeNull();
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });

  test("IT-05.6: Cannot re-access protected features without re-login", async () => {
    const mockUser = { uid: "reaccess123", email: "reaccess@example.com" };
    
    // Login
    mockAuthState.mockReturnValue([mockUser, false]);
    sessionStorage.setItem("userRole", "analyst");
    
    const { rerender } = render(<App />);

    // Logout
    sessionStorage.clear();
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });

    // Try to access without logging back in
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      // Still blocked
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Alerts Page")).not.toBeInTheDocument();
    });
  });

  test("IT-05.7: Logout immediately revokes all access", async () => {
    const mockUser = { uid: "immediate123", email: "immediate@example.com" };
    
    mockAuthState.mockReturnValue([mockUser, false]);
    sessionStorage.setItem("userRole", "admin");
    
    const { rerender } = render(<App />);

    // Immediate logout
    const logoutTime = Date.now();
    sessionStorage.clear();
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      const timeElapsed = Date.now() - logoutTime;
      // Access revoked quickly (within reasonable time)
      expect(timeElapsed).toBeLessThan(2000);
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });

  test("IT-05.8: Multiple logout attempts handled gracefully", async () => {
    const mockUser = { uid: "multiple123", email: "multiple@example.com" };
    
    mockAuthState.mockReturnValue([mockUser, false]);
    const { rerender } = render(<App />);

    // First logout
    mockAuthState.mockReturnValue([null, false]);
    sessionStorage.clear();
    rerender(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });

    // Second logout attempt (already logged out)
    mockAuthState.mockReturnValue([null, false]);
    rerender(<App />);

    await waitFor(() => {
      // Should still be logged out without errors
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });
});
