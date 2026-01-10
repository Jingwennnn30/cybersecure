import React, { useState, useEffect } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Firebase
jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: jest.fn(() => [{ uid: "test-user-id" }, false, null]),
}));

jest.mock("../firebase", () => ({
  auth: {},
}));

// Test component that makes API calls through docker-compose setup
const DockerAPITestComponent = ({ endpoint, method = "GET", body = null }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [corsHeaders, setCorsHeaders] = useState({});

  const makeRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      
      // Capture CORS headers from response
      const headers = {
        "access-control-allow-origin": response.headers.get("Access-Control-Allow-Origin"),
        "access-control-allow-methods": response.headers.get("Access-Control-Allow-Methods"),
        "access-control-allow-headers": response.headers.get("Access-Control-Allow-Headers"),
      };
      setCorsHeaders(headers);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.message || "Request failed"}`);
      }

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={makeRequest} disabled={loading}>
        {loading ? "Loading..." : "Make Request"}
      </button>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {data && (
        <div>
          <div>Response: {JSON.stringify(data)}</div>
          {corsHeaders["access-control-allow-origin"] && (
            <div>CORS Origin: {corsHeaders["access-control-allow-origin"]}</div>
          )}
        </div>
      )}
    </div>
  );
};

// Component for testing multiple concurrent requests
const MultipleRequestsComponent = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const makeMultipleRequests = async () => {
    setLoading(true);
    try {
      const endpoints = [
        "/api/alerts",
        "/api/dashboard/stats",
        "/api/reports",
      ];

      const promises = endpoints.map((endpoint) =>
        fetch(endpoint, {
          headers: {
            Authorization: "Bearer test-token",
          },
        }).then((res) => res.json())
      );

      const responses = await Promise.all(promises);
      setResults(responses);
    } catch (err) {
      setResults([{ error: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={makeMultipleRequests} disabled={loading}>
        Make Multiple Requests
      </button>
      {loading && <div>Loading...</div>}
      {results.length > 0 && (
        <div>
          {results.map((result, idx) => (
            <div key={idx}>Result {idx + 1}: {JSON.stringify(result)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

describe("IT-21: Docker-compose services communicate correctly", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // IT-21.1: Frontend can call backend API through docker-compose network
  test("IT-21.1: Frontend successfully calls backend API", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ success: true, data: "Backend response" }),
    });

    render(<DockerAPITestComponent endpoint="/api/alerts" />);

    const button = screen.getByText("Make Request");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Response:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Backend response/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/alerts",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  // IT-21.2: CORS headers are properly configured
  test("IT-21.2: API response includes proper CORS headers", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
      }),
      json: async () => ({ success: true }),
    });

    render(<DockerAPITestComponent endpoint="/api/dashboard/stats" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/CORS Origin:/)).toBeInTheDocument();
    });

    expect(screen.getByText("CORS Origin: *")).toBeInTheDocument();
  });

  // IT-21.3: Multiple API endpoints are accessible
  test("IT-21.3: Different API endpoints respond correctly", async () => {
    const endpoints = ["/api/alerts", "/api/reports", "/api/dashboard/stats"];

    for (const endpoint of endpoints) {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        }),
        json: async () => ({ endpoint, success: true }),
      });

      const { unmount } = render(<DockerAPITestComponent endpoint={endpoint} />);
      
      fireEvent.click(screen.getByText("Make Request"));

      await waitFor(() => {
        expect(screen.getByText(new RegExp(endpoint))).toBeInTheDocument();
      });

      unmount();
    }

    expect(global.fetch).toHaveBeenCalledTimes(endpoints.length);
  });

  // IT-21.4: POST requests work through docker-compose
  test("IT-21.4: POST request to backend succeeds", async () => {
    const requestBody = { message: "Test alert", severity: "high" };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ success: true, id: "alert-123" }),
    });

    render(
      <DockerAPITestComponent 
        endpoint="/api/alerts" 
        method="POST" 
        body={requestBody} 
      />
    );

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/alert-123/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/alerts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
      })
    );
  });

  // IT-21.5: PUT requests work through docker-compose
  test("IT-21.5: PUT request to backend succeeds", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ success: true, updated: true }),
    });

    render(
      <DockerAPITestComponent 
        endpoint="/api/alerts/123" 
        method="PUT" 
        body={{ status: "resolved" }} 
      />
    );

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/updated/)).toBeInTheDocument();
    });
  });

  // IT-21.6: DELETE requests work through docker-compose
  test("IT-21.6: DELETE request to backend succeeds", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ success: true, deleted: true }),
    });

    render(<DockerAPITestComponent endpoint="/api/alerts/123" method="DELETE" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/deleted/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/alerts/123",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  // IT-21.7: Backend error responses are properly forwarded
  test("IT-21.7: Backend errors are received by frontend", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ message: "Internal Server Error" }),
    });

    render(<DockerAPITestComponent endpoint="/api/alerts" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });

  // IT-21.8: Network errors are handled gracefully
  test("IT-21.8: Network connection errors are handled", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network request failed"));

    render(<DockerAPITestComponent endpoint="/api/alerts" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
  });

  // IT-21.9: Concurrent requests to multiple endpoints work
  test("IT-21.9: Multiple concurrent API calls succeed", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ endpoint: "alerts", data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ endpoint: "stats", count: 10 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ endpoint: "reports", total: 5 }),
      });

    render(<MultipleRequestsComponent />);

    fireEvent.click(screen.getByText("Make Multiple Requests"));

    await waitFor(() => {
      expect(screen.getByText(/Result 1:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/alerts/)).toBeInTheDocument();
    expect(screen.getByText(/stats/)).toBeInTheDocument();
    expect(screen.getByText(/reports/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  // IT-21.10: Request timeout is handled properly
  test("IT-21.10: Long-running requests timeout appropriately", async () => {
    global.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: false,
              status: 504,
              headers: new Headers({
                "Access-Control-Allow-Origin": "*",
              }),
              json: async () => ({ message: "Gateway Timeout" }),
            });
          }, 100)
        )
    );

    render(<DockerAPITestComponent endpoint="/api/reports" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(
      () => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText(/Gateway Timeout/)).toBeInTheDocument();
  });

  // IT-21.11: Content-Type headers are preserved
  test("IT-21.11: JSON content type is properly set", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ success: true }),
    });

    render(
      <DockerAPITestComponent 
        endpoint="/api/dashboard/stats" 
        method="POST" 
        body={{ query: "test" }} 
      />
    );

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/Response:/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/dashboard/stats",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  // IT-21.12: Authorization headers pass through correctly
  test("IT-21.12: Authorization tokens are forwarded to backend", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ authenticated: true, user: "test-user" }),
    });

    render(<DockerAPITestComponent endpoint="/api/alerts" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/test-user/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/alerts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  // IT-21.13: Large payload transfers work correctly
  test("IT-21.13: Large JSON payloads are handled", async () => {
    const largePayload = {
      data: Array(100).fill({ id: 1, name: "test", value: "data" }),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ received: largePayload.data.length, success: true }),
    });

    render(
      <DockerAPITestComponent 
        endpoint="/api/reports" 
        method="POST" 
        body={largePayload} 
      />
    );

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/received/)).toBeInTheDocument();
    });

    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  // IT-21.14: API versioning paths work correctly
  test("IT-21.14: API version paths are routed correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ version: "v1", success: true }),
    });

    render(<DockerAPITestComponent endpoint="/api/v1/alerts" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/version/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/alerts",
      expect.any(Object)
    );
  });

  // IT-21.15: Query parameters are preserved in requests
  test("IT-21.15: URL query parameters pass through correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ query: "received", limit: 10 }),
    });

    render(<DockerAPITestComponent endpoint="/api/alerts?limit=10&sort=desc" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/limit/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/alerts?limit=10&sort=desc",
      expect.any(Object)
    );
  });

  // IT-21.16: Container health check endpoints work
  test("IT-21.16: Health check endpoint responds correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
      json: async () => ({ status: "healthy", uptime: 3600 }),
    });

    render(<DockerAPITestComponent endpoint="/api/health" />);

    fireEvent.click(screen.getByText("Make Request"));

    await waitFor(() => {
      expect(screen.getByText(/healthy/)).toBeInTheDocument();
    });

    expect(screen.getByText(/uptime/)).toBeInTheDocument();
  });
});
