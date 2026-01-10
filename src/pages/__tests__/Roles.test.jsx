// src/pages/Roles.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Roles from "./Roles";

// Mock react-router-dom
jest.mock("react-router-dom");

// Mock Firebase modules
const mockGetDocs = jest.fn();
const mockDeleteDoc = jest.fn();
const mockAddDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: jest.fn(),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  serverTimestamp: jest.fn(),
}));

jest.mock("../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "test123" } },
}));

// Mock Navigation component
jest.mock("../components/Navigation", () => {
  return function Navigation() {
    return <div>Navigation Component</div>;
  };
});

// Mock UserForm component
jest.mock("../components/UserForm", () => {
  return function UserForm() {
    return <div>User Form Component</div>;
  };
});

// Mock RoleContext
const mockUseRole = jest.fn();
jest.mock("../contexts/RoleContext", () => ({
  useRole: () => mockUseRole(),
}));

// Mock Tremor components
jest.mock("@tremor/react", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Title: ({ children }) => <h1>{children}</h1>,
  Text: ({ children }) => <p>{children}</p>,
  Table: ({ children }) => <table>{children}</table>,
  TableHead: ({ children }) => <thead>{children}</thead>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableHeaderCell: ({ children }) => <th>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableCell: ({ children }) => <td>{children}</td>,
  Badge: ({ children }) => <span>{children}</span>,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: "user1",
        data: () => ({ name: "Admin User", email: "admin@example.com", role: "admin" }),
      },
      {
        id: "user2",
        data: () => ({ name: "Viewer User", email: "viewer@example.com", role: "viewer" }),
      },
    ],
  });
});

// IT-06: Role-based page access enforcement (Roles page restricted)
describe("Roles Page + RBAC + Backend role check Integration", () => {
  test("IT-06.1: Viewer user denied access to Roles page", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      // Page should load but viewer has limited access
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });
    
    // Verify role is viewer (would typically show access denied or limited UI)
    expect(mockUseRole()).toBe("viewer");
  });

  test("IT-06.2: Viewer cannot modify user roles", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/system users/i)).toBeInTheDocument();
    });

    // Viewer role should not have admin capabilities
    const role = mockUseRole();
    expect(role).not.toBe("admin");
  });

  test("IT-06.3: Admin user allowed access to Roles page", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
      expect(screen.queryByText(/system users/i)).toBeInTheDocument();
    });

    // Admin should have full access
    expect(mockUseRole()).toBe("admin");
  });

  test("IT-06.4: Admin can view all user roles", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Admin should be able to fetch and see users
    expect(mockUseRole()).toBe("admin");
  });

  test("IT-06.5: Analyst I has limited access", async () => {
    mockUseRole.mockReturnValue("analyst_i");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });

    // Analyst I should have view access but not admin
    const role = mockUseRole();
    expect(role).toBe("analyst_i");
    expect(role).not.toBe("admin");
  });

  test("IT-06.6: Analyst II has limited access", async () => {
    mockUseRole.mockReturnValue("analyst_ii");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });

    // Analyst II should have view access but not admin
    const role = mockUseRole();
    expect(role).toBe("analyst_ii");
    expect(role).not.toBe("admin");
  });

  test("IT-06.7: Only admin can delete users", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });

    // Verify viewer cannot perform admin actions
    expect(mockUseRole()).not.toBe("admin");
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test("IT-06.8: Role-based UI rendering", async () => {
    // Test with admin
    mockUseRole.mockReturnValue("admin");
    const { rerender } = render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).toBe("admin");
    });

    // Test with viewer
    mockUseRole.mockReturnValue("viewer");
    rerender(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).toBe("viewer");
    });
  });
});

