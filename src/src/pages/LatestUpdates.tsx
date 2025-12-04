import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Loader, CheckCircle } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- Interfaces for Type Safety ---

interface Update {
    id: number;
    update_date: string; // Stored as YYYY-MM-DD string
    title: string;
    description: string;
}

interface FormState {
    title: string;
    description: string;
    update_date: string;
}

// --- Constants ---
// NOTE: Replace this with your actual API base URL
const API_BASE_URL = 'https://geemadhura.braventra.in/api/latestUpdates';

// --- Utility function for date formatting ---
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// --- Main App Component ---

const LatestUpdates: React.FC = () => {
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentUpdate, setCurrentUpdate] = useState<Update | null>(null);
    const [formData, setFormData] = useState<FormState>({ title: '', description: '', update_date: new Date().toISOString().split('T')[0] });
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState<boolean>(false);

    // Function to show a success toast message
    const showToast = (message: string) => {
        setSuccessMessage(message);
        setToastVisible(true);
        setTimeout(() => {
            setToastVisible(false);
            setSuccessMessage(null);
        }, 3000);
    };

    // 2. READ ALL Updates (GET /api/latestUpdates)
    const fetchUpdates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                setUpdates(result.data);
            } else {
                setError(result.message || 'Failed to fetch updates.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Connection failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching updates.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUpdates();
    }, [fetchUpdates]);

    // Handle input changes for the form
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Open the modal for creating a new update
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentUpdate(null);
        setFormData({ title: '', description: '', update_date: new Date().toISOString().split('T')[0] });
        setIsModalOpen(true);
    };

    // Open the modal for editing an existing update
    const openEditModal = (update: Update) => {
        setIsEditMode(true);
        setCurrentUpdate(update);
        setFormData({
            title: update.title,
            description: update.description,
            // Ensure date is in YYYY-MM-DD format for input value
            update_date: update.update_date.split('T')[0]
        });
        setIsModalOpen(true);
    };

    // Close the modal and reset states
    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setCurrentUpdate(null);
        setFormData({ title: '', description: '', update_date: new Date().toISOString().split('T')[0] });
    };

    // 1. CREATE or 4. UPDATE logic
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${API_BASE_URL}/${currentUpdate?.id}` : API_BASE_URL;

        // Validation
        if (!formData.title || !formData.description || !formData.update_date) {
            setError('All fields are required.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || `${method} failed.`);
            }

            showToast(isEditMode ? 'Update successfully saved!' : 'New update successfully created!');
            closeModal();
            fetchUpdates(); // Refresh the list

        } catch (err) {
            if (err instanceof Error) {
                setError(`Operation failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during submission.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // 5. DELETE logic
    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this update?')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Delete failed.');
            }

            showToast('Update successfully deleted!');
            fetchUpdates(); // Refresh the list

        } catch (err) {
            if (err instanceof Error) {
                setError(`Deletion failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during deletion.');
            }
            setIsLoading(false); // Stop loading if delete failed
        }
    };


    // --- Render Functions ---

    const renderLoadingAndError = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8 text-indigo-600">
                    <Loader className="animate-spin mr-2 h-6 w-6" /> Loading updates...
                </div>
            );
        }
        if (error) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mx-4">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            );
        }
        if (updates.length === 0) {
            return (
                <div className="text-center p-8 text-gray-500">
                    No latest updates found. Click 'Add New Update' to start.
                </div>
            );
        }
        return null;
    };

    const renderUpdatesList = () => (
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {updates.map((update) => (
                        <tr key={update.id} className="hover:bg-indigo-50 transition duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatDate(update.update_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                {update.title}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {update.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => openEditModal(update)}
                                    className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100 transition duration-150 mr-2"
                                    title="Edit Update"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(update.id)}
                                    className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition duration-150"
                                    title="Delete Update"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderModal = () => (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isModalOpen ? 'block' : 'hidden'}`} aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

            {/* Modal panel */}
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto transform transition-all p-6">

                    {/* Modal Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
                        <h3 className="text-xl font-semibold text-gray-900" id="modal-title">
                            {isEditMode ? 'Edit Latest Update' : 'Create New Update'}
                        </h3>
                        <button
                            type="button"
                            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150"
                            onClick={closeModal}
                            title="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Modal Body / Form */}
                    <form onSubmit={handleCreateOrUpdate}>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Title Field */}
                        <div className="mb-4">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                name="title"
                                id="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                placeholder="e.g., New Feature Released: Project Dashboards"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Description Field */}
                        <div className="mb-4">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                id="description"
                                rows={4}
                                value={formData.description}
                                onChange={handleInputChange}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border resize-none"
                                placeholder="Describe the update in detail."
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Date Field */}
                        <div className="mb-6">
                            <label htmlFor="update_date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                name="update_date"
                                id="update_date"
                                value={formData.update_date}
                                onChange={handleInputChange}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 sm:text-sm"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                style={{ backgroundColor: '#0B6D8E' }}
                                
                                type="submit"
                                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 sm:text-sm disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader className="animate-spin h-5 w-5 mr-2" />
                                ) : isEditMode ? 'Save Changes' : 'Create Update'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">

                {/* Success Toast Notification */}
                <div
                    aria-live="assertive"
                    className={`fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start ${toastVisible ? '' : 'hidden'}`}
                >
                    <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                        <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <CheckCircle className="h-6 w-6 text-green-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3 w-0 flex-1 pt-0.5">
                                        <p className="text-sm font-medium text-gray-900">
                                            Success!
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {successMessage}
                                        </p>
                                    </div>
                                    <div className="ml-4 flex-shrink-0 flex">
                                        <button
                                            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500"
                                            onClick={() => setToastVisible(false)}
                                        >
                                            <span className="sr-only">Close</span>
                                            <X className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Latest Updated News</h1>
                    <button
                        style={{ backgroundColor: '#0B6D8E' }}

                        onClick={openCreateModal}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.02] active:scale-95"
                    >
                        Add New Update
                    </button>
                </header>

                {renderLoadingAndError()}

                {!isLoading && !error && updates.length > 0 && renderUpdatesList()}

                {renderModal()}
            </div>
        </AdminLayout>
    );
};

export default LatestUpdates;