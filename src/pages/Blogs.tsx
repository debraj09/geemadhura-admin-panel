import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, X, Pencil, Trash2, Loader2, CheckCircle, ArrowLeft, Search, RotateCcw } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// Import Jodit Editor
import { Jodit } from 'jodit';
import JoditEditor from 'jodit-react';
import { InsertMode } from 'jodit/types';

// --- Jodit Rich Text Editor Component ---
interface JoditEditorWrapperProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    height?: number;
    className?: string;
}

const JoditEditorWrapper: React.FC<JoditEditorWrapperProps> = ({ 
    value, 
    onChange, 
    placeholder = "Start typing...",
    height = 300,
    className = ""
}) => {
    const editor = useRef<any>(null);
    
    const config = useMemo(() => ({
        readonly: false,
        placeholder: placeholder || 'Start typing...',
        height: height,
        toolbarAdaptive: false,
        toolbarSticky: true,
        showCharsCounter: true,
        showWordsCounter: true,
        showXPathInStatusbar: false,
        buttons: [
            'source',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'ul',
            'ol',
            '|',
            'font',
            'fontsize',
            'brush',
            '|',
            'align',
            '|',
            'link',
            'image',
            '|',
            'undo',
            'redo',
            '|',
            'preview',
            'print'
        ],
        buttonsXS: [
            'bold',
            'italic',
            'underline',
            '|',
            'ul',
            'ol',
            '|',
            'undo',
            'redo'
        ],
        defaultActionOnPaste: 'html' as InsertMode,
        editHTMLDocumentMode: false,
        enter: 'br' as 'br' | 'div' | 'p',
        useSearch: false,
        spellcheck: true,
        language: 'en',
        toolbarButtonSize: 'middle' as const,
        theme: 'default',
        controls: {
            font: {
                list: {
                    '': 'Default',
                    'Arial, Helvetica, sans-serif': 'Arial',
                    'Georgia, serif': 'Georgia',
                    'Impact, Charcoal, sans-serif': 'Impact',
                    'Tahoma, Geneva, sans-serif': 'Tahoma',
                    'Times New Roman, Times, serif': 'Times New Roman',
                    'Verdana, Geneva, sans-serif': 'Verdana',
                    'Courier New, Courier, monospace': 'Courier New'
                }
            },
            fontSize: {
                list: ['8', '9', '10', '11', '12', '14', '16', '18', '24', '30', '36', '48', '60', '72', '96']
            }
        }
    }), [placeholder, height]);

    return (
        <div className={className}>
            <JoditEditor
                ref={editor}
                value={value}
                config={config}
                onChange={onChange}
                onBlur={newContent => onChange(newContent)}
            />
            <div className="text-xs text-gray-500 mt-2">
                Characters: {value.replace(/<[^>]*>/g, '').length} | 
                Words: {value.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length}
            </div>
        </div>
    );
};

// --- Interfaces for Type Safety ---
interface Blog {
    id: number;
    publish_date: string;
    tags: string;
    banner_image: string;
    title: string;
    short_description: string;
    full_content: string;
    author: string;
    is_published: boolean;
    created_at: string;
}

// Form state is split into fields that are NOT the file, and the file itself
interface FormState {
    publish_date: string;
    tags: string;
    title: string;
    short_description: string;
    full_content: string;
    author: string;
    is_published: boolean;
}

