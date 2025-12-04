import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit2, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import AdminLayout from "@/components/layout/AdminLayout";

// --- BASE URL CONFIGURATION ---
const API_BASE_URL = 'https://geemadhura.braventra.in/api/faqs'; 
// NOTE: Assuming your backend routes are prefixed correctly relative to the base URL.

// --- MOCK/PLACEHOLDER COMPONENT DEFINITIONS (Keep for component functionality) ---
const AdmiLayout = ({ children }) => <div className="p-8 max-w-7xl mx-auto">{children}</div>;
const Button = ({ children, onClick, className, disabled = false, ...rest }) => (
    <button onClick={onClick} className={`px-4 py-2 font-semibold rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={disabled} {...rest}>
        {children}
    </button>
);
const Input = ({ placeholder, value, onChange, className, type = 'text', id, ...rest }) => (
    <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full p-2 border border-gray-300 rounded-lg ${className}`}
        {...rest}
    />
);
const Textarea = ({ placeholder, value, onChange, className, id, ...rest }) => (
    <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full p-2 border border-gray-300 rounded-lg min-h-[100px] ${className}`}
        {...rest}
    />
);
const Checkbox = ({ checked, onCheckedChange, id }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} id={id} className="w-4 h-4" />
);
// Minimal Dialog Implementation for structure
const Dialog = ({ open, onOpenChange, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => onOpenChange(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};
const DialogContent = ({ children }) => <div className="space-y-4">{children}</div>;
const DialogHeader = ({ children }) => <div className="border-b pb-3 mb-3">{children}</div>;
const DialogTitle = ({ children }) => <h2 className="text-xl font-bold">{children}</h2>;
const DialogFooter = ({ children }) => <div className="pt-4 flex justify-end gap-2">{children}</div>;
const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">{children}</label>;


// --- INTERFACE DEFINITION ---
interface FAQ {
    id: number;
    qus: string;
    answers: string;
}

const FAQComponent = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [currentFaq, setCurrentFaq] = useState<FAQ | null>(null);
    
    // Form state (used for both create and edit)
    const [qus, setQus] = useState('');
    const [answers, setAnswers] = useState('');

    // Selection state for batch operations
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const isFormValid = useMemo(() => qus.trim().length > 0 && answers.trim().length > 0, [qus, answers]);

    // --- Data Fetching (GET /) ---
    const fetchFaqs = async () => {
        setIsLoading(true);
        try {
            const url = searchTerm ? `${API_BASE_URL}?search=${encodeURIComponent(searchTerm)}` : API_BASE_URL;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // Assuming your API returns { status: 200, data: [...] }
            setFaqs(data.data || []);
        } catch (error) {
            console.error('Failed to fetch FAQs:', error);
            // In a real app, use a toast/notification system here
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFaqs();
    }, [searchTerm]); // Refetch when search term changes

    // --- Utility Functions ---

    const resetForm = () => {
        setQus('');
        setAnswers('');
        setCurrentFaq(null);
    };

    const closeModal = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        resetForm();
    }

    // --- CRUD Handlers ---

    // Create (POST /create)
    const handleCreate = async () => {
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qus, answers }),
            });

            if (!response.ok) {
                // Read error message from backend if available
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to create FAQ: HTTP status ${response.status}`);
            }

            // toast.success('FAQ created successfully!');
            console.log('FAQ created successfully!');

            closeModal();
            fetchFaqs(); // Refresh list

        } catch (error) {
            console.error('Error creating FAQ:', error);
            // toast.error(`Failed to create FAQ: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit Modal Opener
    const handleEditOpen = (faq: FAQ) => {
        setCurrentFaq(faq);
        setQus(faq.qus);
        setAnswers(faq.answers);
        setIsEditOpen(true);
    };

    // Update (PUT /update/:id)
    const handleUpdate = async () => {
        if (!currentFaq || !isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/update/${currentFaq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qus, answers }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update FAQ: HTTP status ${response.status}`);
            }

            // toast.success('FAQ updated successfully!');
            console.log('FAQ updated successfully!');

            closeModal();
            fetchFaqs(); // Refresh list

        } catch (error) {
            console.error('Error updating FAQ:', error);
            // toast.error(`Failed to update FAQ: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Single (DELETE /delete/:id)
    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this FAQ entry?')) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/delete/${id}`, { method: 'DELETE' });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to delete FAQ: HTTP status ${response.status}`);
            }

            // toast.success('FAQ deleted successfully.');
            console.log('FAQ deleted successfully.');
            
            fetchFaqs(); // Refresh list
            setSelectedIds(selectedIds.filter(itemId => itemId !== id)); // Deselect deleted item

        } catch (error) {
            console.error('Error deleting FAQ:', error);
            // toast.error(`Failed to delete FAQ: ${error.message}`);
        }
    };

    // Delete Multiple (POST /delete-multiple)
    const handleDeleteMultiple = async () => {
        if (selectedIds.length === 0 || isSubmitting) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} FAQ entries?`)) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/delete-multiple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to delete multiple FAQs: HTTP status ${response.status}`);
            }

            const data = await response.json();
            // toast.success(`${data.deletedCount} FAQs deleted successfully.`);
            console.log(`${data.deletedCount} FAQs deleted successfully.`);

            setSelectedIds([]);
            fetchFaqs(); // Refresh list

        } catch (error) {
            console.error('Error deleting multiple FAQs:', error);
            // toast.error(`Failed to delete multiple FAQs: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Selection Handler ---
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(faqs.map(faq => faq.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        }
    };

    const isAllSelected = selectedIds.length > 0 && selectedIds.length === faqs.length;

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm text-gray-500 mb-1">
                            Admin Panel › FAQs
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">Frequently Asked Questions</h1>
                    </div>
                    <Button 
                        onClick={() => { setIsCreateOpen(true); resetForm(); }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1"
                    >
                        <PlusCircle className="h-4 w-4" />
                        New FAQ
                    </Button>
                </div>

                {/* Content Card */}
                <div className="rounded-xl shadow-lg border border-gray-200 bg-white">
                    {/* Toolbar/Search/Actions */}
                    <div className="border-b border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        
                        {/* Search Input */}
                        <div className="relative w-full md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search questions or answers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-gray-50 focus:bg-white" id="search-input" 
                            />
                        </div>

                        {/* Delete Multiple Button */}
                        <div className="w-full md:w-auto">
                            <Button 
                                onClick={handleDeleteMultiple} 
                                disabled={selectedIds.length === 0 || isSubmitting || isLoading}
                                className={`
                                    flex items-center gap-1 transition-all
                                    ${selectedIds.length > 0 
                                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                                <Trash2 className="h-4 w-4" />
                                Delete ({selectedIds.length})
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 w-12 text-left">
                                        <Checkbox 
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                            id="select-all"
                                        />
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ID</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Answer Preview</th>
                                    <th className="p-4 w-32"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                                            Loading FAQs...
                                        </td>
                                    </tr>
                                ) : faqs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No FAQ entries found.
                                        </td>
                                    </tr>
                                ) : (
                                    faqs.map((faq) => (
                                        <tr key={faq.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <Checkbox 
                                                    checked={selectedIds.includes(faq.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(faq.id, checked)}
                                                    id={`faq-checkbox-${faq.id}`}
                                                />
                                            </td>
                                            <td className="p-4 text-sm font-medium text-gray-900">{faq.id}</td>
                                            <td className="p-4 text-sm text-gray-800 font-medium max-w-sm">{faq.qus}</td>
                                            <td className="p-4 text-sm text-gray-500 truncate max-w-md hidden md:table-cell">
                                                {faq.answers.substring(0, 100)}{faq.answers.length > 100 ? '...' : ''}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <Button 
                                                    onClick={() => handleEditOpen(faq)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-transparent p-1"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    onClick={() => handleDelete(faq.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent p-1"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create FAQ Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={closeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New FAQ</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-qus">Question<span className="text-red-500">*</span></Label>
                            <Input
                                id="create-qus"
                                value={qus}
                                onChange={(e) => setQus(e.target.value)}
                                placeholder="E.g., What services do you offer?" className={undefined}                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-answers">Answer<span className="text-red-500">*</span></Label>
                            <Textarea
                                id="create-answers"
                                value={answers}
                                onChange={(e) => setAnswers(e.target.value)}
                                placeholder="Provide the detailed answer here..." className={undefined}                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={closeModal}
                            className="text-gray-600 border-gray-300 hover:bg-gray-100 border"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreate} 
                            disabled={!isFormValid || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-1" />}
                            Create FAQ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Edit FAQ Dialog */}
            <Dialog open={isEditOpen} onOpenChange={closeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit FAQ #{currentFaq?.id}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-qus">Question<span className="text-red-500">*</span></Label>
                            <Input
                                id="edit-qus"
                                value={qus}
                                onChange={(e) => setQus(e.target.value)}
                                placeholder="Question" className={undefined}                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-answers">Answer<span className="text-red-500">*</span></Label>
                            <Textarea
                                id="edit-answers"
                                value={answers}
                                onChange={(e) => setAnswers(e.target.value)}
                                placeholder="Answer" className={undefined}                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={closeModal}
                            className="text-gray-600 border-gray-300 hover:bg-gray-100 border"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpdate} 
                            disabled={!isFormValid || isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit2 className="h-4 w-4 mr-1" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default FAQComponent;