import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ChevronRight, FileText, Check, X, Search, Edit, Plus, ChevronUp,
    ChevronDown, Loader2, AlertCircle, Trash2, ToggleLeft, ToggleRight,
    RotateCcw, Upload, Save
} from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- TYPESCRIPT INTERFACES ---

/** Defines the structure of a Service object returned from the API. */
interface Service {
    id: number;
    name: string;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
}

/** Defines the structure for the table sorting state. */
interface SortConfig {
    key: keyof Service | null;
    direction: 'ascending' | 'descending';
}

/** Defines the props for the SortableHeader component. */
interface SortableHeaderProps {
    label: string;
    sortKey: keyof Service;
    sortConfig: SortConfig;
    requestSort: (key: keyof Service) => void;
}

/** Defines the structure of the data to be submitted for a new service. */
interface ServiceFormData {
    serviceName: string;
    description: string;
    scopeTitle: string;
    scopeContent: string;
    metaTitle: string;
    metaKeyword: string;
    metaDescription: string;
    imageFile: File | null;
    bannerImageFile: File | null;
    active: boolean;
}

// --- DYNAMIC BASE URL CONFIGURATION ---
const BASE_URL: string = 'https://geemadhura.braventra.in';
const API_ENDPOINT: string = `${BASE_URL}/api/services`;
// ----------------------------------------

// --- UTILITY FUNCTIONS ---

/** Converts a string to a URL-friendly slug. */
const slugify = (text: string): string => {
    return text.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Table Header component for sorting
const SortableHeader: React.FC<SortableHeaderProps> = ({ label, sortKey, sortConfig, requestSort }) => {
    const getSortIcon = () => {
        if (sortConfig.key !== sortKey) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />;
    };

    return (
        <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center">
                {label}
                {getSortIcon()}
            </div>
        </th>
    );
};

// Helper component for file upload area
const FileUploadArea: React.FC<{
    label: string,
    name: 'imageFile' | 'bannerImageFile',
    file: File | null,
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'imageFile' | 'bannerImageFile') => void
}> = ({ label, name, file, handleFileChange }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{label}*</label>
            <div
                onClick={triggerFileSelect}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition duration-150 h-32"
            >
                <Upload size={24} className="text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">
                    {file ? `File: ${file.name}` : "Drag & Drop your files or "}
                    <span className="font-semibold text-blue-600">Browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "(Max file size 2MB)"}
                </p>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                name={name}
                onChange={(e) => handleFileChange(e, name)}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
};

// --- SERVICE LIST MANAGER COMPONENT ---
interface ServiceListManagerProps {
    onNavigateToCreate: () => void;
}