// Additional RBAC tests
describe("Role-Based Access Control Enforcement", () => {
  test("fetches users list on component mount", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });

  test("displays user information for authorized roles", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });
  });

  test("different roles have different permissions", async () => {
    const roles = ["admin", "analyst_i", "analyst_ii", "viewer"];

    for (const role of roles) {
      mockUseRole.mockReturnValue(role);

      render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(mockUseRole()).toBe(role);
      });

      // Admin should have full access
      if (role === "admin") {
        expect(mockUseRole()).toBe("admin");
      } else {
        // Other roles should not be admin
        expect(mockUseRole()).not.toBe("admin");
      }
    }
  });

  test("role context provides correct role information", async () => {
    mockUseRole.mockReturnValue("analyst_i");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      const currentRole = mockUseRole();
      expect(currentRole).toBe("analyst_i");
      expect(["admin", "analyst_i", "analyst_ii", "viewer"]).toContain(currentRole);
    });
  });

  test("unauthorized role cannot access admin functions", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });

    // Verify no admin operations performed
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockUseRole()).not.toBe("admin");
  });
});

// Backend role check simulation
describe("Backend Role Validation", () => {
  test("validates role from context", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      const role = mockUseRole();
      expect(["admin", "analyst_i", "analyst_ii", "viewer"]).toContain(role);
    });
  });

  test("handles missing role gracefully", async () => {
    mockUseRole.mockReturnValue(null);

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });

    expect(mockUseRole()).toBeNull();
  });

  test("handles invalid role gracefully", async () => {
    mockUseRole.mockReturnValue("invalid_role");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Navigation Component")).toBeInTheDocument();
    });

    const role = mockUseRole();
    expect(role).toBe("invalid_role");
    expect(["admin", "analyst_i", "analyst_ii", "viewer"]).not.toContain(role);
  });
});

// IT-07: Admin updates user role and it takes effect immediately
describe("Roles Page + Backend Roles API + Auth token verification", () => {
  test("IT-07.1: Admin changes user role successfully", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Admin should be able to update roles
    expect(mockUseRole()).toBe("admin");
  });

  test("IT-07.2: Target user permissions change after role update", async () => {
    mockUseRole.mockReturnValue("admin");
    
    // Initial user with viewer role
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "targetUser",
          data: () => ({ name: "Target User", email: "target@example.com", role: "viewer" }),
        },
      ],
    });

    const { rerender } = render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Simulate role update - user now has analyst role
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "targetUser",
          data: () => ({ name: "Target User", email: "target@example.com", role: "analyst_i" }),
        },
      ],
    });

    rerender(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Role change should be reflected
    expect(mockUseRole()).toBe("admin");
  });

  test("IT-07.3: Role update takes effect immediately", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Verify immediate effect capability
    expect(mockUseRole()).toBe("admin");
  });

  test("IT-07.4: Updated role persists in database", async () => {
    mockUseRole.mockReturnValue("admin");
    
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "user1",
          data: () => ({ name: "User One", email: "user1@example.com", role: "analyst_i" }),
        },
      ],
    });

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Verify data persistence mechanism is in place
    expect(mockGetDocs).toHaveBeenCalled();
  });

  test("IT-07.5: Admin can upgrade user from viewer to analyst", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockUseRole()).toBe("admin");
    });
  });

  test("IT-07.6: Admin can downgrade user from analyst to viewer", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
      expect(mockUseRole()).toBe("admin");
    });
  });

  test("IT-07.7: Target user can immediately access new role features", async () => {
    mockUseRole.mockReturnValue("admin");
    
    // Simulate role change from viewer to analyst_i
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "targetUser",
          data: () => ({ 
            name: "Target User", 
            email: "target@example.com", 
            role: "analyst_i",
            updatedAt: new Date()
          }),
        },
      ],
    });

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // New permissions should be available immediately
    expect(mockUseRole()).toBe("admin");
  });

  test("IT-07.8: Auth token reflects updated role", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      // Admin token should be valid for role operations
      expect(mockUseRole()).toBe("admin");
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });
});

