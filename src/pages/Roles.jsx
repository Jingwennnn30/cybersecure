import React, { useState } from 'react';
import {
    Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Button
} from '@tremor/react';
import Navigation from '../components/Navigation';
import UserForm from '../components/UserForm';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

const initialUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Analyst', status: 'Active' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Viewer', status: 'Inactive' },
];

function Roles({ darkMode, setDarkMode }) {
    const [users, setUsers] = useState(initialUsers);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const handleAddUser = (userData) => {
        const newUser = { ...userData, id: users.length + 1 };
        setUsers([...users, newUser]);
        setShowForm(false);
    };

    const handleEditUser = (userData) => {
        if (editingUser) {
            const updatedUsers = users.map((user) =>
                user.id === editingUser.id ? { ...userData, id: user.id } : user
            );
            setUsers(updatedUsers);
            setEditingUser(null);
        }
    };

    const handleDeleteUser = (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(users.filter((user) => user.id !== userId));
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

    // Form view
    if (showForm || editingUser) {
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
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                {editingUser ? 'Update user information' : 'Create a new user account'}
                            </p>
                        </div>
                        <UserForm
                            user={editingUser || undefined}
                            onSubmit={editingUser ? handleEditUser : handleAddUser}
                            onCancel={() => {
                                setShowForm(false);
                                setEditingUser(null);
                            }}
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

                    {/* Add User Button */}
                    <div className="flex justify-end mb-6">
                        <Button size="sm" color="amber" onClick={() => setShowForm(true)}>
                            + Add User
                        </Button>
                    </div>

                    {/* Users Table */}
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-xl">
                        <Table className="mt-2">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Name</TableHeaderCell>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Email</TableHeaderCell>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Role</TableHeaderCell>
                                    <TableHeaderCell className="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Status</TableHeaderCell>
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
                                                    user.role === 'Admin'
                                                        ? 'amber'
                                                        : user.role === 'Analyst'
                                                            ? 'yellow'
                                                            : 'gray'
                                                }
                                            >
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge color={user.status === 'Active' ? 'green' : 'gray'}>
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
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
                </main>
            </div>
        </div>
    );
}

export default Roles;