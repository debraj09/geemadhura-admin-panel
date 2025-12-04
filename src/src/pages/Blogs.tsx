import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Loader, CheckCircle, Image as ImageIcon } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- Interfaces for Type Safety ---

interface Blog {
    id: number;
    publish_date: string; // YYYY-MM-DD
    tags: string;
    banner_image: string; // URL path to the image
    title: string;
    short_description: string;
    full_content: string;
    author: string;
}

// Form state is split into fields that are NOT the file, and the file itself
interface FormState {
    publish_date: string;
    tags: string;
    title: string;
    short_description: string;
    full_content: string;
    author: string;
}

// --- Constants ---
// NOTE: Replace this with your actual API base URL for blogs
const API_BASE_URL = 'https://geemadhura.braventra.in/api/blogs'; // Assuming your base URL is for the Express app

// --- Utility function for date formatting ---
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// --- Main App Component ---

const Blogs: React.FC = () => {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentBlogId, setCurrentBlogId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormState>({
        publish_date: new Date().toISOString().split('T')[0],
        tags: '',
        title: '',
        short_description: '',
        full_content: '',
        author: 'Admin'
    });
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // For displaying the image in edit mode
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

    // 2. READ ALL BLOGS (GET /api/blogs)
    const fetchBlogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                setBlogs(result.data);
            } else {
                setError(result.message || 'Failed to fetch blogs.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Connection failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching blogs.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 1. READ SINGLE BLOG (GET /api/blogs/:id) - Used for editing
    const fetchSingleBlog = useCallback(async (id: number) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                const blogData: Blog = result.data;
                setFormData({
                    publish_date: blogData.publish_date.split('T')[0],
                    tags: blogData.tags,
                    title: blogData.title,
                    short_description: blogData.short_description,
                    full_content: blogData.full_content,
                    author: blogData.author
                });
                setCurrentImageUrl(blogData.banner_image);
                setIsModalOpen(true);
            } else {
                setError(result.message || 'Failed to fetch blog details.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Fetch failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching blog details.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    // Handle input changes for the form
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBannerImageFile(e.target.files[0]);
        } else {
            setBannerImageFile(null);
        }
    };

    // Open the modal for creating a new blog post
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentBlogId(null);
        setCurrentImageUrl(null);
        setBannerImageFile(null);
        setFormData({
            publish_date: new Date().toISOString().split('T')[0],
            tags: '',
            title: '',
            short_description: '',
            full_content: '',
            author: 'Admin'
        });
        setIsModalOpen(true);
    };

    // Open the modal for editing an existing blog post
    const openEditModal = (id: number) => {
        setIsEditMode(true);
        setCurrentBlogId(id);
        // Fetch the full details of the blog post
        fetchSingleBlog(id);
    };

    // Close the modal and reset states
    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setCurrentBlogId(null);
        setCurrentImageUrl(null);
        setBannerImageFile(null);
        setFormData({
            publish_date: new Date().toISOString().split('T')[0],
            tags: '',
            title: '',
            short_description: '',
            full_content: '',
            author: 'Admin'
        });
        setError(null);
    };

    // 3. CREATE or 4. UPDATE logic
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${API_BASE_URL}/${currentBlogId}` : API_BASE_URL;

        // Validation for required fields
        if (!formData.title || !formData.full_content) {
            setError('Title and Full Content are required.');
            setIsSubmitting(false);
            return;
        }

        // Additional validation for CREATE mode: image is required
        if (!isEditMode && !bannerImageFile) {
            setError('Banner Image is required for a new blog post.');
            setIsSubmitting(false);
            return;
        }
        
        // Validation for UPDATE mode: if updating, either the image file must be present OR the existing URL must be present
        if (isEditMode && !bannerImageFile && !currentImageUrl) {
            setError('A banner image is required for the blog post.');
            setIsSubmitting(false);
            return;
        }

        // Create a FormData object for file upload
        const data = new FormData();
        data.append('publish_date', formData.publish_date);
        data.append('tags', formData.tags);
        data.append('title', formData.title);
        data.append('short_description', formData.short_description);
        data.append('full_content', formData.full_content);
        data.append('author', formData.author);

        // Append the file if one is selected
        if (bannerImageFile) {
            data.append('bannerImage', bannerImageFile);
        }

        try {
            const response = await fetch(url, {
                method: method,
                // NOTE: Do NOT set Content-Type header when sending FormData with a file.
                // The browser sets it automatically to 'multipart/form-data' with the correct boundary.
                body: data,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                // If the backend returns an error message, use it.
                throw new Error(result.message || `${method} failed. Status: ${response.status}`);
            }

            showToast(isEditMode ? 'Blog post successfully saved!' : 'New blog post successfully created!');
            closeModal();
            fetchBlogs(); // Refresh the list

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
        if (!window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true); // Show global loading state during delete
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Delete failed.');
            }

            showToast('Blog post successfully deleted!');
            fetchBlogs(); // Refresh the list

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
                    <Loader className="animate-spin mr-2 h-6 w-6" /> Loading blog posts...
                </div>
            );
        }
        if (error && !isModalOpen) { // Only show global error if not in modal
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mx-4">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            );
        }
        if (blogs.length === 0) {
            return (
                <div className="text-center p-8 text-gray-500">
                    No blog posts found. Click 'Create New Blog Post' to start.
                </div>
            );
        }
        return null;
    };

    const renderBlogsList = () => (
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {blogs.map((blog) => (
                        <tr key={blog.id} className="hover:bg-indigo-50 transition duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatDate(blog.publish_date)}
                            </td>
                            <td className="px-6 py-4 max-w-sm truncate text-sm font-medium text-gray-700">
                                {blog.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {blog.author}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {blog.tags}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => openEditModal(blog.id)}
                                    className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100 transition duration-150 mr-2"
                                    title="Edit Blog Post"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(blog.id)}
                                    className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition duration-150"
                                    title="Delete Blog Post"
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
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto transform transition-all p-6">

                    {/* Modal Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
                        <h3 className="text-xl font-semibold text-gray-900" id="modal-title">
                            {isEditMode ? 'Edit Blog Post' : 'Create New Blog Post'}
                        </h3>
                        <button
                            type="button"
                            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150"
                            onClick={closeModal}
                            title="Close"
                            disabled={isSubmitting}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Title Field */}
                            <div className="mb-4 col-span-2">
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    id="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                    placeholder="The Ultimate Guide to Modern React"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Short Description Field */}
                            <div className="mb-4 col-span-2">
                                <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">Short Description (Max 500 chars)</label>
                                <textarea
                                    name="short_description"
                                    id="short_description"
                                    rows={2}
                                    value={formData.short_description}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border resize-none"
                                    placeholder="A brief summary of the blog post for listings."
                                    maxLength={500}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Full Content Field */}
                            <div className="mb-4 col-span-2">
                                <label htmlFor="full_content" className="block text-sm font-medium text-gray-700 mb-1">Full Content <span className="text-red-500">*</span></label>
                                <textarea
                                    name="full_content"
                                    id="full_content"
                                    rows={8}
                                    value={formData.full_content}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border resize-none"
                                    placeholder="The main body of your blog post (supports HTML/Markdown if your renderer handles it)."
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Date Field */}
                            <div className="mb-4">
                                <label htmlFor="publish_date" className="block text-sm font-medium text-gray-700 mb-1">Publish Date</label>
                                <input
                                    type="date"
                                    name="publish_date"
                                    id="publish_date"
                                    value={formData.publish_date}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Author Field */}
                            <div className="mb-4">
                                <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                <input
                                    type="text"
                                    name="author"
                                    id="author"
                                    value={formData.author}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                    placeholder="Admin"
                                    disabled={isSubmitting}
                                />
                            </div>
                            
                            {/* Tags Field */}
                            <div className="mb-4 col-span-2">
                                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (Comma Separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    id="tags"
                                    value={formData.tags}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                    placeholder="react, typescript, tutorial, admin"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>


                        {/* Banner Image Upload Field */}
                        <div className="mb-6 border p-4 rounded-lg bg-gray-50">
                            <label htmlFor="bannerImage" className="block text-sm font-medium text-gray-700 mb-2">
                                Banner Image {isEditMode ? '(Optional to change)' : <span className="text-red-500">*</span>}
                            </label>
                            
                            {/* Current Image Preview (in Edit Mode) */}
                            {currentImageUrl && !bannerImageFile && (
                                <div className="mb-3 relative w-full h-48 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                                    <img 
                                        src={currentImageUrl.startsWith('http') ? currentImageUrl : API_BASE_URL.split('/api')[0] + currentImageUrl} 
                                        alt="Current Banner" 
                                        className="object-cover w-full h-full"
                                    />
                                    <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-bl-lg">Current Image</div>
                                </div>
                            )}

                            {/* New File Preview */}
                            {bannerImageFile && (
                                <div className="mb-3 relative w-full h-48 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                                    <img 
                                        src={URL.createObjectURL(bannerImageFile)} 
                                        alt="New Banner Preview" 
                                        className="object-cover w-full h-full"
                                    />
                                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs p-1 rounded-bl-lg">New Image Preview</div>
                                </div>
                            )}

                            <input
                                type="file"
                                name="bannerImage"
                                id="bannerImage"
                                accept=".jpg,.jpeg,.png,.gif,.webp"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                disabled={isSubmitting}
                            />
                            <p className="mt-1 text-xs text-gray-500">Max size: 2MB. Allowed types: JPEG, PNG, GIF, WebP.</p>
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
                                type="submit"
                                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 sm:text-sm disabled:opacity-50"
                                disabled={isSubmitting}
                                style={{ backgroundColor: '#0B6D8E' }}
                            >
                                {isSubmitting ? (
                                    <Loader className="animate-spin h-5 w-5 mr-2" />
                                ) : isEditMode ? 'Save Changes' : 'Create Post'}
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
                    <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Blog Post Management</h1>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.02] active:scale-95"
                        style={{ backgroundColor: '#0B6D8E' }}
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create New Blog Post
                    </button>
                </header>

                {renderLoadingAndError()}

                {!isLoading && !error && blogs.length > 0 && renderBlogsList()}

                {renderModal()}
            </div>
        </AdminLayout>
    );
};

export default Blogs;