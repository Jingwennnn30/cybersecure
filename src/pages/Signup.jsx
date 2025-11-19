import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Add user to Firestore with name, email, and default role "viewer"
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name,
                email,
                role: "viewer",
                status: "Active",
                createdAt: new Date()
            });
            navigate("/dashboard");
        } catch (err) {
            setError(err.message);
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
                // New user - create document with default 'viewer' role
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    name: user.displayName || "User",
                    role: "viewer",
                    status: "Active",
                    createdAt: new Date(),
                    photoURL: user.photoURL || ""
                });
            }

            navigate("/dashboard");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            {/* Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/images/cs.jpeg')" }}
            >
                {/* Semi-transparent Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            </div>
            
            {/* Signup Form */}
            <div className="relative z-10 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Sign Up</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 mb-1">Name</label>
                        <input
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Name"
                            type="text"
                            required
                        />
                    </div>
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
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded transition"
                    >
                        {loading ? "Signing up..." : "Sign Up"}
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

                <div className="mt-4 text-sm text-center">
                    <Link to="/login" className="text-blue-600 hover:underline">Already have an account? Login</Link>
                </div>
            </div>
        </div>
    );
}