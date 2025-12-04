import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Loader, CheckCircle, Image as ImageIcon, Search, Download, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- Interfaces for Type Safety ---
interface Course {
    id: number;
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
}

interface FormState {
    title: string;
    description: string;
}

interface PaginationInfo {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
}

// --- Constants ---
const API_BASE_URL = 'https://geemadhura.braventra.in/api/courses';
const BASE_URL = 'https://geemadhura.braventra.in';
const ITEMS_PER_PAGE = 5; // Maximum 5 items per page

// --- Main Component ---
const Courses: React.FC = () => {
    // State Management
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentCourseId, setCurrentCourseId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState<boolean>(false);
    const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Pagination State
    const [pagination, setPagination] = useState<PaginationInfo>({
        total: 0,
        per_page: ITEMS_PER_PAGE,
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0
    });

    // Form States
    const [formData, setFormData] = useState<FormState>({
        title: '',
        description: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

    // Toast Function
    const showToast = (message: string) => {
        setSuccessMessage(message);
        setToastVisible(true);
        setTimeout(() => {
            setToastVisible(false);
            setSuccessMessage(null);
        }, 3000);
    };

    // Helper function to get full URL
    const getFullUrl = (url: string | null): string => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return BASE_URL + url;
        return BASE_URL + '/' + url;
    };

    // Fetch Courses with Pagination
    const fetchCourses = useCallback(async (page: number = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', ITEMS_PER_PAGE.toString());
            
            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const url = `${API_BASE_URL}?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.status === 200) {
                // Assuming your API returns paginated data
                // Adjust based on your actual API response structure
                if (result.data && Array.isArray(result.data)) {
                    setCourses(result.data);
                    // If your API doesn't provide pagination metadata, you'll need to calculate it
                    // or adjust the API to include it
                    if (result.meta) {
                        setPagination(result.meta);
                    } else if (result.pagination) {
                        setPagination(result.pagination);
                    } else {
                        // Fallback if API doesn't provide pagination info
                        setPagination({
                            total: result.data.length,
                            per_page: ITEMS_PER_PAGE,
                            current_page: page,
                            last_page: Math.ceil(result.data.length / ITEMS_PER_PAGE),
                            from: ((page - 1) * ITEMS_PER_PAGE) + 1,
                            to: Math.min(page * ITEMS_PER_PAGE, result.data.length)
                        });
                    }
                } else if (result.courses) {
                    // Alternative API response structure
                    setCourses(result.courses.data || result.courses);
                    if (result.courses.meta) {
                        setPagination(result.courses.meta);
                    } else if (result.courses.pagination) {
                        setPagination(result.courses.pagination);
                    }
                }
            } else {
                setError(result.error || 'Failed to fetch courses.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Connection failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching courses.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    // Fetch Single Course for Editing
    const fetchSingleCourse = useCallback(async (id: number) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 200) {
                const courseData: Course = result.data;
                setFormData({
                    title: courseData.title,
                    description: courseData.description || ''
                });
                setCurrentImageUrl(courseData.image_url);
                setIsModalOpen(true);
            } else {
                setError(result.error || 'Failed to fetch course details.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Fetch failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching course details.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // Initial Fetch
    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    // Handle page change
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.last_page) {
            fetchCourses(page);
        }
    };

    // Handle search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCourses(1); // Reset to first page on search
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, fetchCourses]);

    // Form Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        } else {
            setImageFile(null);
        }
    };

    // Modal Handlers
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentCourseId(null);
        setCurrentImageUrl(null);
        setImageFile(null);
        setFormData({
            title: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (id: number) => {
        setIsEditMode(true);
        setCurrentCourseId(id);
        fetchSingleCourse(id);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setCurrentCourseId(null);
        setCurrentImageUrl(null);
        setImageFile(null);
        setFormData({
            title: '',
            description: ''
        });
        setError(null);
    };

    // Create/Update Course
    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Validation
        if (!formData.title) {
            setError('Title is required.');
            setIsSubmitting(false);
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description || '');

        if (imageFile) {
            formDataToSend.append('courseImage', imageFile);
        }

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${API_BASE_URL}/update/${currentCourseId}` : `${API_BASE_URL}/create`;

        try {
            const response = await fetch(url, {
                method: method,
                body: formDataToSend,
            });

            const result = await response.json();

            if (!response.ok || result.status >= 400) {
                throw new Error(result.error || `${method} failed. Status: ${response.status}`);
            }

            showToast(isEditMode ? 'Course updated successfully!' : 'Course created successfully!');
            closeModal();
            fetchCourses(pagination.current_page); // Refresh current page
            setSelectedCourses([]);

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

    // Delete Single Course
    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/delete/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok || result.status >= 400) {
                throw new Error(result.error || 'Delete failed.');
            }

            showToast('Course deleted successfully!');
            fetchCourses(pagination.current_page); // Refresh current page
            setSelectedCourses(selectedCourses.filter(courseId => courseId !== id));

        } catch (err) {
            if (err instanceof Error) {
                setError(`Deletion failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during deletion.');
            }
            setIsLoading(false);
        }
    };

    // Bulk Delete Courses
    const handleBulkDelete = async () => {
        if (selectedCourses.length === 0) {
            setError('No courses selected for deletion.');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${selectedCourses.length} selected course(s)? This action cannot be undone.`)) {
            return;
        }

        setIsBulkDeleting(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/delete-multiple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedCourses }),
            });

            const result = await response.json();

            if (!response.ok || result.status >= 400) {
                throw new Error(result.error || 'Bulk delete failed.');
            }

            showToast(`${result.affectedRows || selectedCourses.length} course(s) deleted successfully!`);
            fetchCourses(pagination.current_page); // Refresh current page
            setSelectedCourses([]);

        } catch (err) {
            if (err instanceof Error) {
                setError(`Bulk deletion failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during bulk deletion.');
            }
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Selection Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCourses(courses.map(course => course.id));
        } else {
            setSelectedCourses([]);
        }
    };

    const handleSelectCourse = (id: number) => {
        if (selectedCourses.includes(id)) {
            setSelectedCourses(selectedCourses.filter(courseId => courseId !== id));
        } else {
            setSelectedCourses([...selectedCourses, id]);
        }
    };

    // Format Date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Handle Image Download
    const handleImageDownload = (imageUrl: string, courseTitle: string) => {
        const fullUrl = getFullUrl(imageUrl);
        const fileName = courseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_image' + 
            (fullUrl.includes('.jpg') ? '.jpg' : 
             fullUrl.includes('.jpeg') ? '.jpeg' : 
             fullUrl.includes('.png') ? '.png' : 
             fullUrl.includes('.gif') ? '.gif' : 
             fullUrl.includes('.webp') ? '.webp' : '.jpg');

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle Image View
    const handleImageView = (imageUrl: string) => {
        const fullUrl = getFullUrl(imageUrl);
        window.open(fullUrl, '_blank');
    };

    // Generate page numbers for pagination
    const generatePageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        if (pagination.last_page <= maxVisiblePages) {
            // Show all pages if total pages is less than max visible
            for (let i = 1; i <= pagination.last_page; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            // Calculate start and end of visible pages
            let start = Math.max(2, pagination.current_page - 1);
            let end = Math.min(pagination.last_page - 1, pagination.current_page + 1);
            
            // Adjust if at the beginning
            if (pagination.current_page <= 2) {
                end = 4;
            }
            
            // Adjust if at the end
            if (pagination.current_page >= pagination.last_page - 1) {
                start = pagination.last_page - 3;
            }
            
            // Add ellipsis after first page if needed
            if (start > 2) {
                pages.push('...');
            }
            
            // Add middle pages
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            // Add ellipsis before last page if needed
            if (end < pagination.last_page - 1) {
                pages.push('...');
            }
            
            // Always show last page
            pages.push(pagination.last_page);
        }
        
        return pages;
    };

    // Render Functions
    const renderLoadingAndError = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8 text-indigo-600">
                    <Loader className="animate-spin mr-2 h-6 w-6" /> Loading courses...
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

        if (courses.length === 0 && !isLoading) {
            return (
                <div className="text-center p-8 text-gray-500">
                    {searchQuery
                        ? 'No courses found matching your search.'
                        : 'No courses found. Click "Create New Course" to start.'}
                </div>
            );
        }

        return null;
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;

        const pageNumbers = generatePageNumbers();

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg">
                {/* Pagination Info */}
                <div className="mb-4 sm:mb-0">
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{pagination.from}</span> to{' '}
                        <span className="font-medium">{pagination.to}</span> of{' '}
                        <span className="font-medium">{pagination.total}</span> courses
                    </p>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center space-x-2">
                    {/* First Page */}
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.current_page === 1}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
                        title="First Page"
                    >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>

                    {/* Previous Page */}
                    <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
                        title="Previous Page"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex space-x-1">
                        {pageNumbers.map((page, index) => (
                            page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-3 py-1.5 text-xs text-gray-500">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page as number)}
                                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded transition duration-150 ${
                                        pagination.current_page === page
                                            ? 'bg-indigo-600 text-white border border-indigo-600'
                                            : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    {/* Next Page */}
                    <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.last_page}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
                        title="Next Page"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                        onClick={() => handlePageChange(pagination.last_page)}
                        disabled={pagination.current_page === pagination.last_page}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
                        title="Last Page"
                    >
                        <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Items Per Page Selector (Optional) */}
                <div className="mt-4 sm:mt-0">
                    <p className="text-xs text-gray-500">
                        Showing {ITEMS_PER_PAGE} per page
                    </p>
                </div>
            </div>
        );
    };

    const renderCoursesList = () => (
        <div className="overflow-hidden bg-white rounded-xl shadow-lg">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={selectedCourses.length === courses.length && courses.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {courses.map((course) => (
                            <tr key={course.id} className="hover:bg-indigo-50 transition duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedCourses.includes(course.id)}
                                        onChange={() => handleSelectCourse(course.id)}
                                        className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <div className="text-sm font-medium text-gray-900">{course.title}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                        {course.description || 'No description'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-3">
                                        {course.image_url ? (
                                            <>
                                                {/* Image View Button */}
                                                <button
                                                    onClick={() => handleImageView(course.image_url!)}
                                                    className="flex items-center space-x-1 text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-md transition duration-150 group"
                                                    title="View Image in New Tab"
                                                >
                                                    <ImageIcon className="h-4 w-4" />
                                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <span className="text-xs">View</span>
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400">No image</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(course.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => openEditModal(course.id)}
                                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100 transition duration-150 mr-2"
                                        title="Edit Course"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(course.id)}
                                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition duration-150"
                                        title="Delete Course"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            {renderPagination()}
        </div>
    );

    const renderModal = () => (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isModalOpen ? 'block' : 'hidden'}`}>
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto transform transition-all p-6">

                    {/* Modal Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                            {isEditMode ? 'Edit Course' : 'Create New Course'}
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

                    {/* Modal Body */}
                    <form onSubmit={handleCreateOrUpdate}>
                        {error && (
                            <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Title */}
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
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                    placeholder="Course Title"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    id="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border resize-none"
                                    placeholder="Course description (optional)"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="border p-4 rounded-lg bg-gray-50">
                                <label htmlFor="courseImage" className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Image {isEditMode ? '(Optional to change)' : '(Optional)'}
                                </label>

                                {currentImageUrl && !imageFile && (
                                    <div className="mb-3 relative w-full h-48 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center group">
                                        <img
                                            src={getFullUrl(currentImageUrl)}
                                            alt="Current Course"
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-bl-lg">
                                            Current Image
                                        </div>
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() => handleImageView(currentImageUrl)}
                                                className="bg-white text-gray-800 px-3 py-1 rounded-md text-sm flex items-center hover:bg-gray-100 transition duration-150"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                View Full Image
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {imageFile && (
                                    <div className="mb-3 relative w-full h-48 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                                        <img
                                            src={URL.createObjectURL(imageFile)}
                                            alt="New Image Preview"
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs p-1 rounded-bl-lg">
                                            New Image Preview
                                        </div>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    name="courseImage"
                                    id="courseImage"
                                    accept=".jpg,.jpeg,.png,.gif,.webp"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-gray-500">Max size: 5MB. Allowed types: JPEG, PNG, GIF, WebP.</p>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-3 mt-6">
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
                                ) : isEditMode ? 'Save Changes' : 'Create Course'}
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
                {/* Success Toast */}
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
                                        <p className="text-sm font-medium text-gray-900">Success!</p>
                                        <p className="mt-1 text-sm text-gray-500">{successMessage}</p>
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

                {/* Header Section */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Course Management</h1>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.02] active:scale-95"
                        style={{ backgroundColor: '#0B6D8E' }}
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create New Course
                    </button>
                </header>

                {/* Bulk Actions Bar */}
                {selectedCourses.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium text-yellow-800">
                                {selectedCourses.length} course(s) selected
                            </span>
                        </div>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 disabled:opacity-50"
                        >
                            {isBulkDeleting ? (
                                <Loader className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete Selected
                        </button>
                    </div>
                )}

                {/* Search Section */}
                <div className="mb-6 bg-white rounded-xl shadow p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Search Input */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search courses by title or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                />
                            </div>
                        </div>
                        
                        {/* Pagination Summary */}
                        {courses.length > 0 && (
                            <div className="text-sm text-gray-600">
                                Page {pagination.current_page} of {pagination.last_page}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                {renderLoadingAndError()}
                {!isLoading && !error && courses.length > 0 && renderCoursesList()}
                {renderModal()}
            </div>
        </AdminLayout>
    );
};

export default Courses;