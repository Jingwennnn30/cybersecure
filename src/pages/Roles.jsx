import React, { useState, useEffect } from 'react';
import {
    Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Button
} from '@tremor/react';
import Navigation from '../components/Navigation';
import UserForm from '../components/UserForm';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useRole } from '../contexts/RoleContext';
import { auth } from '../firebase';

function Roles({ darkMode, setDarkMode }) {
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const role = useRole();

    // For role request modal
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestedRole, setRequestedRole] = useState("analyst");
    const [requestMessage, setRequestMessage] = useState("");

    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                status: "Active" // You can update this if you store status in Firestore
            }));
            setUsers(usersData);
        };
        fetchUsers();
    }, []);

    const handleEditUser = (userData) => {
        // Implement Firestore update logic here if needed
        setEditingUser(null);
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            await deleteDoc(doc(db, "users", userId));
            setUsers(users.filter((user) => user.id !== userId));
        }
    };

    // Handle role request
    const handleRoleRequest = async () => {
        try {
            const currentUser = users.find(u => u.email === auth.currentUser.email);
            await addDoc(collection(db, "roleRequests"), {
                requesterUID: auth.currentUser.uid,
                name: currentUser?.name || "",
                email: currentUser?.email || "",
                currentRole: currentUser?.role || "",
                requestedRole,
                status: "pending",
                timestamp: serverTimestamp()
            });
            setRequestMessage("Your request has been submitted. An administrator will review it soon.");
            setShowRequestModal(false);
        } catch (err) {
            setRequestMessage("Failed to submit request. Please try again.");
        }
    };

    // Sidebar and main content styling
    const sidebarClass = "w-72 bg-white dark:bg-gray-900 p-6 shadow-xl border-r border-gray-200 dark:border-gray-800 fixed h-screen flex flex-col";
    const mainClass = "flex-1 pl-80 p-8 overflow-auto bg-background-light dark:bg-gray-900 transition-colors min-h-screen";

    // Toggle switch (standardized position)
    const Toggle = (
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode(!darkMode)}
                    className="sr-only"
                    aria-label="Toggle dark mode"
                />
                <div className="block w-14 h-8 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors"></div>
                <div
                    className={`dot absolute left-1 top-1 w-6 h-6 rounded-full flex items-center justify-center transition transform
                        ${darkMode ? 'translate-x-6 bg-gray-900 text-yellow-400' : 'bg-white text-gray-700'}
                    `}
                >
                    {darkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 15a5 5 0 100-10 5 5 0 000 10zm0 2a7 7 0 110-14 7 7 0 010 14zm0-16a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm8-8a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zm-16 0a1 1 0 011 1H2a1 1 0 110-2h2a1 1 0 011 1zm12.071 5.071a1 1 0 010 1.415l-1.414 1.414a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm-10.142 0a1 1 0 010 1.415L4.93 17.9a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm10.142-10.142a1 1 0 00-1.415 0L13.9 4.93a1 1 0 101.415 1.415l1.414-1.415a1 1 0 000-1.414zm-10.142 0a1 1 0 00-1.415 0L2.1 4.93A1 1 0 103.515 6.343l1.415-1.415a1 1 0 000-1.414z" />
                        </svg>
                    )}
                </div>
            </div>
            <span className="ml-3 text-base text-gray-700 dark:text-gray-200 font-medium">
                {darkMode ? 'Dark' : 'Light'}
            </span>
        </label>
    );

    // Form view (no add user, but keep edit if you want)
    if (editingUser) {
        return (
            <div className="min-h-screen bg-background-light text-text-default dark:bg-gray-900 dark:text-gray-100 transition-colors">
                <div className="flex min-h-screen">
                    <aside className={sidebarClass}>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-primary tracking-tight">CyberSecure</h1>
                            <div className="border-b border-gray-200 dark:border-gray-700 my-4" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Security Analysis Dashboard</p>
                        </div>
                        <Navigation />
                    </aside>
                    <main className={mainClass}>
                        <div className="flex justify-end mb-6">
                            {Toggle}
                        </div>
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Edit User
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                Update user information
                            </p>
                        </div>
                        <UserForm
                            user={editingUser}
                            onSubmit={handleEditUser}
                            onCancel={() => setEditingUser(null)}
                        />
                    </main>
                </div>
            </div>
        );
    }

    // Main view
    return (
        <div className="min-h-screen bg-background-light text-text-default dark:bg-gray-900 dark:text-gray-100 transition-colors">
            <div className="flex min-h-screen">
                <aside className={sidebarClass}>
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-primary tracking-tight">CyberSecure</h1>
                        <div className="border-b border-gray-200 dark:border-gray-700 my-4" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Security Analysis Dashboard</p>
                    </div>
                    <Navigation />
                </aside>
                <main className={mainClass}>
                    {/* Standardized Toggle Switch Position */}
                    <div className="flex justify-end mb-6">
                        {Toggle}
                    </div>

                    {/* Heading Section - Standardized with Dashboard */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">System Users</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg">Manage users and their permissions</p>
                    </div>

                    {/* Users Table */}
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-xl">
                        <Table className="mt-2">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Name</TableHeaderCell>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Email</TableHeaderCell>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Role</TableHeaderCell>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                                        <TableCell className="text-gray-700 dark:text-gray-200">{user.name}</TableCell>
                                        <TableCell className="text-gray-700 dark:text-gray-200">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                color={
                                                    user.role === 'admin'
                                                        ? 'amber'
                                                        : user.role === 'analyst'
                                                            ? 'yellow'
                                                            : 'gray'
                                                }
                                            >
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {role === "admin" && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900 transition"
                                                        title="Edit"
                                                        onClick={() => setEditingUser(user)}
                                                    >
                                                        <PencilSquareIcon className="w-5 h-5 text-amber-600" />
                                                    </button>
                                                    <button
                                                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition"
                                                        title="Delete"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                    >
                                                        <TrashIcon className="w-5 h-5 text-red-600" />
                                                    </button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Role Permissions */}
                    <Card className="mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-xl">
                        <Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Role Permissions</Title>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <Text className="font-medium mb-2 text-gray-700 dark:text-gray-200">Admin</Text>
                                <div className="flex flex-wrap gap-2">
                                    <Badge color="amber">Full Access</Badge>
                                    <Badge color="amber">User Management</Badge>
                                    <Badge color="amber">System Configuration</Badge>
                                    <Badge color="amber">Alert Management</Badge>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <Text className="font-medium mb-2 text-gray-700 dark:text-gray-200">Analyst</Text>
                                <div className="flex flex-wrap gap-2">
                                    <Badge color="gray">View Alerts</Badge>
                                    <Badge color="gray">Analyze Threats</Badge>
                                    <Badge color="gray">Update Status</Badge>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <Text className="font-medium mb-2 text-gray-700 dark:text-gray-200">Viewer</Text>
                                <div className="flex flex-wrap gap-2">
                                    <Badge color="gray">View Alerts</Badge>
                                    <Badge color="gray">View Reports</Badge>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Request Role Section for Non-Admins */}
                    {role !== "admin" && (
                        <div className="mt-12 flex justify-center">
                            <div className="bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-600 rounded-xl shadow-lg px-8 py-6 max-w-xl w-full text-center">
                                <div className="flex flex-col items-center mb-3">
                                    <svg className="w-8 h-8 text-amber-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 0v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                                    </svg>
                                    <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300 mb-1">Request Role Change</h3>
                                </div>
                                <span className="text-gray-700 dark:text-gray-200 block mb-4">
                                    Would you like to request a role change? Select your desired role and submit your request. An administrator will review it.
                                </span>
                                <button
                                    className="mt-2 px-4 py-2 bg-yellow-500 text-blue font-semibold rounded hover:bg-amber-600 transition"
                                    onClick={() => setShowRequestModal(true)}
                                >
                                    Request Role Change
                                </button>
                                {requestMessage && <div className="mt-3 text-green-600">{requestMessage}</div>}
                                {showRequestModal && (
                                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-xs">
                                            <h3 className="text-lg font-semibold mb-4">Request a Role Change</h3>
                                            <select
                                                className="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-gray-100"
                                                value={requestedRole}
                                                onChange={e => setRequestedRole(e.target.value)}
                                            >
                                                <option value="analyst">Analyst</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded"
                                                    onClick={() => setShowRequestModal(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="px-3 py-1 bg-yellow-500 text-white rounded"
                                                    onClick={handleRoleRequest}
                                                >
                                                    Submit
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Roles;