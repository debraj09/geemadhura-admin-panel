import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ChevronRight, FileText, Search, Eye, Download, Mail, Phone, MapPin,
    Building, CheckCircle, XCircle, Clock, AlertCircle, Filter, 
    ChevronUp, ChevronDown, Loader2, RefreshCw, MoreVertical, 
    User, Calendar, FileUp, Check, X, MessageSquare, Send,
    ArrowLeft, Printer, ExternalLink, Shield, Paperclip, Trash2, File
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
    admin_document_path?: string | null;
    admin_document_name?: string | null;
    admin_document_type?: string | null;
    admin_document_size?: number | null;
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
    uploaded_by?: string | null;
}

interface AdminDocument {
    id: number;
    application_id: string;
    document_name: string;
    document_type: string;
    file_path: string;
    file_size: number;
    file_type: string;
    uploaded_by: string | null;
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
    adminDocuments: AdminDocument[];
    history: HistoryItem[];
    onClose: () => void;
    onStatusChange: (applicationId: string, newStatus: Application['status'], notes: string, documentData?: any) => void;
    onRefresh: () => void;
}

interface StatusChangeModalProps {
    applicationId: string;
    currentStatus: Application['status'];
    onClose: () => void;
    onConfirm: (newStatus: Application['status'], notes: string, documentData?: any) => void;
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

// --- STATUS CHANGE MODAL WITH FILE UPLOAD ---
const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ 
    applicationId, 
    currentStatus, 
    onClose, 
    onConfirm 
}) => {
    const [newStatus, setNewStatus] = useState<Application['status']>(currentStatus);
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentName, setDocumentName] = useState<string>('');
    const [documentType, setDocumentType] = useState<string>('certificate');
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);

    const statusOptions: Array<{ value: Application['status']; label: string }> = [
        { value: 'pending', label: 'Pending' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'needs_more_info', label: 'Needs More Information' }
    ];

    const documentTypeOptions = [
        { value: 'certificate', label: 'Certificate' },
        { value: 'approval_letter', label: 'Approval Letter' },
        { value: 'rejection_letter', label: 'Rejection Letter' },
        { value: 'information_request', label: 'Information Request' },
        { value: 'other', label: 'Other Document' }
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('File size must be less than 10MB');
                return;
            }
            
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Please upload only PDF, DOC, DOCX, JPG, PNG, GIF, or WEBP files');
                return;
            }
            
            setSelectedFile(file);
            if (!documentName) {
                setDocumentName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
            }
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setDocumentName('');
        setDocumentType('certificate');
    };

    const simulateUploadProgress = () => {
        setIsUploading(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 100);
        return interval;
    };

    const handleSubmit = async () => {
        if (!newStatus.trim() || !notes.trim()) {
            alert('Please select a status and add notes');
            return;
        }

        setIsSubmitting(true);
        
        if (selectedFile) {
            const progressInterval = simulateUploadProgress();
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('status', newStatus);
            formData.append('admin_notes', notes);
            formData.append('assigned_to', 'Admin');
            formData.append('admin_document', selectedFile);
            formData.append('document_name', documentName || selectedFile.name);
            formData.append('document_type', documentType);

            try {
                const response = await fetch(
                    `${API_ENDPOINT}/admin/application/${applicationId}/status-with-document`,
                    {
                        method: 'PUT',
                        body: formData,
                        // Note: Don't set Content-Type header for FormData - browser sets it automatically
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update status');
                }

                const result = await response.json();
                clearInterval(progressInterval);
                setUploadProgress(100);

                // Call the original onConfirm with additional data
                onConfirm(newStatus, notes, {
                    hasDocument: true,
                    documentName: documentName,
                    documentType: documentType,
                    fileName: selectedFile.name
                });

                // Small delay to show 100% progress
                setTimeout(() => {
                    alert(result.message || 'Status updated successfully with document!');
                    onClose();
                }, 500);

            } catch (error) {
                clearInterval(progressInterval);
                console.error('Error updating status with document:', error);
                alert(`Error: ${error instanceof Error ? error.message : 'Failed to update status'}`);
                setIsSubmitting(false);
                setIsUploading(false);
                setUploadProgress(0);
            }
        } else {
            // No file upload, just status change
            onConfirm(newStatus, notes);
            onClose();
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Change Application Status</h3>
                        <button 
                            onClick={onClose} 
                            className="text-gray-400 hover:text-gray-600"
                            disabled={isSubmitting}
                        >
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
                                disabled={isSubmitting}
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
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* File Upload Section */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                            <div className="text-center">
                                <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="mt-4">
                                    <label className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition duration-150 inline-block`}>
                                        <span>Upload Document (Optional)</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Upload certificates, approval letters, etc. Max 10MB
                                    </p>
                                </div>
                            </div>

                            {selectedFile && (
                                <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {selectedFile.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Document Name Input */}
                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Document Display Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={documentName}
                                                    onChange={(e) => setDocumentName(e.target.value)}
                                                    placeholder="Enter document name"
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                    disabled={isSubmitting}
                                                />
                                            </div>

                                            {/* Document Type Select */}
                                            <div className="mt-2">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Document Type
                                                </label>
                                                <select
                                                    value={documentType}
                                                    onChange={(e) => setDocumentType(e.target.value)}
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                    disabled={isSubmitting}
                                                >
                                                    {documentTypeOptions.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        {!isSubmitting && (
                                            <button
                                                onClick={removeFile}
                                                type="button"
                                                className="ml-2 text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Upload Progress */}
                                    {isUploading && (
                                        <div className="mt-3">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1 text-center">
                                                {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status-Specific Guidance */}
                        {newStatus === 'approved' && !selectedFile && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-start">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-800">
                                            Recommendation for Approved Status
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Consider uploading the certificate or approval letter for the customer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {newStatus === 'rejected' && !selectedFile && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-start">
                                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800">
                                            Recommendation for Rejected Status
                                        </p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Consider uploading a rejection letter explaining the reasons.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !notes.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    {selectedFile ? 'Processing...' : 'Updating...'}
                                </>
                            ) : (
                                selectedFile ? 'Update Status & Upload Document' : 'Update Status'
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
    adminDocuments,
    history,
    onClose,
    onStatusChange,
    onRefresh
}) => {
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'admin-documents' | 'history'>('details');
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    if (!application) return null;

    const handleStatusUpdate = (newStatus: Application['status'], notes: string, documentData?: any) => {
        onStatusChange(application.application_id, newStatus, notes, documentData);
        setShowStatusModal(false);
    };

    const downloadDocument = async (documentPath: string, documentName: string) => {
        try {
            setDownloadingFile(documentName);
            
            // Check if it's an admin document or regular document
            const fullPath = documentPath.startsWith('http') ? documentPath : `${BASE_URL}${documentPath}`;
            const response = await fetch(fullPath);
            
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
                console.error('Download failed:', response.status, response.statusText);
                alert('Failed to download document. The file might not exist on the server.');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Error downloading document. Please check the console for details.');
        } finally {
            setDownloadingFile(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const deleteAdminDocument = async (documentId: number, documentName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_ENDPOINT}/admin/document/${documentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message || 'Document deleted successfully');
                onRefresh(); // Refresh the data
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete document');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to delete document'}`);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
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
                                Customer Documents ({documents.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('admin-documents')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'admin-documents'
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Admin Documents ({adminDocuments.length})
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

                                {/* Admin Documents Summary */}
                                {adminDocuments.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                                            <Shield size={16} className="mr-2" />
                                            Admin Uploaded Documents
                                        </h4>
                                        <div className="space-y-2">
                                            {adminDocuments.slice(0, 3).map(doc => (
                                                <div key={doc.id} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-700 truncate">
                                                        <File size={12} className="inline mr-1" />
                                                        {doc.document_name}
                                                    </span>
                                                    <button
                                                        onClick={() => downloadDocument(doc.file_path, doc.document_name)}
                                                        className="text-green-600 hover:text-green-800 text-xs"
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            ))}
                                            {adminDocuments.length > 3 && (
                                                <p className="text-xs text-gray-500">
                                                    + {adminDocuments.length - 3} more documents. View in "Admin Documents" tab.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="space-y-4">
                                {documents.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="text-gray-500 mt-2">No documents uploaded by customer</p>
                                    </div>
                                ) : (
                                    documents.map(doc => (
                                        <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                            <div className="flex justify-between items-center">
                                                <div className="flex-1">
                                                    <div className="flex items-center">
                                                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                                        <div>
                                                            <p className="font-medium text-gray-900">{doc.document_name}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {doc.document_type} • {formatFileSize(doc.file_size)} • {doc.file_type}
                                                            </p>
                                                            <div className="flex items-center mt-1 space-x-2">
                                                                <span className={`text-xs px-2 py-1 rounded ${doc.verified
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {doc.verified ? 'Verified' : 'Not Verified'}
                                                                </span>
                                                                {doc.verification_notes && (
                                                                    <span className="text-xs text-gray-500">
                                                                        {doc.verification_notes}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => downloadDocument(doc.file_path, doc.document_name)}
                                                    disabled={downloadingFile === doc.document_name}
                                                    className="ml-4 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center"
                                                >
                                                    {downloadingFile === doc.document_name ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Download size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'admin-documents' && (
                            <div className="space-y-4">
                                {adminDocuments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Shield className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="text-gray-500 mt-2">No admin documents uploaded yet</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Upload documents when changing application status
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-700">
                                                <Shield size={14} className="inline mr-1" />
                                                These documents were uploaded by administrators for this application.
                                            </p>
                                        </div>
                                        {adminDocuments.map(doc => (
                                            <div key={doc.id} className="border border-green-200 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-start">
                                                            <Shield className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                                                            <div>
                                                                <p className="font-medium text-green-900">{doc.document_name}</p>
                                                                <div className="flex flex-wrap gap-2 mt-1">
                                                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                                                        {doc.document_type}
                                                                    </span>
                                                                    <span className="text-xs text-gray-600">
                                                                        {formatFileSize(doc.file_size)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-600">
                                                                        {doc.file_type}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2">
                                                                    <p className="text-xs text-gray-500">
                                                                        Uploaded by: {doc.uploaded_by || 'Admin'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Uploaded at: {new Date(doc.uploaded_at).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2 ml-4">
                                                        <button
                                                            onClick={() => downloadDocument(doc.file_path, doc.document_name)}
                                                            disabled={downloadingFile === doc.document_name}
                                                            className="px-3 py-2 border border-green-300 rounded-lg hover:bg-green-100 text-green-700 text-sm flex items-center"
                                                            title="Download Document"
                                                        >
                                                            {downloadingFile === doc.document_name ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <Download size={16} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteAdminDocument(doc.id, doc.document_name)}
                                                            className="px-3 py-2 border border-red-300 rounded-lg hover:bg-red-100 text-red-600 text-sm"
                                                            title="Delete Document"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No history available</p>
                                ) : (
                                    <div className="space-y-3">
                                        {history.map(item => (
                                            <div key={item.id} className="border-l-2 border-blue-500 pl-4 py-2 hover:bg-gray-50 rounded-r-lg">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <div className="flex items-center mb-1">
                                                            <StatusBadge status={item.status as Application['status']} />
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                {new Date(item.changed_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600">{item.notes}</p>
                                                        {item.notes.toLowerCase().includes('document') && (
                                                            <div className="flex items-center mt-1 text-xs text-green-600">
                                                                <Paperclip size={12} className="mr-1" />
                                                                Document attached
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right text-xs text-gray-500">
                                                        <p>{new Date(item.changed_at).toLocaleTimeString()}</p>
                                                        <p className="mt-1">
                                                            By: <span className="font-medium">{item.changed_by || 'System'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                                    window.location.href = `mailto:${application.customer_email}?subject=Application Update - ${application.application_id}`;
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
            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50"
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
    const [adminDocuments, setAdminDocuments] = useState<AdminDocument[]>([]);
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
            app.application_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.service_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredApplications(filtered);
    }, [searchTerm, applications]);

    // Fetch application details
    const fetchApplicationDetails = async (applicationId: string) => {
        try {
            // Fetch application details, documents, history, and admin documents
            const [detailsResponse, adminDocsResponse] = await Promise.all([
                fetch(`${API_ENDPOINT}/admin/application/${applicationId}`),
                fetch(`${API_ENDPOINT}/admin/application/${applicationId}/admin-documents`)
            ]);

            if (!detailsResponse.ok) {
                throw new Error(`HTTP error! status: ${detailsResponse.status}`);
            }

            const detailsResult = await detailsResponse.json();
            let adminDocsResult = null;

            if (adminDocsResponse.ok) {
                adminDocsResult = await adminDocsResponse.json();
            }

            if (detailsResult.status === 200 && detailsResult.data) {
                setSelectedApplication(detailsResult.data.application);
                setApplicationDocuments(detailsResult.data.documents || []);
                setApplicationHistory(detailsResult.data.history || []);
                
                // Set admin documents
                if (adminDocsResult && adminDocsResult.status === 200 && adminDocsResult.data) {
                    // Combine separate documents and main document
                    const allAdminDocs = [
                        ...(adminDocsResult.data.separate_documents || []),
                        ...(adminDocsResult.data.main_document ? [{
                            ...adminDocsResult.data.main_document,
                            document_name: adminDocsResult.data.main_document.admin_document_name,
                            file_path: adminDocsResult.data.main_document.admin_document_path,
                            file_size: adminDocsResult.data.main_document.admin_document_size,
                            file_type: adminDocsResult.data.main_document.admin_document_type,
                            uploaded_by: 'Admin'
                        }] : [])
                    ];
                    setAdminDocuments(allAdminDocs);
                } else {
                    setAdminDocuments([]);
                }
            } else {
                throw new Error(detailsResult.error || 'Failed to load application details');
            }
        } catch (error) {
            console.error('Error fetching application details:', error);
            alert('Failed to load application details. Please check the console for more information.');
        }
    };

    // Handle status change
    const handleStatusChange = async (applicationId: string, newStatus: Application['status'], notes: string, documentData?: any) => {
        try {
            let response;
            
            if (documentData?.hasDocument) {
                // Status change with document upload already handled in StatusChangeModal
                // Just refresh the data
                fetchApplications();
                if (selectedApplication?.application_id === applicationId) {
                    fetchApplicationDetails(applicationId);
                }
            } else {
                // Regular status change without document
                response = await fetch(`${API_ENDPOINT}/admin/application/${applicationId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: newStatus,
                        admin_notes: notes,
                        assigned_to: 'Admin'
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
                    
                    // Refresh details if this application is currently selected
                    if (selectedApplication?.application_id === applicationId) {
                        fetchApplicationDetails(applicationId);
                    }
                    
                    fetchApplications(); // Refresh list
                } else {
                    throw new Error(result.error || 'Failed to update status');
                }
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
            .filter(Boolean) as string[];

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
                    body: JSON.stringify({ status: newStatus, admin_notes: notes, assigned_to: 'Admin' })
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

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

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
        const services = Array.from(new Set(applications.map(app => app.service_name).filter(Boolean)));
        return services;
    }, [applications]);

    // Reset filters
    const resetFilters = () => {
        setStatusFilter('all');
        setServiceFilter('all');
        setDateRange({ start: '', end: '' });
        setSearchTerm('');
    };

    return (
        <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total Applications</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-gray-500">Pending</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-blue-600">{stats.under_review}</div>
                    <div className="text-sm text-gray-500">Under Review</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                    <div className="text-sm text-gray-500">Approved</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                    <div className="text-sm text-gray-500">Rejected</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-orange-600">{stats.needs_more_info}</div>
                    <div className="text-sm text-gray-500">Needs Info</div>
                </div>
            </div>

            {/* Header and Action Buttons */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Manage Services</h1>
                    <p className="text-gray-500 mt-1">Manage and review all services applications</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={resetFilters}
                        className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-md transition duration-150"
                    >
                        <RefreshCw size={18} className="mr-2" /> 
                        Reset Filters
                    </button>
                    <button
                        onClick={fetchApplications}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> 
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-2xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, application ID, or service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    />
                </div>

                {/* Bulk Actions */}
                {Object.keys(selectedRows).filter(id => selectedRows[parseInt(id)]).length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">
                                <CheckCircle size={16} className="inline mr-1" />
                                {Object.keys(selectedRows).filter(id => selectedRows[parseInt(id)]).length} applications selected
                            </span>
                            <div className="space-x-2">
                                <button
                                    onClick={() => handleBulkStatusChange('approved')}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                                >
                                    Mark Approved
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('rejected')}
                                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                                >
                                    Mark Rejected
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('under_review')}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                                >
                                    Mark Under Review
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange('needs_more_info')}
                                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200 transition-colors"
                                >
                                    Mark Needs Info
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
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
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" /> 
                                            <p className="text-blue-600 text-lg">Loading applications...</p>
                                            <p className="text-gray-500 text-sm mt-1">Please wait while we fetch your data</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center bg-red-50">
                                        <div className="flex flex-col items-center">
                                            <AlertCircle className="w-8 h-8 text-red-600 mb-2" /> 
                                            <p className="text-red-600 text-lg">{error}</p>
                                            <button
                                                onClick={fetchApplications}
                                                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <Search className="w-12 h-12 text-gray-400 mb-3" />
                                            <p className="text-gray-500 text-lg">No applications found</p>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Try adjusting your filters or search terms
                                            </p>
                                        </div>
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
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {application.application_id}
                                            </div>
                                        </td>

                                        {/* Customer Info */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {application.customer_name}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                                    {application.customer_email}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {application.customer_phone}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Service */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-medium">
                                                {application.service_name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                ID: {application.service_id}
                                            </div>
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
                                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition duration-150"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    window.location.href = `mailto:${application.customer_email}?subject=Application ${application.application_id}`;
                                                }}
                                                className="p-2 rounded-lg text-green-600 hover:bg-green-100 transition duration-150"
                                                title="Email Customer"
                                            >
                                                <Mail size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    window.location.href = `tel:${application.customer_phone}`;
                                                }}
                                                className="p-2 rounded-lg text-purple-600 hover:bg-purple-100 transition duration-150"
                                                title="Call Customer"
                                            >
                                                <Phone size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 text-sm text-gray-600 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                        <span>
                            Showing {filteredApplications.length} of {applications.length} applications
                        </span>
                        {Object.keys(selectedRows).filter(id => selectedRows[parseInt(id)]).length > 0 && (
                            <span className="text-blue-600 font-medium">
                                {Object.keys(selectedRows).filter(id => selectedRows[parseInt(id)]).length} selected
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                            Last updated: {new Date().toLocaleTimeString()}
                        </span>
                        {loading && (
                            <div className="flex items-center text-blue-600">
                                <Loader2 size={14} className="animate-spin mr-1" />
                                <span className="text-xs">Syncing...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Application Details Modal */}
            {selectedApplication && (
                <ApplicationDetailsModal
                    application={selectedApplication}
                    documents={applicationDocuments}
                    adminDocuments={adminDocuments}
                    history={applicationHistory}
                    onClose={() => setSelectedApplication(null)}
                    onStatusChange={handleStatusChange}
                    onRefresh={() => {
                        fetchApplications();
                        fetchApplicationDetails(selectedApplication.application_id);
                    }}
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
            <span>Services</span>
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