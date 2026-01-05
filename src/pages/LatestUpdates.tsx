import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Loader, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- Interfaces for Type Safety ---
interface Update {
    id: number;
    update_date: string;
    title: string;
    description: string;
    image_url: string | null;
}

interface FormState {
    title: string;
    description: string;
    update_date: string;
    image_url: string | null;
    image_file: File | null;
}

// --- Constants ---
const LATEST_UPDATES_API = 'https://geemadhura.braventra.in/api/latestUpdates';
const UPLOAD_API = 'https://geemadhura.braventra.in/api/upload/upload';

// Utility function for date formatting
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Main App Component
const LatestUpdates: React.FC = () => {
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentUpdate, setCurrentUpdate] = useState<Update | null>(null);
    const [formData, setFormData] = useState<FormState>({ 
        title: '', 
        description: '', 
        update_date: new Date().toISOString().split('T')[0],
        image_url: null,
        image_file: null 
    });
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
            const response = await fetch(LATEST_UPDATES_API);
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

    // Handle image file selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB');
                return;
            }
            
            setFormData({ 
                ...formData, 
                image_file: file,
                image_url: URL.createObjectURL(file) // Create preview URL
            });
            setError(null);
        }
    };

    // Remove selected image
    const removeImage = () => {
        setFormData({ 
            ...formData, 
            image_file: null,
            image_url: null 
        });
    };

    // Function to upload image to your server
   // Function to upload image to your server
// Function to upload image to your server
const uploadImage = async (file: File): Promise<string | null> => {
    console.log('=== STARTING UPLOAD ===');
    console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    try {
        // First, test if the endpoint is reachable
        const testResponse = await fetch('/api/upload/test');
        console.log('Test endpoint status:', testResponse.status);
        const testResult = await testResponse.json();
        console.log('Test endpoint result:', testResult);
        
        const formData = new FormData();
        formData.append('image', file);
        
        console.log('Sending upload request to /api/upload/upload');
        
        const uploadResponse = await fetch('/api/upload/upload', {
            method: 'POST',
            body: formData,
            // Note: Don't set Content-Type header for FormData
        });
        
        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response headers:', uploadResponse.headers);
        
        // Get response as text first to see what's being returned
        const responseText = await uploadResponse.text();
        console.log('Raw response text:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Parsed JSON result:', result);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Response text that failed to parse:', responseText);
            throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
        }
        
        if (!uploadResponse.ok || !result.success) {
            console.error('Upload failed with result:', result);
            throw new Error(result.message || `Upload failed with status ${uploadResponse.status}`);
        }
        
        if (result.imageUrl) {
            let fullUrl = result.imageUrl;
            // Make sure we have the full URL
            if (fullUrl.startsWith('/')) {
                fullUrl = `https://geemadhura.braventra.in${fullUrl}`;
            }
            console.log('Upload successful! URL:', fullUrl);
            return fullUrl;
        } else {
            console.error('No imageUrl in response:', result);
            throw new Error('Server response missing imageUrl');
        }
        
    } catch (error) {
        console.error('=== UPLOAD ERROR DETAILS ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Re-throw with more context
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error. Check if server is running.');
        } else if (error instanceof Error) {
            throw new Error(`Upload failed: ${error.message}`);
        } else {
            throw new Error('Unknown upload error occurred');
        }
    }
};

    // Open the modal for creating a new update
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentUpdate(null);
        setFormData({ 
            title: '', 
            description: '', 
            update_date: new Date().toISOString().split('T')[0],
            image_url: null,
            image_file: null 
        });
        setIsModalOpen(true);
    };

    // Open the modal for editing an existing update
    const openEditModal = (update: Update) => {
        setIsEditMode(true);
        setCurrentUpdate(update);
        setFormData({
            title: update.title,
            description: update.description,
            update_date: update.update_date.split('T')[0],
            image_url: update.image_url,
            image_file: null
        });
        setIsModalOpen(true);
    };

    // Close the modal and reset states
    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setCurrentUpdate(null);
        setFormData({ 
            title: '', 
            description: '', 
            update_date: new Date().toISOString().split('T')[0],
            image_url: null,
            image_file: null 
        });
        setError(null);
    };

    // 1. CREATE or 4. UPDATE logic with image upload
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${LATEST_UPDATES_API}/${currentUpdate?.id}` : LATEST_UPDATES_API;

        // Validation
        if (!formData.title || !formData.description || !formData.update_date) {
            setError('Title, description, and date are required.');
            setIsSubmitting(false);
            return;
        }

        try {
            let imageUrl = formData.image_url;
            
            // Upload new image if a file was selected
            if (formData.image_file) {
                const uploadedUrl = await uploadImage(formData.image_file);
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                } else {
                    throw new Error('Failed to upload image');
                }
            }

            // Prepare data for API
            const apiData = {
                title: formData.title,
                description: formData.description,
                update_date: formData.update_date,
                image_url: imageUrl
            };

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiData),
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
            const response = await fetch(`${LATEST_UPDATES_API}/${id}`, {
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
            setIsLoading(false);
        }
    };

    // Render Functions
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
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
                            <td className="px-6 py-4 whitespace-nowrap">
                                {update.image_url ? (
                                    <div className="flex items-center">
                                        <ImageIcon className="h-4 w-4 text-gray-400 mr-2" />
                                        <img 
                                            src={update.image_url} 
                                            alt={update.title}
                                            className="h-10 w-10 object-cover rounded-md"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://via.placeholder.com/100x100?text=No+Image';
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-gray-400 text-sm">No image</span>
                                )}
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
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto transform transition-all p-6">

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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column - Text Fields */}
                            <div>
                                {/* Title Field */}
                                <div className="mb-4">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
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
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                    <textarea
                                        name="description"
                                        id="description"
                                        rows={6}
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border resize-none"
                                        placeholder="Describe the update in detail."
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Date Field */}
                                <div className="mb-4">
                                    <label htmlFor="update_date" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
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
                            </div>

                            {/* Right Column - Image Upload */}
                            <div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Update Image (Optional)</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                                        <div className="space-y-1 text-center">
                                            {formData.image_url || formData.image_file ? (
                                                <div className="relative">
                                                    <img
                                                        src={formData.image_url || URL.createObjectURL(formData.image_file!)}
                                                        alt="Preview"
                                                        className="mx-auto h-48 w-full object-cover rounded-md"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={removeImage}
                                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600">
                                                        <label
                                                            htmlFor="image-upload"
                                                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                                        >
                                                            <span>Upload a file</span>
                                                            <input
                                                                id="image-upload"
                                                                name="image-upload"
                                                                type="file"
                                                                accept="image/*"
                                                                className="sr-only"
                                                                onChange={handleImageChange}
                                                                disabled={isSubmitting}
                                                            />
                                                        </label>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        PNG, JPG, GIF up to 5MB
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Image Preview for Existing Images in Edit Mode */}
                                {isEditMode && currentUpdate?.image_url && !formData.image_file && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Image</label>
                                        <div className="relative">
                                            <img
                                                src={currentUpdate.image_url}
                                                alt="Current"
                                                className="h-48 w-full object-cover rounded-md"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, image_url: null})}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Click the X to remove this image</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
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
                        <Plus className="h-4 w-4 mr-2" />
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