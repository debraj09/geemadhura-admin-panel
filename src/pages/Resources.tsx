import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Loader, CheckCircle, FileText, Search, Download, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- Interfaces for Type Safety ---
interface Resource {
    id: number;
    title: string;
    description: string | null;
    resource_url: string;
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
const API_BASE_URL = 'https://geemadhura.braventra.in/api/resources';
const BASE_URL = 'https://geemadhura.braventra.in';
const ITEMS_PER_PAGE = 5; // Maximum 5 items per page

// --- Main Component ---
const Resources: React.FC = () => {
    // State Management
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentResourceId, setCurrentResourceId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState<boolean>(false);
    const [selectedResources, setSelectedResources] = useState<number[]>([]);
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
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);

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

    // Fetch Resources with Pagination - FIXED VERSION
    const fetchResources = useCallback(async (page: number = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            let url = API_BASE_URL; // Remove pagination parameters
            
            // Add search parameter if it exists
            if (searchQuery) {
                url += `?search=${encodeURIComponent(searchQuery)}`;
            }

            console.log('Fetching from URL:', url); // Debug log

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.status === 200) {
                console.log('API Response:', result); // Debug log
                
                // Store all resources in state for client-side pagination
                const allResources = result.data || [];
                const total = allResources.length;
                
                // Calculate pagination
                const startIndex = (page - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const paginatedData = allResources.slice(startIndex, endIndex);
                
                setResources(paginatedData);
                
                setPagination({
                    total: total,
                    per_page: ITEMS_PER_PAGE,
                    current_page: page,
                    last_page: Math.ceil(total / ITEMS_PER_PAGE),
                    from: startIndex + 1,
                    to: Math.min(endIndex, total)
                });
                
            } else {
                setError(result.error || 'Failed to fetch resources.');
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error('Fetch error:', err.message); // Debug log
                setError(`Connection failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching resources.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    // Fetch Single Resource for Editing
    const fetchSingleResource = useCallback(async (id: number) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 200) {
                const resourceData: Resource = result.data;
                setFormData({
                    title: resourceData.title,
                    description: resourceData.description || ''
                });
                setCurrentPdfUrl(resourceData.resource_url);
                setIsModalOpen(true);
            } else {
                setError(result.error || 'Failed to fetch resource details.');
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(`Fetch failed: ${err.message}`);
            } else {
                setError('An unknown error occurred while fetching resource details.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // Initial Fetch
    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    // Handle page change
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.last_page) {
            fetchResources(page);
        }
    };

    // Handle search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResources(1); // Reset to first page on search
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, fetchResources]);

    // Form Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Check if file is PDF
            if (file.type === 'application/pdf') {
                setPdfFile(file);
            } else {
                setError('Only PDF files are allowed.');
                e.target.value = ''; // Reset file input
            }
        } else {
            setPdfFile(null);
        }
    };

    // Modal Handlers
    const openCreateModal = () => {
        setIsEditMode(false);
        setCurrentResourceId(null);
        setCurrentPdfUrl(null);
        setPdfFile(null);
        setFormData({
            title: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (id: number) => {
        setIsEditMode(true);
        setCurrentResourceId(id);
        fetchSingleResource(id);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setCurrentResourceId(null);
        setCurrentPdfUrl(null);
        setPdfFile(null);
        setFormData({
            title: '',
            description: ''
        });
        setError(null);
    };

    // Create/Update Resource
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

        // For create mode, PDF is required
        if (!isEditMode && !pdfFile) {
            setError('PDF file is required for new resources.');
            setIsSubmitting(false);
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description || '');

        if (pdfFile) {
            formDataToSend.append('resourceFile', pdfFile);
        }

        const method = isEditMode ? 'PUT' : 'POST';
        const url = isEditMode ? `${API_BASE_URL}/update/${currentResourceId}` : `${API_BASE_URL}/create`;

        try {
            const response = await fetch(url, {
                method: method,
                body: formDataToSend,
            });

            const result = await response.json();

            if (!response.ok || result.status >= 400) {
                throw new Error(result.error || `${method} failed. Status: ${response.status}`);
            }

            showToast(isEditMode ? 'Resource updated successfully!' : 'Resource created successfully!');
            closeModal();
            fetchResources(pagination.current_page); // Refresh current page
            setSelectedResources([]);

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

    // Delete Single Resource
    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
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

            showToast('Resource deleted successfully!');
            fetchResources(pagination.current_page); // Refresh current page
            setSelectedResources(selectedResources.filter(resourceId => resourceId !== id));

        } catch (err) {
            if (err instanceof Error) {
                setError(`Deletion failed: ${err.message}`);
            } else {
                setError('An unknown error occurred during deletion.');
            }
            setIsLoading(false);
        }
    };

    // Bulk Delete Resources
    const handleBulkDelete = async () => {
        if (selectedResources.length === 0) {
            setError('No resources selected for deletion.');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${selectedResources.length} selected resource(s)? This action cannot be undone.`)) {
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
                body: JSON.stringify({ ids: selectedResources }),
            });

            const result = await response.json();

            if (!response.ok || result.status >= 400) {
                throw new Error(result.error || 'Bulk delete failed.');
            }

            showToast(`${result.affectedRows || selectedResources.length} resource(s) deleted successfully!`);
            fetchResources(pagination.current_page); // Refresh current page
            setSelectedResources([]);

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
            setSelectedResources(resources.map(resource => resource.id));
        } else {
            setSelectedResources([]);
        }
    };

    const handleSelectResource = (id: number) => {
        if (selectedResources.includes(id)) {
            setSelectedResources(selectedResources.filter(resourceId => resourceId !== id));
        } else {
            setSelectedResources([...selectedResources, id]);
        }
    };

    // Format Date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle PDF Download
    const handlePdfDownload = (pdfUrl: string, resourceTitle: string) => {
        const fullUrl = getFullUrl(pdfUrl);
        const fileName = resourceTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle PDF View
    const handlePdfView = (pdfUrl: string) => {
        const fullUrl = getFullUrl(pdfUrl);
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

    // Get file name from URL
    const getFileName = (url: string): string => {
        const parts = url.split('/');
        return parts[parts.length - 1] || 'document.pdf';
    };

    // Render Functions
    const renderLoadingAndError = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8 text-indigo-600">
                    <Loader className="animate-spin mr-2 h-6 w-6" /> Loading resources...
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

        if (resources.length === 0 && !isLoading) {
            return (
                <div className="text-center p-8 text-gray-500">
                    {searchQuery
                        ? 'No resources found matching your search.'
                        : 'No resources found. Click "Create New Resource" to start.'}
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
                        <span className="font-medium">{pagination.total}</span> resources
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

                {/* Items Per Page Selector */}
                <div className="mt-4 sm:mt-0">
                    <p className="text-xs text-gray-500">
                        Showing {ITEMS_PER_PAGE} per page
                    </p>
                </div>
            </div>
        );
    };

    const renderResourcesList = () => (
        <div className="overflow-hidden bg-white rounded-xl shadow-lg">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={selectedResources.length === resources.length && resources.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF Document</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {resources.map((resource) => (
                            <tr key={resource.id} className="hover:bg-indigo-50 transition duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedResources.includes(resource.id)}
                                        onChange={() => handleSelectResource(resource.id)}
                                        className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                    <div className="text-sm font-medium text-gray-900">{resource.title}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                        {resource.description || 'No description'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col space-y-2">
                                        {resource.resource_url ? (
                                            <>
                                                {/* PDF File Info */}
                                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                    <FileText className="h-4 w-4 text-red-500" />
                                                    <span className="truncate max-w-xs" title={getFileName(resource.resource_url)}>
                                                        {getFileName(resource.resource_url)}
                                                    </span>
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex items-center space-x-3">
                                                    {/* View PDF Button */}
                                                    <button
                                                        onClick={() => handlePdfView(resource.resource_url)}
                                                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition duration-150 text-xs"
                                                        title="View PDF in New Tab"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        <span>View</span>
                                                    </button>
                                                    
                                                    {/* Download PDF Button */}
                                                    <button
                                                        onClick={() => handlePdfDownload(resource.resource_url, resource.title)}
                                                        className="flex items-center space-x-1 text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-md transition duration-150 text-xs"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        <span>Download</span>
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400">No PDF</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(resource.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => openEditModal(resource.id)}
                                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-100 transition duration-150 mr-2"
                                        title="Edit Resource"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(resource.id)}
                                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition duration-150"
                                        title="Delete Resource"
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
                            {isEditMode ? 'Edit Resource' : 'Create New Resource'}
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
                                    placeholder="Resource Title"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    name="description"
                                    id="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border resize-none"
                                    placeholder="Resource description"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* PDF Upload */}
                            <div className="border p-4 rounded-lg bg-gray-50">
                                <label htmlFor="resourceFile" className="block text-sm font-medium text-gray-700 mb-2">
                                    PDF File {isEditMode ? '(Optional to change)' : '(Required)'}
                                    {!isEditMode && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {currentPdfUrl && !pdfFile && (
                                    <div className="mb-3">
                                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                            <FileText className="h-8 w-8 text-red-500" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {getFileName(currentPdfUrl)}
                                                </p>
                                                <p className="text-xs text-gray-500">Current PDF file</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePdfView(currentPdfUrl)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                                                    title="View PDF"
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePdfDownload(currentPdfUrl, formData.title)}
                                                    className="text-green-600 hover:text-green-800 text-xs flex items-center"
                                                    title="Download PDF"
                                                >
                                                    <Download className="h-3.5 w-3.5 mr-1" />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {pdfFile && (
                                    <div className="mb-3">
                                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-md border border-green-200">
                                            <FileText className="h-8 w-8 text-green-600" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {pdfFile.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • New file selected
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    name="resourceFile"
                                    id="resourceFile"
                                    accept=".pdf"
                                    onChange={handlePdfChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    disabled={isSubmitting}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Max size: 10MB. Only PDF files are allowed.
                                </p>
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
                                ) : isEditMode ? 'Save Changes' : 'Create Resource'}
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
                    <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0"> Resources Management</h1>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.02] active:scale-95"
                        style={{ backgroundColor: '#0B6D8E' }}
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create New Resource
                    </button>
                </header>

                {/* Bulk Actions Bar */}
                {selectedResources.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium text-yellow-800">
                                {selectedResources.length} resource(s) selected
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
                                    placeholder="Search resources by title or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 transition duration-150 border"
                                />
                            </div>
                        </div>
                        
                        {/* Pagination Summary */}
                        {resources.length > 0 && (
                            <div className="text-sm text-gray-600">
                                Page {pagination.current_page} of {pagination.last_page}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                {renderLoadingAndError()}
                {!isLoading && !error && resources.length > 0 && renderResourcesList()}
                {renderModal()}
            </div>
        </AdminLayout>
    );
};

export default Resources;