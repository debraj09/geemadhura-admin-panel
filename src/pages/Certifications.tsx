import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    ChevronRight, FileText, Check, X, Search, Edit, Plus, ChevronUp,
    ChevronDown, Loader2, AlertCircle, Trash2, ToggleLeft, ToggleRight,
    RotateCcw, Upload, Save, GripVertical, ArrowUpDown, ArrowLeft
} from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// Import Jodit Editor
import { Jodit } from 'jodit';
import JoditEditor from 'jodit-react';

// Import DnD Kit components
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- UPDATED TYPESCRIPT INTERFACES ---
interface Service {
    id: number;
    name: string;
    slug: string;
    description: string;
    scope_title: string;
    scope_content: string;
    meta_title: string;
    meta_keyword: string;
    meta_description: string;
    image_url: string | null;
    banner_image_url: string | null;
    is_active: boolean;
    created_at: string;
    display_order: number;
}

interface SortConfig {
    key: keyof Service | null;
    direction: 'ascending' | 'descending';
}

interface SortableHeaderProps {
    label: string;
    sortKey: keyof Service;
    sortConfig: SortConfig;
    requestSort: (key: keyof Service) => void;
}

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
    slug: string;
}

// --- DYNAMIC BASE URL CONFIGURATION ---
const BASE_URL: string = 'https://geemadhura.braventra.in';
const API_ENDPOINT: string = `${BASE_URL}/api/services`;
// ----------------------------------------

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
        removeButtons: ['image', 'file', 'video', 'table'], // Remove media buttons if not needed
        defaultActionOnPaste: 'insert_as_html' as any,
        editHTMLDocumentMode: false,
        enter: 'br' as 'br' | 'div' | 'p',
        defaultMode: 'wysiwyg',
        useSearch: false,
        spellcheck: true,
        language: 'en',
        toolbarButtonSize: 'middle' as 'middle',
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
                onBlur={newContent => onChange(newContent)} // Update on blur as well
            />
            <div className="text-xs text-gray-500 mt-2">
                Characters: {value.replace(/<[^>]*>/g, '').length} | 
                Words: {value.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length}
            </div>
        </div>
    );
};