// --- Constants ---
const BASE_URL = 'https://geemadhura.braventra.in';
const API_BASE_URL = `${BASE_URL}/api/blogs`;

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
    const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentBlogId, setCurrentBlogId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    const [formData, setFormData] = useState<FormState>({
        publish_date: new Date().toISOString().split('T')[0],
        tags: '',
        title: '',
        short_description: '',
        full_content: '',
        author: 'Admin',
        is_published: true
    });
    
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
                setFilteredBlogs(result.data);
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

    // Filter blogs based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredBlogs(blogs);
            return;
        }

        const filtered = blogs.filter(blog =>
            blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blog.tags.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blog.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blog.id.toString().includes(searchTerm)
        );
        setFilteredBlogs(filtered);
    }, [searchTerm, blogs]);

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
                    author: blogData.author,
                    is_published: Boolean(blogData.is_published)
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
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: value 
        }));
        
        // Clear error when user starts typing
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handle editor change
    const handleEditorChange = (field: 'full_content' | 'short_description') => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));

        // Clear error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                setFormErrors(prev => ({ ...prev, bannerImage: 'File size must be less than 2MB' }));
                return;
            }
            
            setBannerImageFile(file);
            
            // Clear error when valid file is selected
            if (formErrors.bannerImage) {
                setFormErrors(prev => ({ ...prev, bannerImage: '' }));
            }
        } else {
            setBannerImageFile(null);
        }
    };

    // Handle toggle change
    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            is_published: e.target.checked,
        }));
    };

    // Open the modal for creating a new blog post
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentBlogId(null);
        setCurrentImageUrl(null);
        setBannerImageFile(null);
        setFormErrors({});
        setFormData({
            publish_date: new Date().toISOString().split('T')[0],
            tags: '',
            title: '',
            short_description: '',
            full_content: '',
            author: 'Admin',
            is_published: true
        });
        setIsModalOpen(true);
    };

    // Open the modal for editing an existing blog post
    const openEditModal = (id: number) => {
        setIsEditMode(true);
        setCurrentBlogId(id);
        setFormErrors({});
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
        setFormErrors({});
        setFormData({
            publish_date: new Date().toISOString().split('T')[0],
            tags: '',
            title: '',
            short_description: '',
            full_content: '',
            author: 'Admin',
            is_published: true
        });
        setError(null);
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        const plainTextContent = formData.full_content.replace(/<[^>]*>/g, '').trim();
        if (!plainTextContent) {
            newErrors.full_content = 'Full content is required';
        }

        // Additional validation for CREATE mode: image is required
        if (!isEditMode && !bannerImageFile) {
            newErrors.bannerImage = 'Banner Image is required for a new blog post';
        }
        
        // Validation for UPDATE mode: if updating, either the image file must be present OR the existing URL must be present
        if (isEditMode && !bannerImageFile && !currentImageUrl) {
            newErrors.bannerImage = 'A banner image is required for the blog post';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 3. CREATE or 4. UPDATE logic
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            alert('Please fix the form errors before submitting.');
            return;
        }
        
        setIsSubmitting(true);
        setFormErrors({});

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${API_BASE_URL}/${currentBlogId}` : API_BASE_URL;

        // Create a FormData object for file upload
        const data = new FormData();
        data.append('title', formData.title);
        data.append('short_description', formData.short_description);
        data.append('full_content', formData.full_content);
        data.append('publish_date', formData.publish_date);
        data.append('tags', formData.tags);
        data.append('author', formData.author);
        data.append('is_published', formData.is_published.toString());

        // Append the file if one is selected
        if (bannerImageFile) {
            data.append('bannerImage', bannerImageFile);
        }

        try {
            const response = await fetch(url, {
                method: method,
                body: data,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
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

    // Toggle publish status
    const handleTogglePublishStatus = async (id: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`${API_BASE_URL}/toggle-publish/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setBlogs(prevBlogs => prevBlogs.map(blog =>
                    blog.id === id ? { ...blog, is_published: !currentStatus } : blog
                ));
                showToast(`Blog post ${currentStatus ? 'unpublished' : 'published'} successfully!`);
            } else {
                throw new Error(result.message || 'Failed to toggle status.');
            }

        } catch (err) {
            console.error('Toggle status error:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred during status update.'}`);
            fetchBlogs();
        }
    };

    const renderLoadingAndError = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8 text-blue-600">
                    <Loader2 className="animate-spin mr-2 h-6 w-6" /> Loading blog posts...
                </div>
            );
        }
        if (error && !isModalOpen) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mx-4">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            );
        }
        if (filteredBlogs.length === 0 && searchTerm) {
            return (
                <div className="text-center p-8 text-gray-500">
                    No blog posts found matching "{searchTerm}". Try a different search term.
                </div>
            );
        }
        if (filteredBlogs.length === 0) {
            return (
                <div className="text-center p-8 text-gray-500">
                    No blog posts found. Click 'Create New Blog Post' to start.
                </div>
            );
        }
        return null;
    };

    const renderBlogsList = () => (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredBlogs.map((blog) => (
                            <tr key={blog.id} className="hover:bg-gray-50 transition duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {blog.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatDate(blog.publish_date)}
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <div className="text-sm font-medium text-gray-700">{blog.title}</div>
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {blog.short_description || 'No description'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {blog.author}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-wrap gap-1">
                                        {blog.tags.split(',').map((tag, index) => (
                                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${blog.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {blog.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => handleTogglePublishStatus(blog.id, blog.is_published)}
                                        title={blog.is_published ? "Unpublish" : "Publish"}
                                        className={`p-1 rounded-full transition duration-150 ${blog.is_published ? 'text-green-600 hover:bg-green-100' : 'text-yellow-600 hover:bg-yellow-100'}`}
                                    >
                                        {blog.is_published ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                                            </svg>
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={() => openEditModal(blog.id)}
                                        className="p-1 rounded-full text-blue-600 hover:bg-blue-100 transition duration-150"
                                        title="Edit Blog Post"
                                    >
                                        <Pencil className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(blog.id)}
                                        className="p-1 rounded-full text-red-600 hover:bg-red-100 transition duration-150"
                                        title="Delete Blog Post"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Footer/Pagination Placeholder */}
            <div className="p-4 border-t border-gray-200 text-sm text-gray-600 flex justify-between items-center">
                <span>Showing {filteredBlogs.length} of {blogs.length} blog posts</span>
            </div>
        </div>
    );

    const renderModal = () => (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isModalOpen ? 'block' : 'hidden'}`} aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

            {/* Modal panel */}
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-auto transform transition-all p-6">

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

                        <div className="space-y-6">
                            {/* Title Field */}
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    id="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="The Ultimate Guide to Modern React"
                                    required
                                    disabled={isSubmitting}
                                />
                                {formErrors.title && (
                                    <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                                )}
                            </div>

                            {/* Short Description Field */}
                            <div>
                                <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Short Description (Max 500 chars)
                                </label>
                                <textarea
                                    name="short_description"
                                    id="short_description"
                                    rows={3}
                                    value={formData.short_description}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none"
                                    placeholder="A brief summary of the blog post for listings."
                                    maxLength={500}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Full Content Field with Jodit Editor */}
                            <div>
                                <label htmlFor="full_content" className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Content <span className="text-red-500">*</span>
                                </label>
                                <div className={`${formErrors.full_content ? 'border border-red-500 rounded-lg' : ''}`}>
                                    <JoditEditorWrapper
                                        value={formData.full_content}
                                        onChange={handleEditorChange('full_content')}
                                        placeholder="Write your blog post content here..."
                                        height={400}
                                    />
                                </div>
                                {formErrors.full_content && (
                                    <p className="mt-1 text-sm text-red-600">{formErrors.full_content}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Date Field */}
                                <div>
                                    <label htmlFor="publish_date" className="block text-sm font-medium text-gray-700 mb-1">Publish Date</label>
                                    <input
                                        type="date"
                                        name="publish_date"
                                        id="publish_date"
                                        value={formData.publish_date}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Author Field */}
                                <div>
                                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                    <input
                                        type="text"
                                        name="author"
                                        id="author"
                                        value={formData.author}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                        placeholder="Admin"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                
                                {/* Publish Status */}
                                <div>
                                    <label htmlFor="is_published" className="block text-sm font-medium text-gray-700 mb-1">Publish Status</label>
                                    <div className="flex items-center mt-2">
                                        <input
                                            type="checkbox"
                                            id="is_published"
                                            name="is_published"
                                            checked={formData.is_published}
                                            onChange={handleToggleChange}
                                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            disabled={isSubmitting}
                                        />
                                        <span className={`ml-3 text-sm font-medium ${formData.is_published ? 'text-green-600' : 'text-gray-600'}`}>
                                            {formData.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tags Field */}
                            <div>
                                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (Comma Separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    id="tags"
                                    value={formData.tags}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                    placeholder="react, typescript, tutorial, admin"
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
                            </div>

                            {/* Banner Image Upload Field */}
                            <div>
                                <label htmlFor="bannerImage" className="block text-sm font-medium text-gray-700 mb-2">
                                    Banner Image {isEditMode ? '(Optional to change)' : <span className="text-red-500">*</span>}
                                </label>
                                
                                {/* Current Image Preview (in Edit Mode) */}
                                {currentImageUrl && !bannerImageFile && (
                                    <div className="mb-3 relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                                        <img 
                                            src={currentImageUrl.startsWith('http') ? currentImageUrl : `${BASE_URL}${currentImageUrl}`} 
                                            alt="Current Banner" 
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-bl-lg">Current Image</div>
                                    </div>
                                )}

                                {/* New File Preview */}
                                {bannerImageFile && (
                                    <div className="mb-3 relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                                        <img 
                                            src={URL.createObjectURL(bannerImageFile)} 
                                            alt="New Banner Preview" 
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs p-1 rounded-bl-lg">New Image Preview</div>
                                    </div>
                                )}

                                <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 ${formErrors.bannerImage ? 'border-red-500' : ''}`}>
                                    <input
                                        type="file"
                                        name="bannerImage"
                                        id="bannerImage"
                                        accept=".jpg,.jpeg,.png,.gif,.webp"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        disabled={isSubmitting}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Max size: 2MB. Allowed types: JPEG, PNG, GIF, WebP.</p>
                                </div>
                                {formErrors.bannerImage && (
                                    <p className="mt-1 text-sm text-red-600">{formErrors.bannerImage}</p>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 sm:text-sm"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 sm:text-sm disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    ) : isEditMode ? (
                                        <>
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Save Changes
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-5 w-5 mr-2" />
                                            Create Post
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">

                {/* Success Toast Notification */}
                <div
                    aria-live="assertive"
                    className={`fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50 ${toastVisible ? '' : 'hidden'}`}
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

                {/* Header and Action Buttons */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Blog Management</h1>
                        <p className="text-gray-600 mt-1">Create, edit, and manage your blog posts</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search blogs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                            />
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={fetchBlogs}
                            className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={isLoading}
                        >
                            <RotateCcw size={18} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                        </button>

                        {/* Create Button */}
                        <button
                            onClick={openCreateModal}
                            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                        >
                            <Plus size={18} className="mr-1" />
                            New Blog Post
                        </button>
                    </div>
                </div>

                {renderLoadingAndError()}

                {!isLoading && !error && filteredBlogs.length > 0 && renderBlogsList()}

                {renderModal()}
            </div>
        </AdminLayout>
    );
};

export default Blogs;