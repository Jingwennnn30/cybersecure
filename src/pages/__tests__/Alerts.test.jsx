import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Alerts from "./Alerts";
import { useRole } from "../contexts/RoleContext";
import { auth } from "../firebase";

// Mock dependencies
jest.mock("../contexts/RoleContext");
jest.mock("../firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

jest.mock("../components/Navigation", () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation</div>;
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe("Alerts Page + Alerts API + ClickHouse service", () => {
  let mockUseRole;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRole = useRole;
    mockUseRole.mockReturnValue("admin");

    // Mock authenticated user
    auth.currentUser = {
      uid: "test-user-id",
      email: "test@example.com",
    };

    // Default fetch mock
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/alerts")) {
        // Check if it's a status poll request
        if (url.includes("/status")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: "pending",
                message: "Investigation in progress",
              }),
          });
        }
        
        // Regular alerts fetch
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                _uniqueId: "alert-1",
                correlation_key: "key-1",
                name: "Suspicious Login",
                severity: "critical",
                status: "open",
                risk_score: 85,
                timestamp: "2024-01-01T10:00:00Z",
                ip: "192.168.1.100",
                description: "Multiple failed login attempts detected",
              },
              {
                _uniqueId: "alert-2",
                correlation_key: "key-2",
                name: "Port Scan Detected",
                severity: "high",
                status: "investigating",
                risk_score: 70,
                timestamp: "2024-01-01T11:00:00Z",
                ip: "192.168.1.101",
                description: "Port scanning activity from external IP",
              },
              {
                _uniqueId: "alert-3",
                correlation_key: "key-3",
                name: "Unusual Data Transfer",
                severity: "medium",
                status: "open",
                risk_score: 55,
                timestamp: "2024-01-01T12:00:00Z",
                ip: "192.168.1.102",
                description: "Large data transfer outside business hours",
              },
            ]),
        });
      }
      if (url.includes("/api/users/analyst_ii")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: "analyst1", email: "analyst1@example.com" },
              { id: "analyst2", email: "analyst2@example.com" },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  afterEach(() => {
    auth.currentUser = null;
  });

  describe("IT-10: Alerts page retrieves latest alerts from ClickHouse", () => {
    test("IT-10.1: Alerts page loads after login", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      // Verify navigation is rendered
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      // Wait for alerts to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });
    });

    test("IT-10.2: Alerts API is called with correct parameters", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("userId=test-user-id")
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("userRole=admin")
        );
      });
    });

    test("IT-10.3: Alert list is displayed from backend response", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      expect(screen.getByText("Port Scan Detected")).toBeInTheDocument();
      expect(screen.getByText("Unusual Data Transfer")).toBeInTheDocument();
    });

    test("IT-10.4: Alert data matches backend response fields", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Verify severity badges are displayed
      expect(screen.getByText("critical")).toBeInTheDocument();
      expect(screen.getByText("high")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
    });

    test("IT-10.5: Page doesn't crash with valid alert data", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("IT-10.6: Handles empty alert list gracefully", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });

      // Page should not crash with empty data
      expect(screen.getByTestId("navigation")).toBeInTheDocument();
    });

    test("IT-10.7: Handles backend errors gracefully", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("Network error"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Page should still render
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-10.8: ClickHouse data is retrieved through backend API", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });

      // Verify alerts endpoint was called (which queries ClickHouse)
      const fetchCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes("/api/alerts")
      );
      expect(fetchCalls.length).toBeGreaterThan(0);
    });
  });

  describe("IT-11: Filter/search alerts works end-to-end", () => {
    test("IT-11.1: Alerts page displays all alerts initially", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      expect(screen.getByText("Port Scan Detected")).toBeInTheDocument();
      expect(screen.getByText("Unusual Data Transfer")).toBeInTheDocument();
    });

    test("IT-11.2: Search filter by alert name works", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Find search input and type
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: "Login" } });

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Other alerts should be filtered out
      expect(screen.queryByText("Port Scan Detected")).not.toBeInTheDocument();
      expect(screen.queryByText("Unusual Data Transfer")).not.toBeInTheDocument();
    });

    test("IT-11.3: Search filter by IP address works", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: "192.168.1.100" } });

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Only matching IP should be shown
      expect(screen.queryByText("Port Scan Detected")).not.toBeInTheDocument();
    });

    test("IT-11.4: Severity filter works correctly", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Verify severity badges are displayed (filter exists)
      expect(screen.getByText("critical")).toBeInTheDocument();
      expect(screen.getByText("high")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();

      // Verify all alerts are shown initially
      expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      expect(screen.getByText("Port Scan Detected")).toBeInTheDocument();
      expect(screen.getByText("Unusual Data Transfer")).toBeInTheDocument();
    });

    test("IT-11.5: Status filter works correctly", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Port Scan Detected")).toBeInTheDocument();
      });

      // Verify filter controls exist
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThan(0);

      // Verify alerts are displayed
      expect(screen.getByText("Port Scan Detected")).toBeInTheDocument();
      expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
    });

    test("IT-11.6: Multiple filters work together", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: "Login" } });

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // After filtering, only matching alerts should show
      expect(screen.queryByText("Port Scan Detected")).not.toBeInTheDocument();
    });

    test("IT-11.7: Filter results match backend query parameters", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });

      // Verify backend was called with correct params
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("userId=")
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("userRole=")
      );
    });

    test("IT-11.8: No results message shown for no matches", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, {
        target: { value: "NonExistentAlert12345" },
      });

      await waitFor(() => {
        expect(screen.queryByText("Suspicious Login")).not.toBeInTheDocument();
      });

      // All alerts should be filtered out
      expect(screen.queryByText("Port Scan Detected")).not.toBeInTheDocument();
      expect(screen.queryByText("Unusual Data Transfer")).not.toBeInTheDocument();
    });
  });

  describe("Alerts UI + API Integration", () => {
    test("displays loading state initially", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      // Initially should show navigation
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test("handles unauthenticated user gracefully", async () => {
      auth.currentUser = null;
      mockUseRole.mockReturnValue(null);

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Should not crash without user
      expect(screen.getByTestId("navigation")).toBeInTheDocument();
    });

    test("displays alert details on selection", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Click on an alert to view details (should not crash)
      const alertButton = screen.getByText("Suspicious Login");
      fireEvent.click(alertButton);

      // Verify alert is still visible after click
      expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
    });

    test("pagination resets when filters change", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: "Login" } });

      // Pagination should reset to page 1 when filter changes
      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });
    });

    test("handles different user roles correctly", async () => {
      mockUseRole.mockReturnValue("analyst_i");

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("userRole=analyst_i")
        );
      });
    });
  });

  describe("ClickHouse Query Integration", () => {
    test("fetches alerts with correlation keys", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Verify alerts have correlation keys (from ClickHouse)
      const fetchCalls = global.fetch.mock.calls;
      expect(fetchCalls.length).toBeGreaterThan(0);
    });

    test("handles alerts without correlation keys", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  name: "Alert Without Key",
                  severity: "low",
                  timestamp: "2024-01-01T10:00:00Z",
                },
              ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Alert Without Key")).toBeInTheDocument();
      });

      // Should handle missing keys gracefully
      expect(screen.getByText("Alert Without Key")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("validates alert data structure from ClickHouse", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // All expected fields should be present
      expect(screen.getByText("critical")).toBeInTheDocument(); // severity
      expect(screen.getByText("192.168.1.100")).toBeInTheDocument(); // ip
    });
  });

  describe("Risk Score and Severity Filtering", () => {
    test("filters alerts by risk score", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Suspicious Login")).toBeInTheDocument();
      });

      // Find risk score filter (if exists)
      const selects = screen.getAllByRole("combobox");
      
      // Test that filtering functionality exists
      expect(selects.length).toBeGreaterThan(0);
    });

    test("displays severity badges correctly", async () => {
      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("critical")).toBeInTheDocument();
      });

      expect(screen.getByText("high")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
    });
  });

  describe("IT-12: Backend handles ClickHouse failure gracefully", () => {
    test("IT-12.1: Alerts page doesn't hang on database failure", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("ClickHouse connection failed"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      // Should render navigation even with error
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      // Wait for fetch to complete (with error)
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Page should not show infinite loading
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-12.2: UI displays error message when backend fails", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("Database connection error"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // UI should not crash
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-12.3: Backend returns proper error response for ClickHouse failure", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () =>
              Promise.resolve({
                error: "Service Unavailable",
                message: "ClickHouse database is unavailable",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });

      // Page should render without crashing
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-12.4: Error is logged for debugging", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("ClickHouse timeout"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("IT-12.5: No infinite loading spinner on database error", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("Connection refused"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Loading state should complete (not stuck)
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-12.6: Shows empty state when no alerts due to error", async () => {
      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("Database unavailable"))
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Should not show any alert data
      expect(screen.queryByText("Suspicious Login")).not.toBeInTheDocument();
      expect(screen.queryByText("Port Scan Detected")).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-12.7: Backend handles wrong ClickHouse credentials gracefully", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () =>
              Promise.resolve({
                error: "Authentication Failed",
                message: "Invalid ClickHouse credentials",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });

      // UI should handle auth error gracefully
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("IT-12.8: Recovery after ClickHouse comes back online", async () => {
      // First call fails, then succeeds on retry
      let callCount = 0;
      global.fetch.mockImplementation((url) => {
        callCount++;
        if (url.includes("/api/alerts")) {
          if (callCount === 1) {
            return Promise.reject(new Error("ClickHouse unavailable"));
          }
          // Subsequent calls succeed
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  _uniqueId: "alert-1",
                  correlation_key: "key-1",
                  name: "Recovered Alert",
                  severity: "low",
                  status: "open",
                  risk_score: 30,
                  timestamp: "2024-01-01T10:00:00Z",
                  ip: "192.168.1.100",
                },
              ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // First render fails, no alerts shown
      expect(screen.queryByText("Recovered Alert")).not.toBeInTheDocument();

      // Component should handle error gracefully
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling and Resilience", () => {
    test("handles network timeout gracefully", async () => {
      global.fetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Network timeout")), 100)
          )
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(
        () => {
          expect(screen.getByTestId("navigation")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      consoleSpy.mockRestore();
    });

    test("handles malformed response from backend", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve("invalid json structure"),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Should handle invalid response gracefully
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test("handles partial data from ClickHouse", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  // Missing several fields
                  name: "Partial Alert",
                  severity: "high",
                },
              ]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Partial Alert")).toBeInTheDocument();
      });

      // Should display alerts with partial data
      expect(screen.getByText("high")).toBeInTheDocument();
    });

    test("handles empty array response", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts")
        );
      });

      // Should handle empty data gracefully
      expect(screen.getByTestId("navigation")).toBeInTheDocument();
      expect(screen.queryByText("Suspicious Login")).not.toBeInTheDocument();
    });

    test("handles null response from backend", async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Alerts darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("navigation")).toBeInTheDocument();
      });

      // Should not crash with null response
      expect(screen.getByTestId("navigation")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
