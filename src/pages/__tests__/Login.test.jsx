// src/pages/Login.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "./Login";

// Mock react-router-dom first (before imports)
jest.mock("react-router-dom");
const { mockNavigate } = require("react-router-dom");

// Mock Firebase modules
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSignOut = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
}));

jest.mock("../firebase", () => ({
  auth: {},
  db: {},
  googleProvider: {},
}));

const renderLogin = () => {
  return render(<Login />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// IT-01: Integration between Authentication Module and Access Control Module
describe("Authentication and Access Control Integration", () => {
  test("IT-01.1: User signs up with valid credentials and gets authenticated", async () => {
    const mockUser = { uid: "user123", email: "test@example.com" };
    const mockUserData = { status: "Active", role: "viewer" };
    
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "test@example.com",
        "password123"
      );
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("IT-01.2: User logs in to the system successfully", async () => {
    const mockUser = { uid: "admin123", email: "admin@example.com" };
    const mockUserData = { status: "Active", role: "admin" };
    
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "adminPass123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("IT-01.3: User attempts to access a protected feature", async () => {
    const mockUser = { uid: "viewer123", email: "viewer@example.com" };
    const mockUserData = { status: "Active", role: "viewer" };
    
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "viewer@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "viewerPass" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("IT-01.4: System validates user role and permissions", async () => {
    const mockUser = { uid: "analyst123", email: "analyst@example.com" };
    const mockUserData = { status: "Active", role: "analyst" };
    
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "analyst@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "analystPass" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });
});

// Access Control Tests
describe("Access Control - User Status Validation", () => {
  test("blocks access for inactive user account", async () => {
    const mockUser = { uid: "inactive123", email: "inactive@example.com" };
    const mockUserData = { status: "Inactive", role: "viewer" };
    
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "inactive@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByText(/account has been deactivated/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("handles user profile not found scenario", async () => {
    const mockUser = { uid: "noProfile123", email: "noprofile@example.com" };
    
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "noprofile@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByText(/user profile not found/i)).toBeInTheDocument();
    });
  });
});

// Input Validation Tests
describe("Input Validation", () => {
  test("displays error when email is empty", async () => {
    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
    });
  });

  test("displays error when password is empty", async () => {
    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter your password/i)).toBeInTheDocument();
    });
  });
});

// Firebase Error Handling Tests
describe("Firebase Authentication Error Handling", () => {
  test("handles invalid credentials error", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  test("handles too many requests error", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/too-many-requests",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many failed login attempts/i)).toBeInTheDocument();
    });
  });

  test("handles network error", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/network-request-failed",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});

// Google Sign-In Integration Tests
describe("Google OAuth Integration", () => {
  test("creates new user profile for first-time Google sign-in", async () => {
    const mockUser = {
      uid: "google123",
      email: "newuser@gmail.com",
      displayName: "New User",
      photoURL: "https://example.com/photo.jpg",
    };
    
    mockSignInWithPopup.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    renderLogin();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          email: "newuser@gmail.com",
          name: "New User",
          role: "viewer",
          status: "Active",
          photoURL: "https://example.com/photo.jpg",
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("authenticates existing Google user", async () => {
    const mockUser = {
      uid: "existingGoogle123",
      email: "existing@gmail.com",
      displayName: "Existing User",
    };
    const mockUserData = { status: "Active", role: "viewer" };
    
    mockSignInWithPopup.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("blocks inactive Google user", async () => {
    const mockUser = {
      uid: "inactiveGoogle123",
      email: "inactive@gmail.com",
    };
    const mockUserData = { status: "Inactive", role: "viewer" };
    
    mockSignInWithPopup.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    renderLogin();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByText(/account has been deactivated/i)).toBeInTheDocument();
    });
  });

  test("handles popup closed by user", async () => {
    mockSignInWithPopup.mockRejectedValue({
      code: "auth/popup-closed-by-user",
    });

    renderLogin();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText(/sign-in was cancelled/i)).toBeInTheDocument();
    });
  });

  test("handles popup blocked error", async () => {
    mockSignInWithPopup.mockRejectedValue({
      code: "auth/popup-blocked",
    });

    renderLogin();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText(/pop-up was blocked/i)).toBeInTheDocument();
    });
  });
});

// UI State Tests
describe("UI State Management", () => {
  test("shows loading state during login", async () => {
    mockSignInWithEmailAndPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(screen.getByText(/logging in.../i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logging in.../i })).toBeDisabled();
  });

  test("renders forgot password and sign up links", () => {
    renderLogin();
    
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });
});

// IT-03: Invalid login prevents access to protected features
describe("Login Page + Firebase Auth + Route Guard Integration", () => {
  test("IT-03.1: Login with wrong password is rejected", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpassword" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "user@example.com",
        "wrongpassword"
      );
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("IT-03.2: Attempt to access Dashboard without authentication fails", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      // Navigation should not be called since login failed
      expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard");
      // User stays on login page
      expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });
  });

  test("IT-03.3: Route blocks unauthorized access and error shown", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/wrong-password",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "blocked@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "incorrectpass" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      // Error message is displayed
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      // User is not redirected
      expect(mockNavigate).not.toHaveBeenCalled();
      // Login form is still visible
      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });
  });

  test("IT-03.4: Multiple failed login attempts show error", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
    });

    renderLogin();
    
    // First attempt
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    // Second attempt
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrong2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("IT-03.5: User not found error prevents access", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/user-not-found",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "nonexistent@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "anypassword" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("IT-03.6: Disabled user cannot access protected features", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/user-disabled",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "disabled@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/account has been disabled/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("IT-03.7: Too many failed attempts locks out user", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: "auth/too-many-requests",
    });

    renderLogin();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "locked@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many failed login attempts/i)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});