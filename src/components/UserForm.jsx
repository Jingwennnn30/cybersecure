import React, { useState, useEffect } from 'react';
import { Card, Title, Button, TextInput, Select, SelectItem } from '@tremor/react';

function UserForm({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    status: 'Active',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="max-w-2xl mx-auto bg-white shadow-lg border border-gray-200">
      <Title className="text-gray-900">{user ? 'Edit User' : 'Add New User'}</Title>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <TextInput
            id="name"
            placeholder="Enter name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="bg-white border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <TextInput
            id="email"
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="bg-white border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <Select
            id="role"
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}
            className="bg-white border-gray-200 text-gray-900"
          >
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Analyst">Analyst</SelectItem>
            <SelectItem value="Viewer">Viewer</SelectItem>
          </Select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <Select
            id="status"
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
            className="bg-white border-gray-200 text-gray-900"
          >
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </Select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="secondary"
            color="gray" 
            onClick={onCancel}
            className="bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            color="amber"
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            {user ? 'Update User' : 'Add User'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default UserForm;