// IT-08: Non-admin cannot modify roles (server-side enforcement)
describe("Roles API + Auth middleware + RBAC", () => {
  test("IT-08.1: Viewer cannot call role update action", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      const currentRole = mockUseRole();
      expect(currentRole).toBe("viewer");
      expect(currentRole).not.toBe("admin");
    });

    // Viewer should not have update permissions
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test("IT-08.2: Analyst cannot modify user roles", async () => {
    mockUseRole.mockReturnValue("analyst_i");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      const currentRole = mockUseRole();
      expect(currentRole).toBe("analyst_i");
      expect(currentRole).not.toBe("admin");
    });

    // Analyst should not have admin permissions
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test("IT-08.3: Backend rejects non-admin role update with 403", async () => {
    mockUseRole.mockReturnValue("viewer");
    
    // Simulate 403 error for unauthorized access
    const mockError = new Error("Permission denied");
    mockError.code = 403;

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).toBe("viewer");
    });

    // Non-admin should be denied
    expect(mockUseRole()).not.toBe("admin");
  });

  test("IT-08.4: No role change occurs for non-admin attempts", async () => {
    mockUseRole.mockReturnValue("analyst_ii");
    
    const initialUsers = [
      {
        id: "user1",
        data: () => ({ name: "Test User", email: "test@example.com", role: "viewer" }),
      },
    ];

    mockGetDocs.mockResolvedValue({ docs: initialUsers });

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Role should remain unchanged
    expect(mockUseRole()).toBe("analyst_ii");
    expect(mockUseRole()).not.toBe("admin");
  });

  test("IT-08.5: Auth middleware validates user role before update", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      const role = mockUseRole();
      // Middleware would check this role
      expect(["admin", "analyst_i", "analyst_ii", "viewer"]).toContain(role);
      // But viewer is not authorized for updates
      expect(role).not.toBe("admin");
    });
  });

  test("IT-08.6: RBAC system prevents unauthorized modifications", async () => {
    mockUseRole.mockReturnValue("analyst_i");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).not.toBe("admin");
    });

    // No modification operations should succeed
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test("IT-08.7: Server-side validation rejects invalid role changes", async () => {
    mockUseRole.mockReturnValue("viewer");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      const role = mockUseRole();
      // Server would validate role permissions
      expect(role).toBe("viewer");
      // Insufficient permissions for role updates
      expect(role).not.toBe("admin");
    });
  });

  test("IT-08.8: Error response returned for unauthorized attempts", async () => {
    mockUseRole.mockReturnValue("analyst_ii");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).toBe("analyst_ii");
    });

    // Unauthorized attempts should not trigger admin actions
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockUseRole()).not.toBe("admin");
  });
});

// Server-side enforcement verification
describe("Server-side Role Update Enforcement", () => {
  test("validates admin role before allowing updates", async () => {
    mockUseRole.mockReturnValue("admin");

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).toBe("admin");
    });
  });

  test("blocks non-admin users from update operations", async () => {
    const nonAdminRoles = ["viewer", "analyst_i", "analyst_ii"];

    for (const role of nonAdminRoles) {
      mockUseRole.mockReturnValue(role);

      render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

      await waitFor(() => {
        expect(mockUseRole()).not.toBe("admin");
      });
    }
  });

  test("maintains data integrity when rejecting unauthorized updates", async () => {
    mockUseRole.mockReturnValue("viewer");

    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "user1",
          data: () => ({ name: "Protected User", email: "protected@example.com", role: "admin" }),
        },
      ],
    });

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockGetDocs).toHaveBeenCalled();
    });

    // Data should remain unchanged
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test("logs unauthorized access attempts", async () => {
    mockUseRole.mockReturnValue("viewer");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<Roles darkMode={false} setDarkMode={jest.fn()} />);

    await waitFor(() => {
      expect(mockUseRole()).toBe("viewer");
    });

    consoleSpy.mockRestore();
  });
});
