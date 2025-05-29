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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user && user.id) {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        name: formData.name,
        email: formData.email,
        role: formData.role.value,
        status: formData.status.value,
      });
    }
    if (onSubmit) onSubmit(formData);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-lg p-8 bg-white shadow-2xl rounded-2xl border border-gray-100">
        <Title className="text-2xl font-bold text-gray-900 mb-1">{user ? 'Edit User' : 'Add New User'}</Title>
        <p className="text-gray-500 mb-6">Update user information</p>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Name
            </label>
            <TextInput
              id="name"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <TextInput
              id="email"
              type="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500"
            />
          </div>

          {/* Role Dropdown */}
          <div className="relative z-20">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <Listbox
              value={formData.role}
              onChange={role => setFormData({ ...formData, role })}
            >
              <div className="relative">
                <Listbox.Button className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
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
          </div>

          {/* Status Dropdown */}
          <div className="relative z-10">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <Listbox
              value={formData.status}
              onChange={status => setFormData({ ...formData, status })}
            >
              <div className="relative">
                <Listbox.Button className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
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