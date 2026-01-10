// src/pages/Signup.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Signup from "./Signup";

// Mock react-router-dom first (before imports)
jest.mock("react-router-dom");
const { mockNavigate } = require("react-router-dom");

// Mock Firebase modules
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
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

const renderSignup = () => {
  return render(<Signup />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// IT-02: Signup creates user account and initial role record
describe("Signup Page + Firebase Auth + Role Storage Integration", () => {
  test("IT-02.1: Signup with valid details", async () => {
    const mockUser = { uid: "newuser123", email: "newuser@example.com" };
    
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockSetDoc.mockResolvedValue(undefined);

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "newuser@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "newuser@example.com",
        "password123"
      );
      expect(mockSetDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          name: "John Doe",
          email: "newuser@example.com",
          role: "viewer",
          status: "Active",
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("IT-02.2: System creates auth user", async () => {
    const mockUser = { uid: "user456", email: "testuser@example.com" };
    
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockSetDoc.mockResolvedValue(undefined);

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "testuser@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "securepass123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
      expect(mockUser.uid).toBe("user456");
    });
  });

  test("IT-02.3: System assigns default role", async () => {
    const mockUser = { uid: "viewer789", email: "viewer@example.com" };
    let capturedUserData;
    
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockSetDoc.mockImplementation((docRef, data) => {
      capturedUserData = data;
      return Promise.resolve();
    });

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "New Viewer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "viewer@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(capturedUserData).toEqual(
        expect.objectContaining({
          role: "viewer",
          status: "Active",
        })
      );
      expect(capturedUserData.role).toBe("viewer");
    });
  });

  test("IT-02.4: User can login afterward", async () => {
    const mockUser = { uid: "login123", email: "canlogin@example.com" };
    
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    mockSetDoc.mockResolvedValue(undefined);

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Login Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "canlogin@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "testpass123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });
});

// Input Validation Tests
describe("Signup Input Validation", () => {
  test("displays error when name is empty", async () => {
    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
    });
  });

  test("displays error when name is too short", async () => {
    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  test("displays error when email is empty", async () => {
    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
    });
  });

  test("displays error when password is empty", async () => {
    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a password/i)).toBeInTheDocument();
    });
  });

  test("displays error when password is too short", async () => {
    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });
});

// Firebase Error Handling Tests
describe("Firebase Signup Error Handling", () => {
  test("handles email already in use error", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/email-already-in-use",
    });

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is already registered/i)).toBeInTheDocument();
    });
  });

  test("handles invalid email error", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-email",
    });

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "invalidemail" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  test("handles weak password error", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/weak-password",
      message: "Password is too weak",
    });

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "weak12" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/password is too weak/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  test("handles network error", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/network-request-failed",
    });

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test("handles too many requests error", async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/too-many-requests",
    });

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});

// Google Sign-In Integration Tests for Signup
describe("Google OAuth Signup Integration", () => {
  test("creates new user profile for first-time Google sign-up", async () => {
    const mockUser = {
      uid: "googleNew123",
      email: "newgoogle@gmail.com",
      displayName: "Google User",
      photoURL: "https://example.com/photo.jpg",
    };
    
    mockSignInWithPopup.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    renderSignup();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          email: "newgoogle@gmail.com",
          name: "Google User",
          role: "viewer",
          status: "Active",
          photoURL: "https://example.com/photo.jpg",
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("does not create duplicate profile for existing Google user", async () => {
    const mockUser = {
      uid: "existingGoogle456",
      email: "existing@gmail.com",
      displayName: "Existing User",
    };
    
    mockSignInWithPopup.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
    });

    renderSignup();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("handles popup closed by user", async () => {
    mockSignInWithPopup.mockRejectedValue({
      code: "auth/popup-closed-by-user",
    });

    renderSignup();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText(/sign-up was cancelled/i)).toBeInTheDocument();
    });
  });

  test("handles popup blocked error", async () => {
    mockSignInWithPopup.mockRejectedValue({
      code: "auth/popup-blocked",
    });

    renderSignup();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText(/pop-up was blocked/i)).toBeInTheDocument();
    });
  });

  test("handles account exists with different credential", async () => {
    mockSignInWithPopup.mockRejectedValue({
      code: "auth/account-exists-with-different-credential",
    });

    renderSignup();
    
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText(/account already exists with this email/i)).toBeInTheDocument();
    });
  });
});

// UI State Tests
describe("UI State Management", () => {
  test("shows loading state during signup", async () => {
    mockCreateUserWithEmailAndPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderSignup();
    
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/signing up.../i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /signing up.../i })).toBeDisabled();
  });

  test("renders login link", () => {
    renderSignup();
    
    expect(screen.getByText(/already have an account\? login/i)).toBeInTheDocument();
  });
});
