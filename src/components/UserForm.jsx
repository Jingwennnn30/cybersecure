import React, { useState, useEffect, Fragment } from 'react';
import { Card, Title, Button, TextInput } from '@tremor/react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Listbox, Transition } from '@headlessui/react';

const roles = [
  { value: 'admin', label: 'Admin', color: 'bg-amber-100 text-amber-800 border-amber-400' },
  { value: 'analyst', label: 'Analyst', color: 'bg-blue-100 text-blue-800 border-blue-400' },
  { value: 'viewer', label: 'Viewer', color: 'bg-gray-100 text-gray-800 border-gray-400' },
];

const statuses = [
  { value: 'Active', label: 'Active', color: 'bg-green-100 text-green-800 border-green-400' },
  { value: 'Inactive', label: 'Inactive', color: 'bg-red-100 text-red-800 border-red-400' },
];

function UserForm({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: roles[2], // default to viewer
    status: statuses[0], // default to Active
  });
  
  const [errors, setErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: roles.find(r => r.value === user.role) || roles[2],
        status: statuses.find(s => s.value === user.status) || statuses[0],
      });
    }
  }, [user]);
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate Name
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Name cannot be empty';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    // Validate Email
    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'Email cannot be empty';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address (e.g., user@example.com)';
      }
    }
    
    // Validate Role
    if (!formData.role || !formData.role.value) {
      newErrors.role = 'Please select a role';
    }
    
    // Validate Status
    if (!formData.status || !formData.status.value) {
      newErrors.status = 'Please select a status';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveMessage('');
    setErrors({});
    
    console.log('🔍 Validating User Form:', formData);
    
    // Validate form
    if (!validateForm()) {
      console.log('❌ Validation failed:', errors);
      setSaveMessage('❌ Please fix the errors below before submitting');
      return;
    }
    
    console.log('✅ Validation passed, saving user...');
    
    try {
      if (user && user.id) {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role.value,
          status: formData.status.value,
        });
        console.log('✅ User updated successfully');
        setSaveMessage('✅ User updated successfully!');
      }
      if (onSubmit) {
        setTimeout(() => {
          onSubmit(formData);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error saving user:', error);
      setSaveMessage('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-lg p-8 bg-white shadow-2xl rounded-2xl border border-gray-100">
        <Title className="text-2xl font-bold text-gray-900 mb-1">{user ? 'Edit User' : 'Add New User'}</Title>
        <p className="text-gray-500 mb-6">Update user information</p>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Save Message */}
          {saveMessage && (
            <div className={`p-3 rounded-lg border ${
              saveMessage.includes('❌') 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {saveMessage.includes('❌') ? (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{saveMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <TextInput
              id="name"
              placeholder="Enter full name (2-50 characters)"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              error={!!errors.name}
              errorMessage={errors.name}
              className="w-full border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <TextInput
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              error={!!errors.email}
              errorMessage={errors.email}
              className="w-full border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Role Dropdown */}
          <div className="relative z-20">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <Listbox
              value={formData.role}
              onChange={role => {
                setFormData({ ...formData, role });
                if (errors.role) setErrors({ ...errors, role: null });
              }}
            >
              <div className="relative">
                <Listbox.Button className={`w-full cursor-pointer rounded-lg border ${errors.role ? 'border-red-500' : 'border-gray-300'} bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500`}>
                  <span className={`inline-block px-2 py-1 rounded border ${formData.role.color}`}>
                    {formData.role.label}
                  </span>
                </Listbox.Button>
                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    {roles.map((role) => (
                      <Listbox.Option
                        key={role.value}
                        value={role}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-10 pr-4 rounded-lg 
                          ${active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate font-medium`}>
                              <span className={`inline-block px-2 py-1 rounded border ${role.color} ${selected ? '' : 'bg-white border-gray-200 text-gray-900'}`}>
                                {role.label}
                              </span>
                            </span>
                            {selected ? (
                              <span className="absolute left-2 top-2 text-amber-600">&#10003;</span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative z-10">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <Listbox
              value={formData.status}
              onChange={status => {
                setFormData({ ...formData, status });
                if (errors.status) setErrors({ ...errors, status: null });
              }}
            >
              <div className="relative">
                <Listbox.Button className={`w-full cursor-pointer rounded-lg border ${errors.status ? 'border-red-500' : 'border-gray-300'} bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500`}>
                  <span className={`inline-block px-2 py-1 rounded border ${formData.status.color}`}>
                    {formData.status.label}
                  </span>
                </Listbox.Button>
                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    {statuses.map((status) => (
                      <Listbox.Option
                        key={status.value}
                        value={status}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-10 pr-4 rounded-lg 
                          ${active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate font-medium`}>
                              <span className={`inline-block px-2 py-1 rounded border ${status.color} ${selected ? '' : 'bg-white border-gray-200 text-gray-900'}`}>
                                {status.label}
                              </span>
                            </span>
                            {selected ? (
                              <span className="absolute left-2 top-2 text-amber-600">&#10003;</span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              color="gray"
              onClick={onCancel}
              className="bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 rounded-lg px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="amber"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg px-5"
            >
              {user ? 'Update User' : 'Add User'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default UserForm;