import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from "@/components/layout/AdminLayout";
import { Star, Loader2, PlusCircle, Trash2, Edit2, X, AlertTriangle } from 'lucide-react';

// --- API Configuration ---
// Base URL for the admin testimonial routes
const BASE_URL = 'https://geemadhura.braventra.in/api/testimonials/admin';

// --- Placeholder for AdminLayout (Since we must be a single file) ---
const AdminLayoutPlaceholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">

        <main className="max-w-7xl mx-auto">{children}</main>
    </div>
);

// --- TypeScript Interfaces ---
interface TestimonialData {
    id: number; // ID is number in MySQL
    comment: string;
    review_stars: number;
    client_name: string;
    client_position: string | null;
    client_company: string | null;
    image_url: string | null; // This is the public path returned by Multer/Server
    is_active: boolean;
    display_order: number | null;
}


// --- Form Component ---

interface TestimonialFormProps {
    initialData: TestimonialData | null;
    onClose: () => void;
    onSuccess: () => void;
}

const TestimonialForm: React.FC<TestimonialFormProps> = ({ initialData, onClose, onSuccess }) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState<Omit<TestimonialData, 'id'>>({
        comment: initialData?.comment || '',
        review_stars: initialData?.review_stars || 5,
        client_name: initialData?.client_name || '',
        client_position: initialData?.client_position || '',
        client_company: initialData?.client_company || '',
        image_url: initialData?.image_url || null,
        is_active: initialData?.is_active ?? true,
        display_order: initialData?.display_order || null,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [keepExistingImage, setKeepExistingImage] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: (e.target as HTMLInputElement).checked,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? null : Number(value),
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        if (file) {
            // If a new file is uploaded, we assume the user wants to replace the image
            setKeepExistingImage(true);
        }
    };

    const handleKeepImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKeepExistingImage(e.target.checked);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isEdit ? `${BASE_URL}/update/${initialData!.id}` : `${BASE_URL}/create`;
            const method = isEdit ? 'PUT' : 'POST';

            // 1. Prepare FormData for file upload
            const formDataPayload = new FormData();

            // Append all text fields
            formDataPayload.append('comment', formData.comment);
            formDataPayload.append('review_stars', String(formData.review_stars || 5));
            formDataPayload.append('client_name', formData.client_name);
            formDataPayload.append('client_position', formData.client_position || '');
            formDataPayload.append('client_company', formData.client_company || '');
            formDataPayload.append('is_active', String(formData.is_active));
            formDataPayload.append('display_order', String(formData.display_order || ''));

            // Append file or related flags
            if (imageFile) {
                // Backend expects 'imageUpload'
                formDataPayload.append('imageUpload', imageFile);
            }
            if (isEdit) {
                // Flag for backend to decide what to do with existing image if no new file is uploaded
                formDataPayload.append('keep_existing_image', String(keepExistingImage));
            }

            // 2. Fetch Request
            const response = await fetch(endpoint, {
                method: method,
                // Do NOT set Content-Type header when using FormData, 
                // the browser sets it correctly with the boundary
                body: formDataPayload,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }

            onSuccess();
            onClose();

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error('API Error:', message);
            setError(`Failed to ${isEdit ? 'update' : 'create'} testimonial: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-xl font-semibold text-gray-800">{isEdit ? 'Edit Testimonial' : 'Create New Testimonial'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">Client Name <span className="text-red-500">*</span></span>
                            <input
                                type="text"
                                name="client_name"
                                value={formData.client_name}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">Position</span>
                            <input
                                type="text"
                                name="client_position"
                                value={formData.client_position || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"
                            />
                        </label>
                        <label className="block col-span-2">
                            <span className="text-sm font-medium text-gray-700">Company</span>
                            <input
                                type="text"
                                name="client_company"
                                value={formData.client_company || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Comment <span className="text-red-500">*</span></span>
                        <textarea
                            name="comment"
                            rows={4}
                            value={formData.comment}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2 resize-none"
                        ></textarea>
                    </label>

                    {/* Image Upload Section */}
                    <div className="border p-4 rounded-lg space-y-3">
                        <p className="text-sm font-medium text-gray-700 border-b pb-2">Image Upload</p>
                        <label className="block">
                            <span className="text-sm font-medium text-gray-600">Upload New Image (Max 1MB)</span>
                            <input
                                type="file"
                                name="imageUpload"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileChange}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </label>

                        {isEdit && initialData.image_url && (
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="keep_existing_image"
                                    checked={keepExistingImage && !imageFile}
                                    onChange={handleKeepImageChange}
                                    disabled={!!imageFile}
                                    className="rounded text-indigo-600 shadow-sm focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Keep Existing Image ({initialData.image_url.split('/').pop()})</span>
                            </label>
                        )}

                        {isEdit && initialData.image_url && !keepExistingImage && !imageFile && (
                            <div className="p-2 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded text-xs">
                                Current image will be removed upon save.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">Stars (1-5)</span>
                            <input
                                type="number"
                                name="review_stars"
                                value={formData.review_stars}
                                onChange={handleNumberChange}
                                min="1"
                                max="5"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">Display Order</span>
                            <input
                                type="number"
                                name="display_order"
                                value={formData.display_order || ''}
                                onChange={handleNumberChange}
                                min="1"
                                placeholder="Auto"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"
                            />
                        </label>
                        <label className="flex items-center space-x-2 mt-6">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="rounded text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                            />
                            <span className="text-sm font-medium text-gray-700">Active</span>
                        </label>
                    </div>


                    {error && (
                        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center space-x-2">
                            <AlertTriangle size={16} />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            style={{ backgroundColor: '#0B6D8E' }}
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-400 flex items-center space-x-2 shadow-md"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            <span>{isEdit ? 'Save Changes' : 'Create Testimonial'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Confirmation Modal Component (Replaces window.confirm) ---
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Confirm Action</h3>
                <p className="text-gray-600 text-sm">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---

const Testimonial: React.FC = () => {
    const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState<TestimonialData | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [testimonialToDelete, setTestimonialToDelete] = useState<number | null>(null);

    // Data Fetching (HTTP GET)
    const fetchTestimonials = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(BASE_URL);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            // Assuming the backend returns an object { data: TestimonialData[] }
            setTestimonials(result.data || []);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("API Fetch Error:", message);
            setError(`Failed to load testimonials: ${message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTestimonials();
    }, [fetchTestimonials]);

    // Delete Handlers
    const startDelete = (id: number) => {
        setTestimonialToDelete(id);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (testimonialToDelete === null) return;

        setIsDeleteConfirmOpen(false);
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BASE_URL}/delete/${testimonialToDelete}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }

            // Refetch data after successful deletion
            await fetchTestimonials();

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Delete Error:", message);
            setError(`Failed to delete testimonial: ${message}`);
        } finally {
            setLoading(false);
            setTestimonialToDelete(null);
        }
    };

    const cancelDelete = () => {
        setIsDeleteConfirmOpen(false);
        setTestimonialToDelete(null);
    };

    // Form Handlers
    const openCreateForm = () => {
        setEditingTestimonial(null);
        setIsFormOpen(true);
    };

    const openEditForm = (testimonial: TestimonialData) => {
        setEditingTestimonial(testimonial);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingTestimonial(null);
    };

    const handleSuccess = () => {
        fetchTestimonials(); // Refresh data grid after create/update
    }


    if (error) {
        return (
            <AdminLayoutPlaceholder>
                <div className="p-6 bg-red-50 border border-red-400 rounded-xl text-red-700">
                    <h3 className="font-semibold text-lg">Application Error</h3>
                    <p>{error}</p>
                    <p className="mt-2 text-sm text-red-600">Please ensure your backend API is running and accessible at {BASE_URL}.</p>
                </div>
            </AdminLayoutPlaceholder>
        );
    }

    if (loading && testimonials.length === 0) {
        return (
            <AdminLayoutPlaceholder>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="ml-3 text-lg text-gray-600">Loading Testimonials...</p>
                </div>
            </AdminLayoutPlaceholder>
        );
    }

    // Use the simplified placeholder since AdminLayout is not defined in this file.
    return (
        <AdminLayoutPlaceholder>
            <AdminLayout>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Testimonials Management</h2>
                    <button
                        style={{ backgroundColor: '#0B6D8E' }}
                        onClick={openCreateForm}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-md"
                    >
                        <span>Add New Testimonial</span>
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Info</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review & Comment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {testimonials.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-gray-500">
                                        No testimonials found. Click "Add New Testimonial" to get started.
                                    </td>
                                </tr>
                            ) : (
                                testimonials.map((t) => (
                                    <tr key={t.id} className={!t.is_active ? 'bg-gray-50 opacity-70' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {t.display_order || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{t.client_name}</div>
                                            <div className="text-xs text-gray-500">{t.client_position} at {t.client_company || 'N/A'}</div>
                                            {t.image_url && (
                                                <img
                                                    src={`https://geemadhura.braventra.in${t.image_url}`} alt={`${t.client_name} avatar`}
                                                    className="w-10 h-10 rounded-full mt-2 object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).onerror = null;
                                                        // Placeholder image using the first letter of the client's name
                                                        (e.target as HTMLImageElement).src = `https://placehold.co/50x50/cccccc/ffffff?text=${t.client_name.charAt(0)}`;
                                                    }}
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 max-w-lg">
                                            <div className="flex items-center space-x-1 mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} fill={i < t.review_stars ? '#FBBF24' : '#E5E7EB'} strokeWidth={0} className="text-yellow-400" />
                                                ))}
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2">{t.comment}</p>
                                            <p className="text-xs text-gray-400 mt-1 truncate">Image Path: {t.image_url || 'None'}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {t.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => openEditForm(t)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50 transition"
                                                aria-label="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => startDelete(t.id)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition"
                                                aria-label="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {(isFormOpen) && (
                    <TestimonialForm
                        initialData={editingTestimonial}
                        onClose={closeForm}
                        onSuccess={handleSuccess}
                    />
                )}

                <ConfirmationModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={cancelDelete}
                    onConfirm={confirmDelete}
                    message={`Are you sure you want to permanently delete testimonial ID ${testimonialToDelete}? This action cannot be undone.`}
                />
            </AdminLayout>
        </AdminLayoutPlaceholder>
    );
};

export default Testimonial;