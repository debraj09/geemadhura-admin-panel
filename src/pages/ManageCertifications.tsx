import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ChevronRight, FileText, Search, Eye, Download, Mail, Phone, MapPin,
    Building, CheckCircle, XCircle, Clock, AlertCircle, Filter, 
    ChevronUp, ChevronDown, Loader2, RefreshCw, MoreVertical, 
    User, Calendar, FileUp, Check, X, MessageSquare, Send,
    ArrowLeft, Printer, ExternalLink, Shield
} from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- TYPESCRIPT INTERFACES ---
interface Application {
    id: number;
    application_id: string;
    service_id: number;
    service_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_address: string | null;
    customer_city: string | null;
    customer_state: string | null;
    customer_pincode: string | null;
    business_name: string | null;
    business_type: string | null;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_more_info';
    admin_notes: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    document_count?: number;
    last_status?: string;
}

interface Document {
    id: number;
    application_id: string;
    document_type: string;
    document_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    verified: boolean;
    verification_notes: string | null;
    uploaded_at: string;
}

interface HistoryItem {
    id: number;
    application_id: string;
    status: string;
    notes: string;
    changed_by: string | null;
    changed_at: string;
}

interface SortConfig {
    key: keyof Application | null;
    direction: 'ascending' | 'descending';
}

interface StatusBadgeProps {
    status: Application['status'];
}

interface ApplicationDetailsModalProps {
    application: Application | null;
    documents: Document[];
    history: HistoryItem[];
    onClose: () => void;
    onStatusChange: (applicationId: string, newStatus: Application['status'], notes: string) => void;
}

interface StatusChangeModalProps {
    applicationId: string;
    currentStatus: Application['status'];
    onClose: () => void;
    onConfirm: (newStatus: Application['status'], notes: string) => void;
}

// --- BASE URL CONFIGURATION ---
const BASE_URL: string = 'https://geemadhura.braventra.in';
const API_ENDPOINT: string = `${BASE_URL}/api/serviceApplications`;
// ----------------------------------------

// --- STATUS BADGE COMPONENT ---
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} />, label: 'Pending' },
        under_review: { color: 'bg-blue-100 text-blue-800', icon: <AlertCircle size={14} />, label: 'Under Review' },
        approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} />, label: 'Approved' },
        rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle size={14} />, label: 'Rejected' },
        needs_more_info: { color: 'bg-orange-100 text-orange-800', icon: <FileUp size={14} />, label: 'Needs More Info' }
    };

    const config = statusConfig[status];

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
        </span>
    );
};