// --- Sortable Table Row Component ---
const SortableTableRow: React.FC<{
    service: Service;
    index: number;
    selectedRows: Record<number, boolean>;
    toggleRowSelection: (id: number) => void;
    handleToggleActiveStatus: (id: number, currentStatus: boolean) => void;
    handleDeleteService: (id: number, name: string) => void;
    handleEditService: (id: number) => void;
    isDragging?: boolean;
}> = ({ 
    service, 
    index, 
    selectedRows, 
    toggleRowSelection, 
    handleToggleActiveStatus, 
    handleDeleteService,
    handleEditService,
    isDragging 
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging: isRowDragging } = useSortable({ id: service.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isRowDragging ? 0.5 : 1,
        backgroundColor: isRowDragging ? '#f3f4f6' : 'white',
    };

    return (
        <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 transition duration-150">
            {/* Drag Handle */}
            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-400 cursor-move" {...attributes} {...listeners}>
                <GripVertical size={16} className="hover:text-gray-600" />
            </td>

            {/* Selection Checkbox */}
            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                <input
                    type="checkbox"
                    checked={!!selectedRows[service.id]}
                    onChange={() => toggleRowSelection(service.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
            </td>

            {/* Order Number */}
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-medium">
                {service.display_order || index + 1}
            </td>

            {/* ID */}
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                {service.id}
            </td>

            {/* Name */}
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {service.name}
            </td>

            {/* Image */}
            <td className="px-3 py-4 whitespace-nowrap">
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
            <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
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
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(service.created_at).toLocaleDateString()}
            </td>

            {/* Actions (Toggle, Edit, Delete) */}
            <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
                    onClick={() => handleEditService(service.id)}
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
    );
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
            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center">
                {label}
                {getSortIcon()}
            </div>
        </th>
    );
};

// --- SERVICE LIST MANAGER COMPONENT (UPDATED) ---
interface ServiceListManagerProps {
    onNavigateToCreate: () => void;
    onNavigateToEdit: (id: number) => void;
}

const ServiceListManager: React.FC<ServiceListManagerProps> = ({ onNavigateToCreate, onNavigateToEdit }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [filteredServices, setFilteredServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'display_order', direction: 'ascending' });
    const [isReordering, setIsReordering] = useState<boolean>(false);
    const [savingOrder, setSavingOrder] = useState<boolean>(false);
    const [showSaveOrderBtn, setShowSaveOrderBtn] = useState<boolean>(false);

    // Initialize DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
                    is_active: Boolean(service.is_active),
                    display_order: service.display_order || 0
                }));

                // Sort by display_order initially
                const sortedData = [...mappedData].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                
                setServices(sortedData);
                setFilteredServices(sortedData);
                setError(null);
                setLoading(false);
                setShowSaveOrderBtn(false);
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

    // Filter services based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredServices(services);
            return;
        }

        const filtered = services.filter(service =>
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.id.toString().includes(searchTerm)
        );
        setFilteredServices(filtered);
    }, [searchTerm, services]);

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
                fetchServices(); // Refresh to recalculate order
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

    // 3. Handle Edit Service
    const handleEditService = (serviceId: number) => {
        onNavigateToEdit(serviceId);
    };

    // 4. Handle Drag End (Reorder)
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setServices((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);
                
                const newItems = arrayMove(items, oldIndex, newIndex);
                
                // Update display_order in local state
                const updatedItems = newItems.map((item, index) => ({
                    ...item,
                    display_order: index + 1
                }));
                
                setShowSaveOrderBtn(true);
                return updatedItems;
            });
        }
    };

    // 5. Save New Order to Backend
    const saveNewOrder = async () => {
        setSavingOrder(true);
        try {
            const response = await fetch(`${API_ENDPOINT}/update-order`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reorderedServices: services.map((service, index) => ({
                        id: service.id,
                        display_order: index + 1
                    }))
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 200) {
                alert('Service order saved successfully!');
                setShowSaveOrderBtn(false);
                fetchServices(); // Refresh to get updated order from DB
            } else {
                throw new Error(result.error || 'Failed to save order.');
            }

        } catch (err) {
            console.error('Save order error:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'Failed to save new order.'}`);
        } finally {
            setSavingOrder(false);
        }
    };

    // 6. Reset to Original Order
    const resetOrder = () => {
        if (window.confirm('Reset to original saved order? Any unsaved changes will be lost.')) {
            fetchServices();
            setShowSaveOrderBtn(false);
        }
    };

    // 7. Toggle Reordering Mode
    const toggleReordering = () => {
        setIsReordering(!isReordering);
        if (isReordering && showSaveOrderBtn) {
            if (window.confirm('You have unsaved order changes. Exit without saving?')) {
                fetchServices();
                setShowSaveOrderBtn(false);
            } else {
                setIsReordering(true);
            }
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

    // Sorting logic
    const sortedServices = useMemo(() => {
        if (loading || error) return [];

        let sortableItems = [...filteredServices];
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
    }, [filteredServices, sortConfig, loading, error]);

    // Conditional Content Rendering
    const renderTableContent = () => {
        if (loading) {
            return (
                <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-blue-600 text-lg">
                        <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> Loading services...
                    </td>
                </tr>
            );
        }

        if (error) {
            return (
                <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-red-600 text-lg bg-red-50">
                        <AlertCircle className="w-6 h-6 inline-block mr-2" /> {error}
                    </td>
                </tr>
            );
        }

        if (filteredServices.length === 0) {
            return (
                <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500 text-lg">
                        No certifications found matching your search criteria.
                    </td>
                </tr>
            );
        }

        if (isReordering) {
            return (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={services.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {services.map((service, index) => (
                            <SortableTableRow
                                key={service.id}
                                service={service}
                                index={index}
                                selectedRows={selectedRows}
                                toggleRowSelection={toggleRowSelection}
                                handleToggleActiveStatus={handleToggleActiveStatus}
                                handleDeleteService={handleDeleteService}
                                handleEditService={handleEditService}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            );
        }

        return sortedServices.map((service, index) => (
            <tr key={service.id} className="hover:bg-gray-50 transition duration-150">
                {/* Empty drag handle cell when not reordering */}
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                    <GripVertical size={16} />
                </td>

                {/* Selection Checkbox */}
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={!!selectedRows[service.id]}
                        onChange={() => toggleRowSelection(service.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                </td>

                {/* Order Number */}
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-medium">
                    {service.display_order || index + 1}
                </td>

                {/* ID */}
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.id}
                </td>

                {/* Name */}
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {service.name}
                </td>

                {/* Image */}
                <td className="px-3 py-4 whitespace-nowrap">
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
                <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
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
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(service.created_at).toLocaleDateString()}
                </td>

                {/* Actions (Toggle, Edit, Delete) */}
                <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
                        onClick={() => handleEditService(service.id)}
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
            {/* Header and Action Buttons */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Services</h1>
                <div className="flex space-x-3">
                    {/* Reorder Toggle Button */}
                    <button
                        onClick={toggleReordering}
                        className={`flex items-center ${isReordering ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out`}
                        disabled={loading || savingOrder}
                    >
                        <ArrowUpDown size={18} className="mr-1" />
                        {isReordering ? 'Exit Reorder' : 'Reorder Items'}
                    </button>

                    {/* Save Order Button (only shown during reordering with changes) */}
                    {showSaveOrderBtn && isReordering && (
                        <button
                            onClick={saveNewOrder}
                            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={savingOrder}
                        >
                            {savingOrder ? (
                                <Loader2 size={18} className="animate-spin mr-1" />
                            ) : (
                                <Save size={18} className="mr-1" />
                            )}
                            {savingOrder ? 'Saving...' : 'Save New Order'}
                        </button>
                    )}

                    {/* Reset Order Button (only shown during reordering with changes) */}
                    {showSaveOrderBtn && isReordering && (
                        <button
                            onClick={resetOrder}
                            className="flex items-center bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={savingOrder}
                        >
                            <RotateCcw size={18} className="mr-1" />
                            Reset Order
                        </button>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={fetchServices}
                        className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                        disabled={loading || savingOrder}
                    >
                        <RotateCcw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>

                    {/* New Service Button */}
                    <button
                        onClick={onNavigateToCreate}
                        className="flex items-center bg-[#0c6e8e] hover:bg-[#085a73] text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                        disabled={isReordering}
                    >
                        <Plus size={18} className="mr-1" />
                        New certification
                    </button>
                </div>
            </div>

            {/* Reordering Instructions Banner */}
            {isReordering && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                        <GripVertical className="text-blue-500 mr-2" />
                        <p className="text-blue-700">
                            <strong>Drag and drop</strong> items to reorder. Click <strong>"Save New Order"</strong> to save changes or <strong>"Exit Reorder"</strong> to cancel.
                        </p>
                    </div>
                </div>
            )}

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
                            disabled={isReordering}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Drag Handle Header */}
                                <th scope="col" className="px-3 py-3 w-1/12 text-center">
                                    <span className="sr-only">Drag</span>
                                </th>

                                {/* Checkbox Column */}
                                <th scope="col" className="px-3 py-3 w-1/12">
                                    <input
                                        type="checkbox"
                                        checked={filteredServices.length > 0 && filteredServices.every(service => selectedRows[service.id])}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        disabled={isReordering}
                                    />
                                </th>

                                {/* Order Column */}
                                <SortableHeader label="Order" sortKey="display_order" sortConfig={sortConfig} requestSort={requestSort} />

                                <SortableHeader label="Id" sortKey="id" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />

                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Image
                                </th>

                                <SortableHeader label="Active" sortKey="is_active" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Created at" sortKey="created_at" sortConfig={sortConfig} requestSort={requestSort} />

                                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    {isReordering && (
                        <span className="text-blue-600 font-medium">
                            Drag and drop mode active
                        </span>
                    )}
                </div>
            </div>
        </>
    );
};

// Helper component for file upload area
const FileUploadArea: React.FC<{
    label: string,
    name: 'imageFile' | 'bannerImageFile',
    file: File | null,
    currentImage: string | null,
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'imageFile' | 'bannerImageFile') => void
}> = ({ label, name, file, currentImage, handleFileChange }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
                {label}
                {name === 'imageFile' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div
                onClick={triggerFileSelect}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition duration-150 h-32"
            >
                {currentImage && !file ? (
                    <>
                        <img
                            src={`${BASE_URL}${currentImage}`}
                            alt="Current"
                            className="h-16 w-auto mb-2 object-contain"
                        />
                        <p className="text-xs text-gray-500">Click to change image</p>
                    </>
                ) : (
                    <>
                        <Upload size={24} className="text-gray-400 mb-1" />
                        <p className="text-sm text-gray-500">
                            {file ? `File: ${file.name}` : "Drag & Drop your files or "}
                            <span className="font-semibold text-blue-600">Browse</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "(Max file size 2MB)"}
                        </p>
                    </>
                )}
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

// --- SERVICE CREATE MANAGER COMPONENT ---
interface ServiceFormManagerProps {
    onNavigateBack: (shouldRefresh: boolean) => void;
    serviceId?: number;
}

const ServiceFormManager: React.FC<ServiceFormManagerProps> = ({ onNavigateBack, serviceId }) => {
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
        slug: '',
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentService, setCurrentService] = useState<Service | null>(null);

    // Fetch service data when editing
    useEffect(() => {
        if (serviceId) {
            fetchServiceData();
        }
    }, [serviceId]);

    const fetchServiceData = async () => {
        setFetching(true);
        try {
            const response = await fetch(`${API_ENDPOINT}/${serviceId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.status === 200 && result.data) {
                const service = result.data;
                setCurrentService(service);
                
                // Populate form with existing data
                setFormData({
                    serviceName: service.name || '',
                    description: service.description || '',
                    scopeTitle: service.scope_title || '',
                    scopeContent: service.scope_content || '',
                    metaTitle: service.meta_title || '',
                    metaKeyword: service.meta_keyword || '',
                    metaDescription: service.meta_description || '',
                    imageFile: null,
                    bannerImageFile: null,
                    active: Boolean(service.is_active),
                    slug: service.slug || '',
                });
            }
        } catch (err) {
            console.error('Error fetching service data:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'Failed to load service data.'}`);
        } finally {
            setFetching(false);
        }
    };

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

    // Handle editor changes
    const handleEditorChange = (field: 'description' | 'scopeContent' | 'metaDescription') => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
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

        // Remove HTML tags for validation
        const plainTextDescription = formData.description.replace(/<[^>]*>/g, '').trim();
        if (!plainTextDescription) {
            newErrors.description = 'Description is required';
        }

        if (!serviceId && !formData.imageFile) {
            newErrors.imageFile = 'Service image is required for new services';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Create service
    const createService = async () => {
        const dataToSend = new FormData();
        dataToSend.append('serviceName', formData.serviceName);
        dataToSend.append('description', formData.description);
        dataToSend.append('scopeTitle', formData.scopeTitle);
        dataToSend.append('scopeContent', formData.scopeContent);
        dataToSend.append('metaTitle', formData.metaTitle);
        dataToSend.append('metaKeyword', formData.metaKeyword);
        dataToSend.append('metaDescription', formData.metaDescription);
        dataToSend.append('active', formData.active.toString());

        if (formData.imageFile) {
            dataToSend.append('imageUpload', formData.imageFile);
        }
        if (formData.bannerImageFile) {
            dataToSend.append('bannerImageUpload', formData.bannerImageFile);
        }

        const response = await fetch(`${API_ENDPOINT}/create`, {
            method: 'POST',
            body: dataToSend,
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        return await response.json();
    };

    // Update service
    const updateService = async () => {
        const dataToSend = new FormData();
        dataToSend.append('serviceName', formData.serviceName);
        dataToSend.append('description', formData.description);
        dataToSend.append('scopeTitle', formData.scopeTitle);
        dataToSend.append('scopeContent', formData.scopeContent);
        dataToSend.append('metaTitle', formData.metaTitle);
        dataToSend.append('metaKeyword', formData.metaKeyword);
        dataToSend.append('metaDescription', formData.metaDescription);
        dataToSend.append('active', formData.active.toString());
        dataToSend.append('slug', formData.slug || currentService?.slug || '');

        if (formData.imageFile) {
            dataToSend.append('imageUpload', formData.imageFile);
        }
        if (formData.bannerImageFile) {
            dataToSend.append('bannerImageUpload', formData.bannerImageFile);
        }

        const response = await fetch(`${API_ENDPOINT}/update/${serviceId}`, {
            method: 'PUT',
            body: dataToSend,
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        return await response.json();
    };

    // Submission handler
    const handleSubmit = useCallback(async (action: 'create' | 'createAndAnother' | 'update') => {
        if (!validateForm()) {
            alert('Please fix the form errors before submitting.');
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            let result;
            
            if (serviceId) {
                // Update existing service
                result = await updateService();
                if (result.status === 200) {
                    alert(`Service updated successfully!`);
                    onNavigateBack(true);
                } else {
                    throw new Error(result.error || 'Failed to update service.');
                }
            } else {
                // Create new service
                result = await createService();
                if (result.status === 201 || result.status === 200) {
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
                            slug: '',
                        });
                        setCurrentService(null);
                    } else {
                        // Navigate back to the list and refresh
                        onNavigateBack(true);
                    }
                } else {
                    throw new Error(result.error || 'Failed to create service.');
                }
            }

        } catch (err) {
            console.error('Submission error:', err);
            alert(`Error ${serviceId ? 'updating' : 'creating'} service: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
        } finally {
            setLoading(false);
        }
    }, [formData, serviceId, onNavigateBack]);

    if (fetching) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading service data...</span>
            </div>
        );
    }

    const title = serviceId ? 'Edit Service' : 'Create Service';
    const submitButtonText = serviceId ? 'Update Service' : 'Create Service';

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                {serviceId && (
                    <button
                        onClick={() => onNavigateBack(false)}
                        className="flex items-center text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={20} className="mr-1" />
                        Back to List
                    </button>
                )}
            </div>

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
                            <div className={`mt-1 ${errors.description ? 'border border-red-500 rounded-lg' : ''}`}>
                                <JoditEditorWrapper
                                    value={formData.description}
                                    onChange={handleEditorChange('description')}
                                    placeholder="Enter service description..."
                                    height={250}
                                />
                            </div>
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
                            <div className="mt-1">
                                <JoditEditorWrapper
                                    value={formData.scopeContent}
                                    onChange={handleEditorChange('scopeContent')}
                                    placeholder="Enter scope of work content..."
                                    height={250}
                                />
                            </div>
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

                    {/* --- ROW 4: Meta Description and Slug --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700">
                                Meta Description
                            </label>
                            <div className="mt-1">
                                <JoditEditorWrapper
                                    value={formData.metaDescription}
                                    onChange={handleEditorChange('metaDescription')}
                                    placeholder="Enter meta description..."
                                    height={150}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                                Slug (URL Friendly Name)
                            </label>
                            <input
                                type="text"
                                id="slug"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="auto-generated-from-name"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Leave empty to auto-generate from service name
                            </p>
                        </div>
                    </div>

                    {/* --- ROW 5: Image Uploads / Active Toggle --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FileUploadArea
                            label="Service Image"
                            name="imageFile"
                            file={formData.imageFile}
                            currentImage={currentService?.image_url || null}
                            handleFileChange={handleFileChange}
                        />
                        {errors.imageFile && (
                            <p className="text-sm text-red-600 md:col-span-3">{errors.imageFile}</p>
                        )}

                        <FileUploadArea
                            label="Banner Image"
                            name="bannerImageFile"
                            file={formData.bannerImageFile}
                            currentImage={currentService?.banner_image_url || null}
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
                        
                        {!serviceId && (
                            <button
                                type="button"
                                onClick={() => handleSubmit('createAndAnother')}
                                className="flex items-center bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                                disabled={loading}
                            >
                                <Plus size={18} className="mr-1" />
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Another'}
                            </button>
                        )}
                        
                        <button
                            type="button"
                            onClick={() => handleSubmit(serviceId ? 'update' : 'create')}
                            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
                            disabled={loading}
                        >
                            <Save size={18} className="mr-1" />
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : submitButtonText}
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
    const [editServiceId, setEditServiceId] = useState<number | null>(null);
    const [listKey, setListKey] = useState<number>(0);

    const handleNavigateToCreate = () => {
        setEditServiceId(null);
        setViewMode('create');
    };

    const handleNavigateToEdit = (id: number) => {
        setEditServiceId(id);
        setViewMode('edit');
    };

    const handleNavigateBack = (shouldRefresh: boolean) => {
        setViewMode('list');
        setEditServiceId(null);
        if (shouldRefresh) {
            setListKey(prev => prev + 1);
        }
    };

    const breadcrumbs = useMemo(() => {
        let currentView = 'List';
        if (viewMode === 'create') currentView = 'Create';
        if (viewMode === 'edit') currentView = 'Edit';

        return (
            <div className="flex items-center text-sm text-gray-500 mb-4">
                <FileText size={16} className="mr-1" />
                <span>Services</span>
                <ChevronRight size={16} className="mx-1" />
                <span className="font-medium text-gray-700">{currentView}</span>
            </div>
        );
    }, [viewMode]);

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
                        onNavigateToEdit={handleNavigateToEdit}
                    />
                )}

                {(viewMode === 'create' || viewMode === 'edit') && (
                    <ServiceFormManager
                        onNavigateBack={handleNavigateBack}
                        serviceId={editServiceId || undefined}
                    />
                )}
            </div>
        </AdminLayout>
    );
};

export default App;