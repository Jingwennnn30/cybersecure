import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        
        // Input validation
        if (!email || email.trim() === '') {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }
        
        if (!password || password.trim() === '') {
            setError('Please enter your password');
            setLoading(false);
            return;
        }
        
        try {
            // 1. Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Fetch user profile from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await signOut(auth);
                setError("User profile not found. Please contact support.");
                setLoading(false);
                return;
            }

            const userData = userDoc.data();
            if (userData.status === "Inactive") {
                await signOut(auth);
                setError("Your account has been deactivated. Please contact the administrator.");
                setLoading(false);
                return;
            }

            // 3. Otherwise, allow login
            navigate("/");
        } catch (err) {
            console.error('Login error:', err);
            
            // User-friendly error messages based on Firebase error codes
            let userFriendlyMessage = '';
            
            switch (err.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
                    break;
                case 'auth/invalid-email':
                    userFriendlyMessage = 'Invalid email format. Please enter a valid email address.';
                    break;
                case 'auth/user-disabled':
                    userFriendlyMessage = 'This account has been disabled. Please contact support for assistance.';
                    break;
                case 'auth/too-many-requests':
                    userFriendlyMessage = 'Too many failed login attempts. Please try again later or reset your password.';
                    break;
                case 'auth/network-request-failed':
                    userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
                    break;
                case 'auth/operation-not-allowed':
                    userFriendlyMessage = 'Email/password sign-in is disabled. Please contact support.';
                    break;
                case 'auth/popup-closed-by-user':
                    userFriendlyMessage = 'Sign-in was cancelled. Please try again.';
                    break;
                default:
                    userFriendlyMessage = err.message || 'Login failed. Please try again.';
            }
            
            setError(userFriendlyMessage);
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In Handler
    const handleGoogleSignIn = async () => {
        setError("");
        setLoading(true);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists()) {
                // New user - create document with default 'viewer' role and 'Active' status
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    name: user.displayName || "User",
                    role: "viewer",
                    status: "Active",
                    createdAt: new Date(),
                    photoURL: user.photoURL || ""
                });
            } else {
                // Existing user - check if active
                const userData = userDoc.data();
                if (userData.status === "Inactive") {
                    await signOut(auth);
                    setError("Your account has been deactivated. Please contact the administrator.");
                    setLoading(false);
                    return;
                }
            }

            navigate("/");
        } catch (err) {
            console.error('Google sign-in error:', err);
            
            let userFriendlyMessage = '';
            
            switch (err.code) {
                case 'auth/popup-closed-by-user':
                    userFriendlyMessage = 'Sign-in was cancelled. Please try again.';
                    break;
                case 'auth/popup-blocked':
                    userFriendlyMessage = 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
                    break;
                case 'auth/cancelled-popup-request':
                    userFriendlyMessage = 'Only one sign-in popup is allowed at a time.';
                    break;
                case 'auth/account-exists-with-different-credential':
                    userFriendlyMessage = 'An account already exists with this email using a different sign-in method.';
                    break;
                case 'auth/network-request-failed':
                    userFriendlyMessage = 'Network error. Please check your connection and try again.';
                    break;
                default:
                    userFriendlyMessage = err.message || 'Google sign-in failed. Please try again.';
            }
            
            setError(userFriendlyMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            {/* Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/images/cs2.jpg')" }}
            >
                {/* Semi-transparent Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            </div>
            
            {/* Login Form */}
            <div className="relative z-10 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Sign In</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 mb-1">Email</label>
                        <input
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email"
                            type="email"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 mb-1">Password</label>
                        <input
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            type="password"
                            placeholder="Password"
                            required
                        />
                    </div>
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded transition"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {/* Divider */}
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="mt-4 w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 transition"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {loading ? "Signing in..." : "Sign in with Google"}
                    </button>
                </div>

                <div className="flex justify-between mt-4 text-sm">
                    <Link to="/forgot" className="text-blue-600 hover:underline">Forgot password?</Link>
                    <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
                </div>
            </div>
        </div>
    );
}