// --- STATUS CHANGE MODAL ---
const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ 
    applicationId, 
    currentStatus, 
    onClose, 
    onConfirm 
}) => {
    const [newStatus, setNewStatus] = useState<Application['status']>(currentStatus);
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const statusOptions: Array<{ value: Application['status']; label: string }> = [
        { value: 'pending', label: 'Pending' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'needs_more_info', label: 'Needs More Information' }
    ];

    const handleSubmit = () => {
        if (!newStatus.trim() || !notes.trim()) {
            alert('Please select a status and add notes');
            return;
        }
        setIsSubmitting(true);
        onConfirm(newStatus, notes);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Change Application Status</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                            Application ID: <span className="font-semibold">{applicationId}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                            Current Status: <StatusBadge status={currentStatus} />
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Status *
                            </label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as Application['status'])}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Admin Notes *
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Add notes about this status change..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin mx-2" />
                            ) : (
                                'Update Status'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- APPLICATION DETAILS MODAL ---
const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
    application,
    documents,
    history,
    onClose,
    onStatusChange
}) => {
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details');

    if (!application) return null;

    const handleStatusUpdate = (newStatus: Application['status'], notes: string) => {
        onStatusChange(application.application_id, newStatus, notes);
        setShowStatusModal(false);
    };

    const downloadDocument = async (documentPath: string, documentName: string) => {
        try {
            const response = await fetch(`${BASE_URL}${documentPath}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = documentName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to download document');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Error downloading document');
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="border-b px-6 py-4 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">
                                Application Details
                            </h3>
                            <p className="text-sm text-gray-500">
                                ID: {application.application_id} • {application.service_name}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <StatusBadge status={application.status} />
                            <button
                                onClick={() => setShowStatusModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                                Change Status
                            </button>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b px-6">
                        <div className="flex space-x-6">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Details
                            </button>
                            <button
                                onClick={() => setActiveTab('documents')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Documents ({documents.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                History ({history.length})
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[60vh] p-6">
                        {activeTab === 'details' && (
                            <div className="space-y-6">
                                {/* Customer Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                                            <User size={16} className="mr-2" />
                                            Customer Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Name:</span> {application.customer_name}</p>
                                            <p><span className="font-medium">Email:</span> {application.customer_email}</p>
                                            <p><span className="font-medium">Phone:</span> {application.customer_phone}</p>
                                            <p><span className="font-medium">Address:</span> {application.customer_address || 'N/A'}</p>
                                            <p><span className="font-medium">City:</span> {application.customer_city || 'N/A'}</p>
                                            <p><span className="font-medium">State:</span> {application.customer_state || 'N/A'}</p>
                                            <p><span className="font-medium">Pincode:</span> {application.customer_pincode || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Business Information */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                                            <Building size={16} className="mr-2" />
                                            Business Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Business Name:</span> {application.business_name || 'N/A'}</p>
                                            <p><span className="font-medium">Business Type:</span> {application.business_type || 'N/A'}</p>
                                            <p><span className="font-medium">Service:</span> {application.service_name}</p>
                                            <p><span className="font-medium">Service ID:</span> {application.service_id}</p>
                                            <p><span className="font-medium">Assigned To:</span> {application.assigned_to || 'Not assigned'}</p>
                                            <p><span className="font-medium">Admin Notes:</span> {application.admin_notes || 'No notes'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div>
                                    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                                        <Calendar size={16} className="mr-2" />
                                        Timeline
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Created At:</span>
                                            <span className="font-medium">
                                                {new Date(application.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Last Updated:</span>
                                            <span className="font-medium">
                                                {new Date(application.updated_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="space-y-4">
                                {documents.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No documents uploaded</p>
                                ) : (
                                    documents.map(doc => (
                                        <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{doc.document_name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {doc.document_type} • {(doc.file_size / 1024).toFixed(2)} KB • {doc.file_type}
                                                    </p>
                                                    <div className="flex items-center mt-1">
                                                        <span className={`text-xs px-2 py-1 rounded ${doc.verified
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {doc.verified ? 'Verified' : 'Not Verified'}
                                                        </span>
                                                        {doc.verification_notes && (
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                {doc.verification_notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => downloadDocument(doc.file_path, doc.document_name)}
                                                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No history available</p>
                                ) : (
                                    history.map(item => (
                                        <div key={item.id} className="border-l-2 border-blue-500 pl-4 py-2">
                                            <div className="flex justify-between">
                                                <div>
                                                    <StatusBadge status={item.status as Application['status']} />
                                                    <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                                                </div>
                                                <div className="text-right text-xs text-gray-500">
                                                    <p>{new Date(item.changed_at).toLocaleString()}</p>
                                                    <p>By: {item.changed_by || 'System'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t px-6 py-4 flex justify-between">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Close
                        </button>
                        <div className="space-x-3">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                <Printer size={16} className="inline mr-1" /> Print
                            </button>
                            <button
                                onClick={() => {
                                    // Email customer functionality
                                    window.location.href = `mailto:${application.customer_email}`;
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Mail size={16} className="inline mr-1" /> Email Customer
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showStatusModal && (
                <StatusChangeModal
                    applicationId={application.application_id}
                    currentStatus={application.status}
                    onClose={() => setShowStatusModal(false)}
                    onConfirm={handleStatusUpdate}
                />
            )}
        </>
    );
};

// --- SORTABLE HEADER ---
interface SortableHeaderProps {
    label: string;
    sortKey: keyof Application;
    sortConfig: SortConfig;
    requestSort: (key: keyof Application) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ label, sortKey, sortConfig, requestSort }) => {
    const getSortIcon = () => {
        if (sortConfig.key !== sortKey) {
            return null;
        }
        return sortConfig.direction === 'ascending' 
            ? <ChevronUp size={12} className="ml-1" /> 
            : <ChevronDown size={12} className="ml-1" />;
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

// --- MAIN ADMIN APPLICATIONS COMPONENT ---
const AdminApplicationsManager: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'descending' });
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ 
        start: '', 
        end: '' 
    });
    
    // Modal states
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [applicationDocuments, setApplicationDocuments] = useState<Document[]>([]);
    const [applicationHistory, setApplicationHistory] = useState<HistoryItem[]>([]);
    
    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        needs_more_info: 0
    });

    // Fetch applications
    const fetchApplications = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams({
                page: '1',
                limit: '100',
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(serviceFilter !== 'all' && { service_id: serviceFilter }),
                ...(dateRange.start && { startDate: dateRange.start }),
                ...(dateRange.end && { endDate: dateRange.end }),
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`${API_ENDPOINT}/admin/applications?${queryParams}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
            }

            const result = await response.json();
            setApplications(result.data || []);
            setFilteredApplications(result.data || []);
            
            // Calculate statistics
            if (result.data) {
                const statsData = result.data.reduce((acc: any, app: Application) => {
                    acc.total++;
                    acc[app.status]++;
                    return acc;
                }, { total: 0, pending: 0, under_review: 0, approved: 0, rejected: 0, needs_more_info: 0 });
                setStats(statsData);
            }

        } catch (err) {
            console.error('Error fetching applications:', err);
            setError(`Failed to load applications: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, serviceFilter, dateRange, searchTerm]);

    // Load data on component mount
    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    // Filter applications
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredApplications(applications);
            return;
        }

        const filtered = applications.filter(app =>
            app.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.customer_phone.includes(searchTerm) ||
            app.application_id.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredApplications(filtered);
    }, [searchTerm, applications]);

    // Fetch application details
    // Corrected fetchApplicationDetails function
const fetchApplicationDetails = async (applicationId: string) => {
    try {
        // Fetch all details (application, documents, history) in one call
        const response = await fetch(`${API_ENDPOINT}/admin/application/${applicationId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 200 && result.data) {
            // Data is already structured as { application, documents, history }
            setSelectedApplication(result.data.application);
            setApplicationDocuments(result.data.documents || []);
            setApplicationHistory(result.data.history || []);
        } else {
            throw new Error(result.error || 'Failed to load application details');
        }
    } catch (error) {
        console.error('Error fetching application details:', error);
        alert('Failed to load application details. Please check the console for more information.');
    }
};

    // Handle status change
    const handleStatusChange = async (applicationId: string, newStatus: Application['status'], notes: string) => {
        try {
            const response = await fetch(`${API_ENDPOINT}/admin/application/${applicationId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    admin_notes: notes,
                    assigned_to: 'Admin' // You can change this to dynamic user
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.status === 200) {
                // Update local state
                setApplications(prev => prev.map(app =>
                    app.application_id === applicationId
                        ? { ...app, status: newStatus, admin_notes: notes }
                        : app
                ));
                
                alert('Status updated successfully!');
                fetchApplications(); // Refresh data
            } else {
                throw new Error(result.error || 'Failed to update status');
            }

        } catch (err) {
            console.error('Error updating status:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'Failed to update status'}`);
        }
    };

    // Bulk actions
    const handleBulkStatusChange = async (newStatus: Application['status']) => {
        const selectedIds = Object.keys(selectedRows)
            .filter(id => selectedRows[parseInt(id)])
            .map(id => applications.find(app => app.id === parseInt(id))?.application_id)
            .filter(Boolean);

        if (selectedIds.length === 0) {
            alert('Please select applications first');
            return;
        }

        if (!window.confirm(`Change status to ${newStatus} for ${selectedIds.length} applications?`)) {
            return;
        }

        try {
            const notes = `Bulk status change to ${newStatus}`;
            const promises = selectedIds.map(appId =>
                fetch(`${API_ENDPOINT}/admin/application/${appId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus, admin_notes: notes })
                })
            );

            await Promise.all(promises);
            alert('Bulk status update completed!');
            fetchApplications();
            setSelectedRows({});
        } catch (error) {
            console.error('Error in bulk update:', error);
            alert('Failed to update statuses');
        }
    };

    // Sorting
    const requestSort = (key: keyof Application) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedApplications = useMemo(() => {
        if (loading || error) return [];

        let sortableItems = [...filteredApplications];
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
    }, [filteredApplications, sortConfig, loading, error]);

    // Row selection
    const toggleRowSelection = (id: number) => {
        setSelectedRows(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const toggleSelectAll = () => {
        const allSelected = filteredApplications.length > 0 && 
            filteredApplications.every(app => selectedRows[app.id]);
        
        if (allSelected) {
            setSelectedRows({});
        } else {
            const newSelection: Record<number, boolean> = {};
            filteredApplications.forEach(app => {
                newSelection[app.id] = true;
            });
            setSelectedRows(newSelection);
        }
    };

    // Get unique services for filter
    const uniqueServices = useMemo(() => {
        const services = Array.from(new Set(applications.map(app => app.service_name)));
        return services;
    }, [applications]);

    return (
        <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total Applications</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-gray-500">Pending</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-2xl font-bold text-blue-600">{stats.under_review}</div>
                    <div className="text-sm text-gray-500">Under Review</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                    <div className="text-sm text-gray-500">Approved</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                    <div className="text-sm text-gray-500">Rejected</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                    <div className="text-2xl font-bold text-orange-600">{stats.needs_more_info}</div>
                    <div className="text-sm text-gray-500">Needs Info</div>
                </div>
            </div>

            {/* Header and Action Buttons */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Certification Applications</h1>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchApplications}
                        className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-md transition duration-150"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> 
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-2xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="needs_more_info">Needs More Info</option>
                        </select>
                    </div>

                    {/* Service Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                        <select
                            value={serviceFilter}
                            onChange={(e) => setServiceFilter(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Services</option>
                            {uniqueServices.map(service => (
                                <option key={service} value={service}>{service}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Filters */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Bulk Actions */}
                {Object.keys(selectedRows).filter(id => selectedRows[parseInt(id)]).length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">
                                {Object.keys(selectedRows).filter(id => selectedRows[parseInt(id)]).length} applications selected
                            </span>
                            <div className="space-x-2">
                                <button
                                    onClick={() => handleBulkStatusChange('approved')}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                                >
                                    Mark Approved
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('rejected')}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                                >
                                    Mark Rejected
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('under_review')}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                >
                                    Mark Under Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone or application ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Checkbox */}
                                <th scope="col" className="px-3 py-3 w-1/12">
                                    <input
                                        type="checkbox"
                                        checked={filteredApplications.length > 0 && 
                                            filteredApplications.every(app => selectedRows[app.id])}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </th>

                                <SortableHeader label="ID" sortKey="application_id" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Customer" sortKey="customer_name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Service" sortKey="service_name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Created" sortKey="created_at" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Updated" sortKey="updated_at" sortConfig={sortConfig} requestSort={requestSort} />
                                
                                <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-blue-600 text-lg">
                                        <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" /> 
                                        Loading applications...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-red-600 text-lg bg-red-50">
                                        <AlertCircle className="w-6 h-6 inline-block mr-2" /> 
                                        {error}
                                    </td>
                                </tr>
                            ) : filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 text-lg">
                                        No applications found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                sortedApplications.map((application) => (
                                    <tr key={application.id} className="hover:bg-gray-50 transition duration-150">
                                        {/* Checkbox */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedRows[application.id]}
                                                onChange={() => toggleRowSelection(application.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </td>

                                        {/* Application ID */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {application.application_id}
                                        </td>

                                        {/* Customer Info */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {application.customer_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {application.customer_email}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {application.customer_phone}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Service */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {application.service_name}
                                        </td>

                                        {/* Status */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <StatusBadge status={application.status} />
                                        </td>

                                        {/* Created At */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(application.created_at).toLocaleDateString()}
                                            <div className="text-xs text-gray-400">
                                                {new Date(application.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>

                                        {/* Updated At */}
                                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(application.updated_at).toLocaleDateString()}
                                            <div className="text-xs text-gray-400">
                                                {new Date(application.updated_at).toLocaleTimeString()}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => fetchApplicationDetails(application.application_id)}
                                                className="p-1 rounded-full text-blue-600 hover:bg-blue-100 transition duration-150"
                                                title="View Details"
                                            >
                                                <Eye size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    window.location.href = `mailto:${application.customer_email}`;
                                                }}
                                                className="p-1 rounded-full text-green-600 hover:bg-green-100 transition duration-150"
                                                title="Email Customer"
                                            >
                                                <Mail size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    window.location.href = `tel:${application.customer_phone}`;
                                                }}
                                                className="p-1 rounded-full text-purple-600 hover:bg-purple-100 transition duration-150"
                                                title="Call Customer"
                                            >
                                                <Phone size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 text-sm text-gray-600 flex justify-between items-center">
                    <span>
                        Showing {filteredApplications.length} of {applications.length} applications
                    </span>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                            Last refreshed: {new Date().toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Application Details Modal */}
            {selectedApplication && (
                <ApplicationDetailsModal
                    application={selectedApplication}
                    documents={applicationDocuments}
                    history={applicationHistory}
                    onClose={() => setSelectedApplication(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </>
    );
};

// --- PARENT COMPONENT ---
const ManageCertifications: React.FC = () => {
    const breadcrumbs = (
        <div className="flex items-center text-sm text-gray-500 mb-4">
            <FileText size={16} className="mr-1" />
            <span>Certifications</span>
            <ChevronRight size={16} className="mx-1" />
            <span className="font-medium text-gray-700">Applications</span>
        </div>
    );

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                {breadcrumbs}
                <AdminApplicationsManager />
            </div>
        </AdminLayout>
    );
};

export default ManageCertifications;