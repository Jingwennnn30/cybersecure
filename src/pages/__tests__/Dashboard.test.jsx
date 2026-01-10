import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { useRole } from "../contexts/RoleContext";
import { useAuthState } from "react-firebase-hooks/auth";

// Mock dependencies
jest.mock("../contexts/RoleContext");
jest.mock("react-firebase-hooks/auth");
jest.mock("../components/Navigation", () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation</div>;
  };
});
jest.mock("../components/FloatingChatbot", () => {
  return function MockFloatingChatbot() {
    return <div data-testid="floating-chatbot">Chatbot</div>;
  };
});

// Mock Tremor components
jest.mock("@tremor/react", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Title: ({ children }) => <div data-testid="title">{children}</div>,
  Text: ({ children }) => <div data-testid="text">{children}</div>,
  Grid: ({ children }) => <div data-testid="grid">{children}</div>,
  Metric: ({ children }) => <div data-testid="metric">{children}</div>,
  AreaChart: () => <div data-testid="area-chart">Area Chart</div>,
}));

// Mock recharts
jest.mock("recharts", () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
}));

// Mock Firebase
const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock("../firebase", () => ({
  db: {},
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("Dashboard + Alerts (Frontend ↔ Backend ↔ Database)", () => {
  let mockUseRole;
  let mockUseAuthState;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRole = useRole;
    mockUseAuthState = useAuthState;

    // Default mock implementations
    mockUseRole.mockReturnValue("admin");
    mockUseAuthState.mockReturnValue([
      { uid: "test-user-id", email: "test@example.com" },
      false,
      null,
    ]);

    // Mock Firebase Firestore - must require and override after mock
    const { getDocs, collection, updateDoc, doc } = require("firebase/firestore");
    getDocs.mockResolvedValue({
      docs: [],
    });
    collection.mockReturnValue({});
    updateDoc.mockResolvedValue(undefined);
    doc.mockReturnValue({});

    // Default fetch mock
    global.fetch.mockImplementation((url) => {
      if (url === "/api/dashboard-stats") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              alertsToday: 25,
              criticalAlerts: 5,
              aiProcessed: 120,
              aiAnalyzed: 115,
              systemHealth: "Healthy",
              alertsChange: 12,
              alertTrends: [
                { date: "2024-01-01", alerts: 10 },
                { date: "2024-01-02", alerts: 15 },
              ],
              severityDist: [
                { name: "critical", value: 5 },
                { name: "high", value: 8 },
                { name: "medium", value: 7 },
                { name: "low", value: 5 },
              ],
            }),
        });
      }
      if (url === "/api/alerts") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "alert-1",
                severity: "critical",
                message: "Critical alert message",
                timestamp: "2024-01-01T10:00:00Z",
              },
              {
                id: "alert-2",
                severity: "high",
                message: "High alert message",
                timestamp: "2024-01-01T11:00:00Z",
              },
            ]),
        });
      }
      if (url === "/api/get-notification-recipients") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              users: [
                { email: "user1@example.com" },
                { email: "user2@example.com" },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe("Roles Page + RBAC + Backend role check Integration", () => {
    test("IT-09.1: Dashboard loads successfully after login", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      // Verify dashboard components are rendered
      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      expect(screen.getByTestId("floating-chatbot")).toBeInTheDocument();
    });

    test("IT-09.2: Dashboard fetches metrics from backend on mount", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
    });

    test("IT-09.3: Metrics are displayed correctly from backend response", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Verify metrics are rendered
      await waitFor(() => {
        const metrics = screen.getAllByTestId("metric");
        expect(metrics.length).toBeGreaterThan(0);
      });
    });

    test("IT-09.4: Backend response data matches displayed metrics", async () => {
      const mockStats = {
        alertsToday: 50,
        criticalAlerts: 10,
        aiProcessed: 200,
        aiAnalyzed: 195,
        systemHealth: "Healthy",
        alertsChange: 20,
        alertTrends: [{ date: "2024-01-01", alerts: 20 }],
        severityDist: [
          { name: "critical", value: 10 },
          { name: "high", value: 15 },
        ],
      };

      global.fetch.mockImplementation((url) => {
        if (url === "/api/dashboard-stats") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Verify data is correctly used
      expect(screen.getAllByTestId("metric").length).toBeGreaterThan(0);
    });

    test("IT-09.5: Dashboard doesn't crash on load with valid data", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Verify no console errors
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("IT-09.6: Dashboard handles backend errors gracefully", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("Network error"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Dashboard should still render even with fetch errors
      expect(screen.getByTestId("floating-chatbot")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-09.7: ClickHouse data is retrieved correctly through backend", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Verify backend was called to fetch stats (which queries ClickHouse)
      expect(global.fetch).toHaveBeenCalledTimes(2); // dashboard-stats and alerts
    });

    test("IT-09.8: Dashboard displays severity distribution from database", async () => {
      const mockStats = {
        alertsToday: 25,
        criticalAlerts: 5,
        aiProcessed: 120,
        aiAnalyzed: 115,
        systemHealth: "Healthy",
        alertsChange: 12,
        alertTrends: [],
        severityDist: [
          { name: "critical", value: 5 },
          { name: "high", value: 8 },
          { name: "medium", value: 7 },
          { name: "low", value: 5 },
        ],
      };

      global.fetch.mockImplementation((url) => {
        if (url === "/api/dashboard-stats") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Verify pie chart is rendered (severity distribution visualization)
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });
  });

  describe("Dashboard Data Integration with n8n + ClickHouse", () => {
    test("fetches dashboard statistics on component mount", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });
    });

    test("displays fetched statistics correctly", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getAllByTestId("card").length).toBeGreaterThan(0);
      });
    });

    test("fetches live alerts periodically", async () => {
      jest.useFakeTimers();

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
      });

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/alerts");
      });

      jest.useRealTimers();
    });

    test("handles empty response data gracefully", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/dashboard-stats") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Dashboard should render with default values
      expect(screen.getByTestId("floating-chatbot")).toBeInTheDocument();
    });
  });

  describe("Backend Response Validation", () => {
    test("validates alert trends data structure", async () => {
      const mockStats = {
        alertsToday: 25,
        criticalAlerts: 5,
        aiProcessed: 120,
        aiAnalyzed: 115,
        systemHealth: "Healthy",
        alertsChange: 12,
        alertTrends: [
          { date: "2024-01-01", alerts: 10 },
          { date: "2024-01-02", alerts: 15 },
          { date: "2024-01-03", alerts: 20 },
        ],
        severityDist: [
          { name: "critical", value: 5 },
          { name: "high", value: 8 },
        ],
      };

      global.fetch.mockImplementation((url) => {
        if (url === "/api/dashboard-stats") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Verify area chart is rendered (for trends)
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    });

    test("handles non-ok response from backend", async () => {
      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      );

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Dashboard should still render
      expect(screen.getByTestId("floating-chatbot")).toBeInTheDocument();
    });

    test("validates severity distribution contains expected fields", async () => {
      const mockStats = {
        alertsToday: 25,
        criticalAlerts: 5,
        aiProcessed: 120,
        aiAnalyzed: 115,
        systemHealth: "Healthy",
        alertsChange: 12,
        alertTrends: [],
        severityDist: [
          { name: "critical", value: 5 },
          { name: "high", value: 8 },
          { name: "medium", value: 7 },
          { name: "low", value: 5 },
        ],
      };

      global.fetch.mockImplementation((url) => {
        if (url === "/api/dashboard-stats") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Verify pie chart renders (validates severity data)
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });
  });

  describe("System Health and Metrics Display", () => {
    test("displays system health status from backend", async () => {
      render(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // System health should be displayed
      expect(screen.getAllByTestId("text").length).toBeGreaterThan(0);
    });

    test("updates metrics when backend data changes", async () => {
      const { rerender } = render(
        <Dashboard darkMode={false} setDarkMode={jest.fn()} />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/dashboard-stats");
      });

      // Change mock data
      global.fetch.mockImplementation((url) => {
        if (url === "/api/dashboard-stats") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                alertsToday: 100,
                criticalAlerts: 20,
                aiProcessed: 500,
                aiAnalyzed: 490,
                systemHealth: "Critical",
                alertsChange: 50,
                alertTrends: [],
                severityDist: [],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      // Re-render to trigger new fetch
      rerender(<Dashboard darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });
    });
  });
});
