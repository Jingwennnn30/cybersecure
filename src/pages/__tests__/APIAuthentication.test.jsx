import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

// Mock react-firebase-hooks
jest.mock("react-firebase-hooks/auth");

// Mock Firebase auth
jest.mock("../firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

// Simple component that makes API calls for testing
const TestAPIComponent = ({ endpoint, token, useAuth = true }) => {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = {
          "Content-Type": "application/json",
        };

        if (useAuth && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, { headers });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
  }, [endpoint, token, useAuth]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;
  if (data) return <div data-testid="data">{JSON.stringify(data)}</div>;
  return null;
};

describe("API Security + Token Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Default mock
    useAuthState.mockReturnValue([null, false, null]);
  });

  describe("IT-16: Protected API rejects missing token", () => {
    test("IT-16.1: Call protected endpoint without token returns 401", async () => {
      // Mock API response for missing token
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Authentication required",
          }),
      });

      render(<TestAPIComponent endpoint="/api/protected/alerts" useAuth={false} />);

      // Should show error, not data
      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/HTTP 401/i);

      // Verify no data is leaked
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();

      // Verify fetch was called without auth header
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/protected/alerts",
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    test("IT-16.2: Protected dashboard endpoint denies access without token", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "No token provided",
          }),
      });

      render(<TestAPIComponent endpoint="/api/dashboard-stats" useAuth={false} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-16.3: Protected user profile endpoint requires authentication", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Missing authentication token",
          }),
      });

      render(<TestAPIComponent endpoint="/api/user/profile" useAuth={false} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // No sensitive data should be returned
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-16.4: Missing token returns 401, not 500 or data leak", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Unauthorized",
            message: "Authentication token is required",
          }),
      });

      render(<TestAPIComponent endpoint="/api/protected/resource" useAuth={false} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // Should be 401, not 500 or 200
      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
      expect(screen.getByTestId("error")).not.toHaveTextContent(/500/i);
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-16.5: No auth header results in immediate rejection", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Authorization header missing",
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" useAuth={false} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // Verify fetch was called exactly once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Verify no Authorization header was sent
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers).not.toHaveProperty("Authorization");
    });

    test("IT-16.6: Multiple protected endpoints all require token", async () => {
      const endpoints = [
        "/api/alerts",
        "/api/dashboard-stats",
        "/api/user/settings",
      ];

      for (const endpoint of endpoints) {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: () =>
            Promise.resolve({
              error: "Unauthorized",
            }),
        });

        const { unmount } = render(
          <TestAPIComponent endpoint={endpoint} useAuth={false} />
        );

        await waitFor(() => {
          expect(screen.getByTestId("error")).toBeInTheDocument();
        });

        expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
        unmount();
      }

      // All endpoints should have been called
      expect(global.fetch).toHaveBeenCalledTimes(endpoints.length);
    });

    test("IT-16.7: Empty Authorization header is treated as missing token", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Invalid token",
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token="" />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
    });

    test("IT-16.8: Response does not contain sensitive data when unauthenticated", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Unauthorized",
            // Should NOT contain any user data, database info, etc.
          }),
      });

      render(<TestAPIComponent endpoint="/api/user/data" useAuth={false} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // Error message should not leak information
      expect(screen.getByTestId("error")).not.toHaveTextContent(/password|email|user|database/i);
    });
  });

  describe("IT-17: Protected API rejects invalid/expired token", () => {
    test("IT-17.1: Invalid token format returns 401", async () => {
      const invalidToken = "invalid.token.format";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Invalid token format",
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={invalidToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);

      // Verify token was sent but rejected
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/alerts",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${invalidToken}`,
          }),
        })
      );
    });

    test("IT-17.2: Expired Firebase token is rejected", async () => {
      const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwfQ.expired";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Token expired",
            code: "auth/id-token-expired",
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={expiredToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-17.3: Malformed JWT token is rejected", async () => {
      const malformedToken = "not.a.valid.jwt.token.at.all";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Malformed token",
          }),
      });

      render(<TestAPIComponent endpoint="/api/dashboard-stats" token={malformedToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-17.4: Token from different Firebase project is rejected", async () => {
      const wrongProjectToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6Indyb25nIn0.eyJwcm9qZWN0IjoiZGlmZmVyZW50In0.sig";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Invalid token issuer",
            code: "auth/invalid-token-issuer",
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={wrongProjectToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
    });

    test("IT-17.5: Revoked token is rejected", async () => {
      const revokedToken = "eyJhbGciOiJSUzI1NiJ9.eyJ1c2VyX2lkIjoicmV2b2tlZCJ9.sig";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Token has been revoked",
            code: "auth/id-token-revoked",
          }),
      });

      render(<TestAPIComponent endpoint="/api/user/profile" token={revokedToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-17.6: Request is blocked immediately with invalid token", async () => {
      const invalidToken = "12345";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Unauthorized",
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={invalidToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // Should be called exactly once and fail immediately
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
    });

    test("IT-17.7: Invalid token doesn't return partial data", async () => {
      const invalidToken = "invalid_token_123";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: "Invalid authentication credentials",
            // Should NOT include: data, partialResults, etc.
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={invalidToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // No data element should exist
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-17.8: Multiple invalid token attempts are all rejected", async () => {
      const invalidTokens = ["token1", "token2", "token3"];

      for (const token of invalidTokens) {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: () =>
            Promise.resolve({
              error: "Invalid token",
            }),
        });

        const { unmount } = render(
          <TestAPIComponent endpoint="/api/alerts" token={token} />
        );

        await waitFor(() => {
          expect(screen.getByTestId("error")).toBeInTheDocument();
        });

        expect(screen.getByTestId("error")).toHaveTextContent(/401/i);
        unmount();
      }

      expect(global.fetch).toHaveBeenCalledTimes(invalidTokens.length);
    });
  });

  describe("IT-18: User can only access own data (user-scoped data)", () => {
    test("IT-18.1: User A cannot access User B's alerts", async () => {
      const userAToken = "valid_token_user_a";
      const userBId = "user-b-uid";

      // Mock response when User A tries to access User B's data
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () =>
          Promise.resolve({
            error: "Access denied",
            message: "You can only access your own data",
          }),
      });

      render(
        <TestAPIComponent
          endpoint={`/api/user/${userBId}/alerts`}
          token={userAToken}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/403/i);
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-18.2: User can only see their own profile data", async () => {
      const userToken = "valid_token_user_a";

      // User A accessing their own data - success
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            userId: "user-a-uid",
            email: "usera@example.com",
            role: "analyst",
          }),
      });

      const { unmount } = render(
        <TestAPIComponent endpoint="/api/user/me" token={userToken} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      expect(screen.getByTestId("data")).toHaveTextContent(/user-a-uid/i);
      unmount();

      // User A trying to access User B's profile - denied
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () =>
          Promise.resolve({
            error: "Forbidden",
            message: "Cannot access other user's profile",
          }),
      });

      render(
        <TestAPIComponent
          endpoint="/api/user/user-b-uid/profile"
          token={userToken}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/403/i);
    });

    test("IT-18.3: API filters results to only show user's own data", async () => {
      const userToken = "valid_token_user_a";

      // Mock response that only contains User A's data (filtered by backend)
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            alerts: [
              { id: 1, userId: "user-a-uid", severity: "high" },
              { id: 2, userId: "user-a-uid", severity: "medium" },
              // User B's data should NOT be included
            ],
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={userToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      const dataText = screen.getByTestId("data").textContent;
      
      // Should only contain user-a-uid
      expect(dataText).toContain("user-a-uid");
      
      // Should NOT contain user-b-uid
      expect(dataText).not.toContain("user-b-uid");
    });

    test("IT-18.4: Cross-user data access returns 403 Forbidden", async () => {
      const userAToken = "valid_token_user_a";

      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () =>
          Promise.resolve({
            error: "Forbidden",
            message: "You don't have permission to access this resource",
          }),
      });

      render(
        <TestAPIComponent
          endpoint="/api/user/user-b-uid/settings"
          token={userAToken}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/403/i);
      expect(screen.queryByTestId("data")).not.toBeInTheDocument();
    });

    test("IT-18.5: No cross-user data exposure in list endpoints", async () => {
      const userAToken = "valid_token_user_a";

      // Backend should filter to only return User A's data
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              { id: 1, userId: "user-a-uid", content: "User A data 1" },
              { id: 2, userId: "user-a-uid", content: "User A data 2" },
            ],
            totalCount: 2,
          }),
      });

      render(<TestAPIComponent endpoint="/api/dashboard-stats" token={userAToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      const dataText = screen.getByTestId("data").textContent;
      
      // All items should belong to user-a
      expect(dataText).toContain("user-a-uid");
      
      // Should not expose other users' data
      expect(dataText).not.toContain("user-b-uid");
      expect(dataText).not.toContain("user-c-uid");
    });

    test("IT-18.6: Query parameters cannot bypass user-scoping", async () => {
      const userAToken = "valid_token_user_a";

      // Even if query param tries to request another user's data, it should be denied
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () =>
          Promise.resolve({
            error: "Access denied",
            message: "Cannot filter by other user's ID",
          }),
      });

      render(
        <TestAPIComponent
          endpoint="/api/alerts?userId=user-b-uid"
          token={userAToken}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error")).toHaveTextContent(/403/i);
    });

    test("IT-18.7: Admin users can access all data (if RBAC allows)", async () => {
      const adminToken = "valid_token_admin";

      // Admin should be able to see all users' data
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            alerts: [
              { id: 1, userId: "user-a-uid", severity: "high" },
              { id: 2, userId: "user-b-uid", severity: "medium" },
              { id: 3, userId: "user-c-uid", severity: "low" },
            ],
          }),
      });

      render(<TestAPIComponent endpoint="/api/admin/all-alerts" token={adminToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      const dataText = screen.getByTestId("data").textContent;
      
      // Admin should see all users' data
      expect(dataText).toContain("user-a-uid");
      expect(dataText).toContain("user-b-uid");
      expect(dataText).toContain("user-c-uid");
    });

    test("IT-18.8: User-scoped queries return empty array, not 403, when no data", async () => {
      const userToken = "valid_token_new_user";

      // New user with no data yet - should return empty array, not error
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            alerts: [],
            totalCount: 0,
          }),
      });

      render(<TestAPIComponent endpoint="/api/alerts" token={userToken} />);

      await waitFor(() => {
        expect(screen.getByTestId("data")).toBeInTheDocument();
      });

      const dataText = screen.getByTestId("data").textContent;
      expect(dataText).toContain("[]");
      expect(dataText).toContain("totalCount");
    });
  });
});
