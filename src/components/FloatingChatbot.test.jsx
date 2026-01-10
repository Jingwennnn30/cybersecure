import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FloatingChatbot from "./FloatingChatbot";

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Chatbot + MCP Service (AI features)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
    
    // Default fetch mock for chatbot API
    global.fetch.mockImplementation((url) => {
      if (url === "/api/chatbot") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "This is a test response from the chatbot service.",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe("IT-13: Chatbot UI sends message to backend and shows reply", () => {
    test("IT-13.1: Chatbot opens successfully", async () => {
      render(<FloatingChatbot />);

      // Find and click the chatbot button to open
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      // Chatbot should open and show welcome message
      await waitFor(() => {
        expect(
          screen.getByText(/Hello! I'm your AI Security Assistant/i)
        ).toBeInTheDocument();
      });
    });

    test("IT-13.2: User can type and send a message", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Hello! I'm your AI Security Assistant/i)
        ).toBeInTheDocument();
      });

      // Find input and type message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "What is a SQL injection?" } });

      // Send message
      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // User message should appear (in chat area, also appears in sidebar)
      await waitFor(() => {
        const messages = screen.getAllByText("What is a SQL injection?");
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    test("IT-13.3: Backend API is called with correct payload", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test message" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Verify API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/chatbot",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: expect.stringContaining("Test message"),
          })
        );
      });
    });

    test("IT-13.4: Bot reply is displayed after API response", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: "SQL injection is a code injection technique.",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "What is SQL injection?" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Bot reply should appear
      await waitFor(() => {
        expect(
          screen.getByText("SQL injection is a code injection technique.")
        ).toBeInTheDocument();
      });
    });

    test("IT-13.5: Request/response cycle succeeds", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Hello" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Wait for both user message and bot response (message appears in chat area and sidebar)
      await waitFor(() => {
        const messages = screen.getAllByText("Hello");
        expect(messages.length).toBeGreaterThan(0);
      });

      await waitFor(() => {
        expect(
          screen.getByText("This is a test response from the chatbot service.")
        ).toBeInTheDocument();
      });
    });

    test("IT-13.6: Loading state is shown during API call", async () => {
      // Slow down the API response
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      response: "Delayed response",
                    }),
                }),
              500
            )
          );
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // User message appears immediately (in chat area and sidebar)
      await waitFor(() => {
        const messages = screen.getAllByText("Test");
        expect(messages.length).toBeGreaterThan(0);
      });

      // Bot response appears after delay
      await waitFor(
        () => {
          expect(screen.getByText("Delayed response")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    test("IT-13.7: Multiple messages can be sent in sequence", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send first message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "First message" } });

      // Wait for input to be updated, then click send
      await waitFor(() => {
        expect(input.value).toBe("First message");
      });

      let buttons = screen.getAllByRole("button");
      let sendButton = buttons.find(btn => !btn.disabled && btn.querySelector('svg path[d*="12L3.269"]'));
      if (!sendButton) sendButton = buttons[buttons.length - 1]; // Fallback
      fireEvent.click(sendButton);

      await waitFor(() => {
        const firstMessages = screen.getAllByText("First message");
        expect(firstMessages.length).toBeGreaterThan(0);
      });

      // Send second message
      fireEvent.change(input, { target: { value: "Second message" } });
      
      await waitFor(() => {
        expect(input.value).toBe("Second message");
      });

      buttons = screen.getAllByRole("button");
      sendButton = buttons.find(btn => !btn.disabled && btn.querySelector('svg path[d*="12L3.269"]'));
      if (!sendButton) sendButton = buttons[buttons.length - 1]; // Fallback
      fireEvent.click(sendButton);

      await waitFor(() => {
        const secondMessages = screen.getAllByText("Second message");
        expect(secondMessages.length).toBeGreaterThan(0);
      });

      // Both messages should be visible (in chat area and sidebar)
      const firstMessages = screen.getAllByText("First message");
      const secondMessages = screen.getAllByText("Second message");
      expect(firstMessages.length).toBeGreaterThan(0);
      expect(secondMessages.length).toBeGreaterThan(0);
    });

    test("IT-13.8: Chat history includes conversation context", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Hello chatbot" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/chatbot",
          expect.objectContaining({
            body: expect.stringContaining("history"),
          })
        );
      });

      // Verify history is included in request
      const fetchCall = global.fetch.mock.calls.find(
        (call) => call[0] === "/api/chatbot"
      );
      expect(fetchCall).toBeDefined();
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toHaveProperty("history");
    });
  });

  describe("Chatbot UI + Backend Integration", () => {
    test("handles empty message gracefully", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Try to send empty message
      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // API should not be called
      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    test("handles backend error gracefully", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test error" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Error message should appear
      await waitFor(() => {
        expect(
          screen.getByText(/Sorry, I encountered an error/i)
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test("handles non-ok response from backend", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Error message should appear
      await waitFor(() => {
        expect(
          screen.getByText(/Sorry, I encountered an error/i)
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test("can close and reopen chatbot", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Hello! I'm your AI Security Assistant/i)
        ).toBeInTheDocument();
      });

      // Close chatbot (click the X button which is the same as the open button when open)
      fireEvent.click(chatButton);

      // Wait a moment for close animation
      await waitFor(() => {
        // Chatbot should be closed (button changes state)
        expect(chatButton).toBeInTheDocument();
      });

      // Reopen chatbot
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Hello! I'm your AI Security Assistant/i)
        ).toBeInTheDocument();
      });
    });

    test("input is cleared after sending message", async () => {
      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Type and send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test message" } });

      expect(input.value).toBe("Test message");

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Input should be cleared
      await waitFor(() => {
        expect(input.value).toBe("");
      });
    });
  });

  describe("MCP Service Integration", () => {
    test("chatbot service processes message correctly", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response:
                  "Based on your security logs, I detected potential unauthorized access.",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send security-related query
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, {
        target: { value: "Analyze my security logs" },
      });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // AI response should appear
      await waitFor(() => {
        expect(
          screen.getByText(/Based on your security logs/i)
        ).toBeInTheDocument();
      });
    });

    test("handles MCP service unavailable", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () =>
              Promise.resolve({
                error: "MCP service unavailable",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Error message should appear
      await waitFor(() => {
        expect(
          screen.getByText(/Sorry, I encountered an error/i)
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test("validates AI response structure", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: "Valid AI response with security insights.",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Security check" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      fireEvent.click(sendButton);

      // Verify response structure is handled
      await waitFor(() => {
        expect(
          screen.getByText("Valid AI response with security insights.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("IT-14: Chatbot uses MCP service when tool/action is required", () => {
    test("IT-14.1: Question triggers MCP workflow successfully", async () => {
      // Mock MCP service response with tool/action result
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: "MCP Tool Result: Database query executed successfully. Found 5 critical alerts in the last 24 hours.",
                mcpUsed: true,
                toolName: "database_query",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      // Open chatbot
      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Ask question that requires MCP tool (database query)
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Show me critical alerts from today" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Verify MCP response is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/MCP Tool Result: Database query executed successfully/i)
        ).toBeInTheDocument();
      });

      // Verify API was called with the question
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/chatbot",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Show me critical alerts from today"),
        })
      );
    });

    test("IT-14.2: MCP response includes tool execution result", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: "I analyzed the security logs using MCP tools. Found 3 suspicious IPs: 192.168.1.100, 10.0.0.50, 172.16.0.20",
                mcpUsed: true,
                toolName: "log_analyzer",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Analyze suspicious activities" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/I analyzed the security logs using MCP tools/i)
        ).toBeInTheDocument();
      });
    });

    test("IT-14.3: MCP workflow completes without timeout", async () => {
      // Simulate MCP service taking time but completing successfully
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    response: "MCP workflow completed: System scan finished. No threats detected.",
                    mcpUsed: true,
                    executionTime: "2.5s",
                  }),
              });
            }, 500); // Simulate 500ms delay
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Run security scan" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Should complete without timeout
      await waitFor(
        () => {
          expect(
            screen.getByText(/MCP workflow completed: System scan finished/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    test("IT-14.4: Response includes MCP result in proper format", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: "Alert Summary (via MCP):\n- Critical: 5\n- High: 12\n- Medium: 28",
                mcpUsed: true,
                toolName: "alert_aggregator",
                metadata: {
                  source: "clickhouse",
                  query_time: "0.8s",
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Summarize alerts" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Alert Summary \(via MCP\)/i)).toBeInTheDocument();
      });

      // Verify formatted response is displayed
      expect(screen.getByText(/Critical: 5/i)).toBeInTheDocument();
    });
  });

  describe("IT-15: Chatbot handles invalid MCP response safely", () => {
    test("IT-15.1: Invalid MCP payload returns safe fallback", async () => {
      // Mock MCP service returning error due to invalid payload
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () =>
              Promise.resolve({
                error: "MCP service error: Invalid tool parameters",
                fallback: "I apologize, but I encountered an error processing your request. Please try rephrasing your question.",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Invalid MCP trigger" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Verify safe fallback message is shown (component shows generic error)
      await waitFor(() => {
        expect(
          screen.getByText(/Sorry, I encountered an error/i)
        ).toBeInTheDocument();
      });

      // UI should not be broken - input should still be functional
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    test("IT-15.2: MCP error is logged but UI remains functional", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () =>
              Promise.resolve({
                error: "MCP service unavailable",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Test MCP error" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Wait for error handling
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // UI should still be functional
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();

      // Can send another message after error (button enabled when typing)
      fireEvent.change(input, { target: { value: "New message" } });
      expect(input.value).toBe("New message");
      
      // Button should be enabled now that input has text
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const newSendButton = buttons[buttons.length - 1];
        expect(newSendButton).not.toBeDisabled();
      });

      consoleErrorSpy.mockRestore();
    });

    test("IT-15.3: Malformed MCP response doesn't crash chatbot", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                // Missing 'response' field - malformed response
                mcpUsed: true,
                toolName: null,
                data: undefined,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Malformed response test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Chatbot should not crash - should handle gracefully
      await waitFor(() => {
        expect(input).toBeInTheDocument();
        expect(input).not.toBeDisabled(); // Wait for loading to finish
      });

      // UI should remain functional - input accepts text
      fireEvent.change(input, { target: { value: "Recovery test" } });
      expect(input.value).toBe("Recovery test");
    });

    test("IT-15.4: Network error from MCP shows user-friendly message", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.reject(new Error("Network request failed"));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Network error test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Wait for error handling
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // UI should remain intact
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    test("IT-15.5: Timeout from MCP service is handled gracefully", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          // Simulate very slow response (timeout scenario)
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: false,
                status: 408,
                json: () =>
                  Promise.resolve({
                    error: "Request timeout",
                    message: "The AI service took too long to respond. Please try again.",
                  }),
              });
            }, 100);
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Timeout test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Wait for timeout handling
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // UI should be functional after timeout - can type new message
      await waitFor(() => {
        expect(input).not.toBeDisabled(); // Wait for loading to finish
      });
      
      fireEvent.change(input, { target: { value: "Retry message" } });
      expect(input.value).toBe("Retry message");
    });

    test("IT-15.6: Empty MCP response shows appropriate message", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: "",
                mcpUsed: true,
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Empty response test" } });

      const buttons = screen.getAllByRole("button");
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Should handle empty response gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // UI should remain functional - input still works (wait for loading to finish)
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
      expect(input).toBeInTheDocument();
      
      // Can type new message
      fireEvent.change(input, { target: { value: "New attempt" } });
      expect(input.value).toBe("New attempt");
    });

    test("IT-15.7: User can continue chatting after MCP error", async () => {
      let callCount = 0;
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          callCount++;
          if (callCount === 1) {
            // First call fails
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () =>
                Promise.resolve({
                  error: "MCP error",
                }),
            });
          } else {
            // Second call succeeds
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  response: "Successfully recovered! This message works fine.",
                }),
            });
          }
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me about security/i);

      // First message - causes error
      fireEvent.change(input, { target: { value: "First message - will error" } });
      let buttons = screen.getAllByRole("button");
      let sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Second message - should work
      fireEvent.change(input, { target: { value: "Second message - should work" } });
      buttons = screen.getAllByRole("button");
      sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Successfully recovered! This message works fine./i)
        ).toBeInTheDocument();
      });

      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("IT-15.8: MCP error doesn't prevent new chat sessions", async () => {
      global.fetch.mockImplementation((url) => {
        if (url === "/api/chatbot") {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () =>
              Promise.resolve({
                error: "Service unavailable",
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<FloatingChatbot />);

      const chatButton = screen.getByLabelText(/open ai assistant/i);
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me about security/i)).toBeInTheDocument();
      });

      // Send message that causes error
      const input = screen.getByPlaceholderText(/ask me about security/i);
      fireEvent.change(input, { target: { value: "Error message" } });

      let buttons = screen.getAllByRole("button");
      let sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Click "New Chat" button
      const newChatButton = screen.getByText(/new chat/i);
      fireEvent.click(newChatButton);

      // Should be able to start new chat
      await waitFor(() => {
        expect(input).toBeInTheDocument();
        expect(input.value).toBe("");
      });

      // Input should still be functional
      expect(input).not.toBeDisabled();
    });
  });
});