const ServiceListManager: React.FC<ServiceListManagerProps> = ({ onNavigateToCreate }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'descending' });

    // Function to fetch services data from the API
    const fetchServices = useCallback(async () => {
        setLoading(true);
        setError(null);

        const maxRetries: number = 3;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response: Response = await fetch(API_ENDPOINT);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
                }

                const result = await response.json();

                const mappedData = (result.data || []).map((service: any) => ({
                    ...service,
                    is_active: Boolean(service.is_active)
                }));

                setServices(mappedData);
                setError(null);
                setLoading(false);
                return;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                if (attempt === maxRetries - 1) {
                    setError(`Failed to load services: ${errorMessage}`);
                    setLoading(false);
                } else {
                    const delay: number = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }, []);

    // Load data on component mount
    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    // 1. Delete Service
    const handleDeleteService = async (serviceId: number, serviceName: string) => {
        if (!window.confirm(`Are you sure you want to delete the service: "${serviceName}" (ID: ${serviceId})?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_ENDPOINT}/delete/${serviceId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 200) {
                setServices(prevServices => prevServices.filter(service => service.id !== serviceId));
                alert(`Service "${serviceName}" deleted successfully!`);
            } else {
                throw new Error(result.error || 'Failed to delete service.');
            }

        } catch (err) {
            console.error('Delete error:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred during deletion.'}`);
        }
    };

    // 2. Toggle Active Status
    const handleToggleActiveStatus = async (serviceId: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const response = await fetch(`${API_ENDPOINT}/toggle-active/${serviceId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 200) {
                setServices(prevServices => prevServices.map(service =>
                    service.id === serviceId ? { ...service, is_active: newStatus } : service
                ));
            } else {
                throw new Error(result.message || 'Failed to toggle status.');
            }

        } catch (err) {
            console.error('Toggle status error:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred during status update.'}`);
            fetchServices();
        }
    };

    // Handle single row selection
    const toggleRowSelection = (id: number) => {
        setSelectedRows(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // Handle select all functionality
    const toggleSelectAll = () => {
        const allSelected: boolean = filteredServices.length > 0 && filteredServices.every(service => selectedRows[service.id]);
        if (allSelected) {
            setSelectedRows({});
        } else {
            const newSelection: Record<number, boolean> = {};
            filteredServices.forEach(service => {
                newSelection[service.id] = true;
            });
            setSelectedRows(newSelection);
        }
    };

    const requestSort = (key: keyof Service) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Sorting logic (Memoized)
    const sortedServices: Service[] = useMemo(() => {
        if (loading || error) return [];

        let sortableItems = [...services];
        const key = sortConfig.key;

        if (key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[key];
                const bValue = b[key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [services, sortConfig, loading, error]);

    // Filter services based on search term
    const filteredServices: Service[] = sortedServices.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.id.toString().includes(searchTerm)
    );

    // Conditional Content Rendering
    const renderTableContent = () => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-blue-600 text-lg">
                        <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading services...
                    </td>
                </tr>
            );
        }

        if (error) {
            return (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-red-600 text-lg bg-red-50">
                        <AlertCircle className="w-6 h-6 inline-block mr-2" /> {error}
                    </td>
                </tr>
            );
        }

        if (filteredServices.length === 0) {
            return (
                <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 text-lg">
                        No services found matching your search criteria.
                    </td>
                </tr>
            );
        }

        return filteredServices.map((service: Service) => (
            <tr key={service.id} className="hover:bg-gray-50 transition duration-150">

                {/* Selection Checkbox */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={!!selectedRows[service.id]}
                        onChange={() => toggleRowSelection(service.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                </td>

                {/* ID */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.id}
                </td>

                {/* Name */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {service.name}
                </td>

                {/* Image */}
                <td className="px-6 py-4 whitespace-nowrap">
                    <img
                        className="w-16 h-10 object-cover rounded-md shadow-sm"
                        src={service.image_url ? `${BASE_URL}${service.image_url}` : "https://placehold.co/80x50/cccccc/000000?text=No+Image"}
                        alt={`Image for ${service.name}`}
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://placehold.co/80x50/cccccc/000000?text=N/A";
                        }}
                    />
                </td>

                {/* Active Status */}
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {service.is_active ? (
                        <span title="Active">
                            <Check size={20} className="text-green-500 mx-auto" />
                        </span>
                    ) : (
                        <span title="Inactive">
                            <X size={20} className="text-red-500 mx-auto" />
                        </span>
                    )}
                </td>

                {/* Created At */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(service.created_at).toLocaleDateString()}
                </td>

                {/* Actions (Toggle, Edit, Delete) */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {/* Toggle Button */}
                    <button
                        onClick={() => handleToggleActiveStatus(service.id, service.is_active)}
                        title={service.is_active ? "Mark Inactive" : "Mark Active"}
                        className={`p-1 rounded-full transition duration-150 ${service.is_active ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'}`}
                    >
                        {service.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>

                    {/* Edit Button */}
                    <button
                        onClick={() => console.log('Editing service:', service.id)}
                        className="p-1 rounded-full text-blue-600 hover:bg-blue-100 transition duration-150"
                        title="Edit Service"
                    >
                        <Edit size={20} />
                    </button>

                    {/* Delete Button */}
                    <button
                        onClick={() => handleDeleteService(service.id, service.name)}
                        className="p-1 rounded-full text-red-600 hover:bg-red-100 transition duration-150"
                        title="Delete Service"
                    >
                        <Trash2 size={20} />
                    </button>
                </td>
            </tr>
        ));
    }

    return (
        <>
            {/* Header and Action Button */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Services</h1>
                <div className="flex space-x-3">
                    {/* Refresh Button */}
                    <button
                        onClick={fetchServices}
                        className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                        disabled={loading}
                    >
                        <RotateCcw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    {/* New Service Button */}
                    <button
                        onClick={onNavigateToCreate}
                        className="flex items-center bg-[#0c6e8e] hover:bg-[#085a73] text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"                    >
                      New certification
                    </button>
                </div>
            </div>

            {/* Main Content Card (Table Container) */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Checkbox Column */}
                                <th scope="col" className="px-6 py-3 w-1/12">
                                    <input
                                        type="checkbox"
                                        checked={filteredServices.length > 0 && filteredServices.every(service => selectedRows[service.id])}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </th>

                                <SortableHeader label="Id" sortKey="id" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />

                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Image
                                </th>

                                <SortableHeader label="Active" sortKey="is_active" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Created at" sortKey="created_at" sortConfig={sortConfig} requestSort={requestSort} />

                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {renderTableContent()}
                        </tbody>
                    </table>
                </div>

                {/* Footer/Pagination Placeholder */}
                <div className="p-4 border-t border-gray-200 text-sm text-gray-600 flex justify-between items-center">
                    <span>Showing {filteredServices.length} of {services.length} certifications</span>
                </div>
            </div>
        </>
    );
};

// --- SERVICE CREATE MANAGER COMPONENT ---

interface ServiceFormManagerProps {
    onNavigateBack: (shouldRefresh: boolean) => void;
}

const ServiceFormManager: React.FC<ServiceFormManagerProps> = ({ onNavigateBack }) => {
    const [formData, setFormData] = useState<ServiceFormData>({
        serviceName: '',
        description: '',
        scopeTitle: '',
        scopeContent: '',
        metaTitle: '',
        metaKeyword: '',
        metaDescription: '',
        imageFile: null,
        bannerImageFile: null,
        active: true,
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update form state for text inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Update form state for the toggle switch
    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            active: e.target.checked,
        }));
    };

    // Update form state for file inputs
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'imageFile' | 'bannerImageFile') => {
        const file = e.target.files ? e.target.files[0] : null;

        // Validate file size (2MB limit)
        if (file && file.size > 2 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, [fieldName]: 'File size must be less than 2MB' }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [fieldName]: file,
        }));

        // Clear error when valid file is selected
        if (errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.serviceName.trim()) {
            newErrors.serviceName = 'Service name is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        if (!formData.imageFile) {
            newErrors.imageFile = 'Service image is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submission handler
    const handleSubmit = useCallback(async (action: 'create' | 'createAndAnother') => {
        if (!validateForm()) {
            alert('Please fix the form errors before submitting.');
            return;
        }

        setLoading(true);
        setErrors({});

        const dataToSend = new FormData();

        // Append all text fields - matching your backend field names
        dataToSend.append('serviceName', formData.serviceName);
        dataToSend.append('description', formData.description);
        dataToSend.append('scopeTitle', formData.scopeTitle);
        dataToSend.append('scopeContent', formData.scopeContent);
        dataToSend.append('metaTitle', formData.metaTitle);
        dataToSend.append('metaKeyword', formData.metaKeyword);
        dataToSend.append('metaDescription', formData.metaDescription);
        dataToSend.append('active', formData.active.toString());

        // Append files - matching your backend field names
        if (formData.imageFile) {
            dataToSend.append('imageUpload', formData.imageFile);
        }
        if (formData.bannerImageFile) {
            dataToSend.append('bannerImageUpload', formData.bannerImageFile);
        }

        try {
            const response = await fetch(`${API_ENDPOINT}/create`, {
                method: 'POST',
                body: dataToSend,
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to create service with status: ${response.status}`);
            }

            alert(`Service created successfully: ${result.serviceId ? `ID: ${result.serviceId}` : formData.serviceName}`);

            // Handle Post-Submission Action
            if (action === 'createAndAnother') {
                // Reset form state for a new entry
                setFormData({
                    serviceName: '',
                    description: '',
                    scopeTitle: '',
                    scopeContent: '',
                    metaTitle: '',
                    metaKeyword: '',
                    metaDescription: '',
                    imageFile: null,
                    bannerImageFile: null,
                    active: true,
                });
            } else {
                // Navigate back to the list and refresh
                onNavigateBack(true);
            }

        } catch (err) {
            console.error('Submission error:', err);
            alert(`Error creating service: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
        } finally {
            setLoading(false);
        }
    }, [formData, onNavigateBack]);

    return (
        <>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Service</h1>

            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8">
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    {/* --- ROW 1: Service Name / Description --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
                                Service Name*
                            </label>
                            <input
                                type="text"
                                id="serviceName"
                                name="serviceName"
                                value={formData.serviceName}
                                onChange={handleChange}
                                required
                                className={`mt-1 block w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.serviceName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {errors.serviceName && (
                                <p className="mt-1 text-sm text-red-600">{errors.serviceName}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description*
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={3}
                                value={formData.description}
                                onChange={handleChange}
                                required
                                className={`mt-1 block w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none ${errors.description ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                            )}
                        </div>
                    </div>

                    {/* --- ROW 2: Scope Title / Scope Content --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="scopeTitle" className="block text-sm font-medium text-gray-700">
                                Scope of Work Title
                            </label>
                            <input
                                type="text"
                                id="scopeTitle"
                                name="scopeTitle"
                                value={formData.scopeTitle}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="scopeContent" className="block text-sm font-medium text-gray-700">
                                Scope of Work Content
                            </label>
                            <textarea
                                id="scopeContent"
                                name="scopeContent"
                                rows={3}
                                value={formData.scopeContent}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* --- ROW 3: Meta Title / Meta Keyword --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700">
                                Meta Title
                            </label>
                            <input
                                type="text"
                                id="metaTitle"
                                name="metaTitle"
                                value={formData.metaTitle}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="metaKeyword" className="block text-sm font-medium text-gray-700">
                                Meta Keyword
                            </label>
                            <input
                                type="text"
                                id="metaKeyword"
                                name="metaKeyword"
                                value={formData.metaKeyword}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* --- ROW 4: Meta Description --- */}
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700">
                                Meta Description
                            </label>
                            <textarea
                                id="metaDescription"
                                name="metaDescription"
                                rows={2}
                                value={formData.metaDescription}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* --- ROW 5: Image Uploads / Active Toggle --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FileUploadArea
                            label="Service Image"
                            name="imageFile"
                            file={formData.imageFile}
                            handleFileChange={handleFileChange}
                        />
                        {errors.imageFile && (
                            <p className="text-sm text-red-600 md:col-span-3">{errors.imageFile}</p>
                        )}

                        <FileUploadArea
                            label="Banner Image"
                            name="bannerImageFile"
                            file={formData.bannerImageFile}
                            handleFileChange={handleFileChange}
                        />

                        <div className="flex flex-col justify-start pt-6">
                            <label htmlFor="isActiveToggle" className="text-sm font-medium text-gray-700 mb-2">
                                Active Status
                            </label>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActiveToggle"
                                    name="active"
                                    checked={formData.active}
                                    onChange={handleToggleChange}
                                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={`ml-3 text-sm font-medium ${formData.active ? 'text-green-600' : 'text-red-600'}`}>
                                    {formData.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- Submission Buttons --- */}
                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => onNavigateBack(false)}
                            className="flex items-center bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubmit('createAndAnother')}
                            className="flex items-center bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={loading}
                        >
                            <Plus size={18} className="mr-1" />
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Another'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSubmit('create')}
                            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={loading}
                        >
                            <Save size={18} className="mr-1" />
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Service'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

// --- PARENT APP COMPONENT (Manages View State) ---
type ViewMode = 'list' | 'create' | 'edit';

const App: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [listKey, setListKey] = useState<number>(0);

    const handleNavigateToCreate = () => setViewMode('create');

    const handleNavigateBack = (shouldRefresh: boolean) => {
        setViewMode('list');
        if (shouldRefresh) {
            setListKey(prev => prev + 1);
        }
    };

    const breadcrumbs = useMemo(() => (
        <div className="flex items-center text-sm text-gray-500 mb-4">
            <FileText size={16} className="mr-1" />
            <span>Services</span>
            <ChevronRight size={16} className="mx-1" />
            <span className="font-medium text-gray-700">
                {viewMode === 'list' ? 'List' : 'Create'}
            </span>
        </div>
    ), [viewMode]);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                {/* Breadcrumbs */}
                {breadcrumbs}

                {/* Conditional Rendering of Views */}
                {viewMode === 'list' && (
                    <ServiceListManager
                        key={listKey}
                        onNavigateToCreate={handleNavigateToCreate}
                    />
                )}

                {viewMode === 'create' && (
                    <ServiceFormManager
                        onNavigateBack={handleNavigateBack}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default App;