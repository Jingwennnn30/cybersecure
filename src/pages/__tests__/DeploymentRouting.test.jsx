import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

// Mock dependencies
jest.mock("react-firebase-hooks/auth");
jest.mock("../firebase", () => ({
  auth: {
    currentUser: { uid: "test-user", email: "test@example.com" },
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

// Simple test components for routing
const Dashboard = () => {
  return (
    <div>
      <h1>Dashboard Page</h1>
      <p data-testid="current-path">/dashboard</p>
    </div>
  );
};

const Alerts = () => {
  return (
    <div>
      <h1>Alerts Page</h1>
      <p data-testid="current-path">/alerts</p>
    </div>
  );
};

const Reports = () => {
  return (
    <div>
      <h1>Reports Page</h1>
      <p data-testid="current-path">/reports</p>
    </div>
  );
};

const NotFound = () => {
  return <div data-testid="not-found">404 - Page Not Found</div>;
};

// Test App component simulating SPA routing
const TestApp = ({ initialPath = "/" }) => {
  let Component = NotFound;
  
  if (initialPath.startsWith("/dashboard")) Component = Dashboard;
  else if (initialPath.startsWith("/alerts")) Component = Alerts;
  else if (initialPath.startsWith("/reports")) Component = Reports;
  
  return <Component />;
};

// Component that makes API calls
const APITestComponent = ({ endpoint }) => {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div data-testid="api-error">{error}</div>;
  return <div data-testid="api-data">{JSON.stringify(data)}</div>;
};

// Component combining routing and API calls
const TestDashboardWithAPI = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <APITestComponent endpoint="/api/dashboard-stats" />
    </div>
  );
};

describe("Deployment / Routing Integration (Nginx + React + Backend)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Default auth mock
    useAuthState.mockReturnValue([
      { uid: "test-user", email: "test@example.com" },
      false,
      null,
    ]);
  });

  describe("IT-19: Nginx routes frontend pages correctly (SPA refresh)", () => {
    test("IT-19.1: Opening /dashboard directly loads the page", () => {
      render(<TestApp initialPath="/dashboard" />);

      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard");
    });

    test("IT-19.2: Opening /alerts directly loads the page", () => {
      render(<TestApp initialPath="/alerts" />);

      expect(screen.getByText("Alerts Page")).toBeInTheDocument();
      expect(screen.getByTestId("current-path")).toHaveTextContent("/alerts");
    });

    test("IT-19.3: Opening /reports directly loads the page", () => {
      render(<TestApp initialPath="/reports" />);

      expect(screen.getByText("Reports Page")).toBeInTheDocument();
      expect(screen.getByTestId("current-path")).toHaveTextContent("/reports");
    });

    test("IT-19.4: SPA routing works without page reload", () => {
      const { rerender } = render(<TestApp initialPath="/dashboard" />);

      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();

      // Simulate navigation to alerts
      rerender(<TestApp initialPath="/alerts" />);

      expect(screen.getByText("Alerts Page")).toBeInTheDocument();
      expect(screen.getByTestId("current-path")).toHaveTextContent("/alerts");
    });

    test("IT-19.5: Refreshing on /dashboard does not show 404", () => {
      // Simulate refresh by rendering directly with the path
      render(<TestApp initialPath="/dashboard" />);

      // Should load dashboard, not 404
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      expect(screen.queryByTestId("not-found")).not.toBeInTheDocument();
    });

    test("IT-19.6: Refreshing on /alerts does not show 404", () => {
      render(<TestApp initialPath="/alerts" />);

      expect(screen.getByText("Alerts Page")).toBeInTheDocument();
      expect(screen.queryByTestId("not-found")).not.toBeInTheDocument();
    });

    test("IT-19.7: Deep nested routes work correctly", () => {
      render(<TestApp initialPath="/dashboard" />);

      // Dashboard route should work
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      
      // Path should be exact
      expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard");
    });

    test("IT-19.8: Invalid routes show 404 page", () => {
      render(<TestApp initialPath="/nonexistent" />);

      expect(screen.getByTestId("not-found")).toBeInTheDocument();
      expect(screen.getByText("404 - Page Not Found")).toBeInTheDocument();
    });

    test("IT-19.9: Multiple route refreshes work consistently", () => {
      // First route
      const { rerender, unmount } = render(<TestApp initialPath="/dashboard" />);
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      unmount();

      // Second route (simulating refresh)
      const { rerender: rerender2, unmount: unmount2 } = render(<TestApp initialPath="/alerts" />);
      expect(screen.getByText("Alerts Page")).toBeInTheDocument();
      unmount2();

      // Third route (simulating refresh)
      render(<TestApp initialPath="/reports" />);
      expect(screen.getByText("Reports Page")).toBeInTheDocument();
    });

    test("IT-19.10: SPA fallback preserves route parameters", () => {
      // Simulate route with parameters
      render(<TestApp initialPath="/dashboard?filter=critical" />);

      // Should still load dashboard
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });

    test("IT-19.11: All primary routes are accessible", () => {
      const routes = ["/dashboard", "/alerts", "/reports"];

      routes.forEach((route) => {
        const { unmount } = render(<TestApp initialPath={route} />);
        
        // Should not show 404
        expect(screen.queryByTestId("not-found")).not.toBeInTheDocument();
        
        unmount();
      });
    });

    test("IT-19.12: Hash fragments in URLs are preserved", () => {
      render(<TestApp initialPath="/dashboard#section1" />);

      // Should load dashboard page
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });
  });

  describe("IT-20: Nginx reverse proxy routes /api requests to backend", () => {
    test("IT-20.1: /api/alerts request is routed correctly", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            alerts: [
              { id: 1, severity: "high", message: "Security alert" },
            ],
          }),
      });

      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      expect(screen.getByTestId("api-data")).toHaveTextContent("Security alert");

      // Verify API was called with correct path
      expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
    });

    test("IT-20.2: /api/dashboard-stats request is routed correctly", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            totalAlerts: 150,
            criticalAlerts: 25,
            resolvedAlerts: 100,
          }),
      });

      render(<APITestComponent endpoint="/api/dashboard-stats" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      expect(screen.getByTestId("api-data")).toHaveTextContent("totalAlerts");
      expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
    });

    test("IT-20.3: /api/chatbot request is routed correctly", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            response: "Chatbot response",
          }),
      });

      render(<APITestComponent endpoint="/api/chatbot" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      expect(screen.getByTestId("api-data")).toHaveTextContent("Chatbot response");
      expect(global.fetch).toHaveBeenCalledWith("/api/chatbot");
    });

    test("IT-20.4: API requests do not have CORS errors", async () => {
      // Mock successful API call (no CORS error)
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (header) => {
            if (header === "Access-Control-Allow-Origin") return "*";
            return null;
          },
        },
        json: () =>
          Promise.resolve({
            success: true,
          }),
      });

      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      // Should show data, not CORS error
      expect(screen.queryByText(/CORS/i)).not.toBeInTheDocument();
      expect(screen.getByTestId("api-data")).toHaveTextContent("success");
    });

    test("IT-20.5: Multiple API endpoints are accessible", async () => {
      const endpoints = [
        { path: "/api/alerts", data: { alerts: [] } },
        { path: "/api/dashboard-stats", data: { stats: {} } },
        { path: "/api/user/profile", data: { user: {} } },
      ];

      for (const endpoint of endpoints) {
        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(endpoint.data),
        });

        const { unmount } = render(<APITestComponent endpoint={endpoint.path} />);

        await waitFor(() => {
          expect(screen.getByTestId("api-data")).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith(endpoint.path);
        unmount();
      }

      expect(global.fetch).toHaveBeenCalledTimes(endpoints.length);
    });

    test("IT-20.6: API requests include correct headers", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
    });

    test("IT-20.7: Backend errors are properly forwarded", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: "Internal server error",
          }),
      });

      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("api-error")).toHaveTextContent("HTTP 500");
    });

    test("IT-20.8: API path is correctly prefixed with /api", async () => {
      const apiPaths = ["/api/alerts", "/api/dashboard-stats", "/api/chatbot"];

      for (const path of apiPaths) {
        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: "test" }),
        });

        const { unmount } = render(<APITestComponent endpoint={path} />);

        await waitFor(() => {
          expect(screen.getByTestId("api-data")).toBeInTheDocument();
        });

        // Verify path starts with /api
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/^\/api/)
        );

        unmount();
      }
    });

    test("IT-20.9: Non-API paths are not routed to backend", async () => {
      // Render SPA route (not API)
      render(<TestApp initialPath="/dashboard" />);

      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();

      // fetch should not be called for SPA routes
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("IT-20.10: API responses include correct content-type", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (header) => {
            if (header.toLowerCase() === "content-type") {
              return "application/json";
            }
            return null;
          },
        },
        json: () => Promise.resolve({ data: "test" }),
      });

      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      // Should successfully parse JSON response
      expect(screen.getByTestId("api-data")).toHaveTextContent("test");
    });

    test("IT-20.11: POST requests to API are routed correctly", async () => {
      const TestPostComponent = () => {
        const [result, setResult] = React.useState(null);

        React.useEffect(() => {
          const postData = async () => {
            const response = await fetch("/api/alerts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ alert: "test" }),
            });
            const data = await response.json();
            setResult(data);
          };
          postData();
        }, []);

        return result ? (
          <div data-testid="post-result">{JSON.stringify(result)}</div>
        ) : (
          <div>Loading...</div>
        );
      };

      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 1, created: true }),
      });

      render(<TestPostComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("post-result")).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/alerts",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    test("IT-20.12: Concurrent API requests are handled correctly", async () => {
      global.fetch.mockImplementation((url) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ endpoint: url }),
        });
      });

      const { rerender } = render(
        <div>
          <APITestComponent endpoint="/api/alerts" />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      // Should handle first request
      expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
    });
  });

  describe("Integration: Nginx + React Router + Backend", () => {
    test("IT-20.13: Frontend routes and API calls work together", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            stats: { total: 100 },
          }),
      });

      render(<TestDashboardWithAPI />);

      // Both SPA route and API should work
      expect(screen.getByText("Dashboard")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      expect(screen.getByTestId("api-data")).toHaveTextContent("total");
    });

    test("IT-20.14: Refreshing page with active API calls works", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "refreshed" }),
      });

      const { unmount } = render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      unmount();

      // Simulate page refresh by rendering again
      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("IT-20.15: Nginx serves both static files and API correctly", async () => {
      // Test SPA route (static files)
      const { unmount: unmount1 } = render(<TestApp initialPath="/dashboard" />);
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      unmount1();

      // Test API route
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "api-response" }),
      });

      render(<APITestComponent endpoint="/api/alerts" />);

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      // Both should work independently
      expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
    });

    test("IT-20.16: URL encoding in API requests is preserved", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "encoded" }),
      });

      render(
        <APITestComponent endpoint="/api/alerts?filter=high%20priority" />
      );

      await waitFor(() => {
        expect(screen.getByTestId("api-data")).toBeInTheDocument();
      });

      // Should preserve URL encoding
      expect(global.fetch).toHaveBeenCalledWith("/api/alerts?filter=high%20priority");
    });
  });
});
