import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e) => {
        e.preventDefault();
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset email sent!");
            setError("");
        } catch (err) {
            setError(err.message);
            setMessage("");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Forgot Password</h2>
                <form onSubmit={handleReset} className="space-y-4">
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
                    {message && <div className="text-green-600 text-sm">{message}</div>}
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
                    >
                        Send Reset Email
                    </button>
                </form>
                <div className="flex justify-between mt-4 text-sm">
                    <Link to="/login" className="text-blue-600 hover:underline">Back to Login</Link>
                </div>
            </div>
        </div>
    );
}