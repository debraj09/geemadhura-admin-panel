import { useState, useEffect, useRef } from "react";
import { 
  Search, Edit2, Loader2, Trash2, 
  Mail, Phone, Calendar, Filter, 
  ExternalLink, CheckCircle, XCircle, 
  Clock, Archive, RefreshCw, User, 
  MessageSquare, FileText, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Configuration
const BASE_URL = "https://geemadhura.braventra.in";
const API_URL = `${BASE_URL}/api/contact`;

interface ContactLead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  service_id: number | null;
  service_name: string | null;
  subject: string | null;
  message: string;
  status: 'new' | 'contacted' | 'resolved' | 'archived';
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  resolved: number;
  archived: number;
}

const ContactLeads = () => {
  // Data State
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // View Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<ContactLead | null>(null);

  // Status Update Modal
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  // Shared State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/leads?page=${currentPage}&limit=${itemsPerPage}`;
      
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      if (searchTerm) {
        // Search is handled on client side for simplicity
        // You could implement server-side search if needed
      }

      const response = await fetch(url);
      const result = await response.json();
      
      if (response.ok) {
        setLeads(result.data);
        setTotalPages(result.totalPages);
        setTotalItems(result.total);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const result = await response.json();
      
      if (response.ok) {
        const statsData = result.data.reduce((acc: any, item: any) => {
          acc[item.status] = item.count;
          return acc;
        }, {});
        
        setStats({
total: Object.values<number>(statsData).reduce((a: number, b: number) => a + b, 0),          new: statsData.new || 0,
          contacted: statsData.contacted || 0,
          resolved: statsData.resolved || 0,
          archived: statsData.archived || 0
        });
      }
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [currentPage, statusFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Handle View Lead
  const handleViewClick = (lead: ContactLead) => {
    setCurrentLead(lead);
    setIsViewOpen(true);
  };

  // Handle Status Update
  const handleStatusUpdate = async () => {
    if (!currentLead || !newStatus) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/leads/${currentLead.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchLeads();
        await fetchStats();
        setIsStatusOpen(false);
      }
    } catch (error) {
      console.error("Status update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) return;

    try {
      const promises = selectedLeads.map(id => 
        fetch(`${API_URL}/leads/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "archived" }),
        })
      );

      await Promise.all(promises);
      setSelectedLeads([]);
      await fetchLeads();
      await fetchStats();
    } catch (error) {
      console.error("Bulk delete error:", error);
    }
  };

  // Handle Bulk Status Change
  const handleBulkStatusChange = async (status: string) => {
    if (selectedLeads.length === 0) return;

    try {
      const promises = selectedLeads.map(id => 
        fetch(`${API_URL}/leads/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        })
      );

      await Promise.all(promises);
      setSelectedLeads([]);
      await fetchLeads();
      await fetchStats();
    } catch (error) {
      console.error("Bulk status change error:", error);
    }
  };

  // Get Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">New</Badge>;
      case 'contacted':
        return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Contacted</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Resolved</Badge>;
      case 'archived':
        return <Badge variant="default" className="bg-gray-500 hover:bg-gray-600">Archived</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Format Date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format Time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Select All Leads
  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(lead => lead.id));
    }
  };

  // Select Single Lead
  const handleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(leadId => leadId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Contact › Leads</div>
            <h1 className="text-3xl font-bold">Contact Leads</h1>
            <p className="text-muted-foreground mt-2">Manage all contact form submissions from your website</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                fetchLeads();
                fetchStats();
              }}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Leads</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-2">{stats?.total || 0}</h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">New</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-2">{stats?.new || 0}</h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Contacted</p>
                  <h3 className="text-3xl font-bold text-yellow-900 mt-2">{stats?.contacted || 0}</h3>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Resolved</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-2">{stats?.resolved || 0}</h3>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Archived</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats?.archived || 0}</h3>
                </div>
                <div className="p-3 bg-gray-500/20 rounded-lg">
                  <Archive className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedLeads.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-700">
                  {selectedLeads.length} lead(s) selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('contacted')}>
                      Mark as Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('resolved')}>
                      Mark as Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('archived')}>
                      Archive Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedLeads([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or message..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {leads.length} of {totalItems} leads
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Table */}
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-sm font-medium">
                  <th className="p-4 text-left w-12">
                    <Checkbox 
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left">Lead</th>
                  <th className="p-4 text-left">Contact</th>
                  <th className="p-4 text-left">Service</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Mail className="h-12 w-12 opacity-30" />
                        <p>No leads found</p>
                        {statusFilter !== "all" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setStatusFilter("all")}
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <Checkbox 
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="font-medium">{lead.name}</div>
                          {lead.subject && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {lead.subject}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <a 
                              href={`mailto:${lead.email}`}
                              className="text-primary hover:underline"
                            >
                              {lead.email}
                            </a>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              <a 
                                href={`tel:${lead.phone}`}
                                className="text-primary hover:underline"
                              >
                                {lead.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {lead.service_name ? (
                          <span className="text-sm bg-muted px-2 py-1 rounded">
                            {lead.service_name}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">General Inquiry</span>
                        )}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-sm">
                          <span>{formatDate(lead.created_at)}</span>
                          <span className="text-muted-foreground">{formatTime(lead.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewClick(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setCurrentLead(lead);
                              setNewStatus('contacted');
                              setIsStatusOpen(true);
                            }}>
                              Mark as Contacted
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setCurrentLead(lead);
                              setNewStatus('resolved');
                              setIsStatusOpen(true);
                            }}>
                              Mark as Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setCurrentLead(lead);
                              setNewStatus('archived');
                              setIsStatusOpen(true);
                            }}>
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW LEAD DIALOG */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Submitted on {currentLead && formatDate(currentLead.created_at)} at {currentLead && formatTime(currentLead.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {currentLead && (
            <div className="space-y-6 py-4">
              {/* Lead Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{currentLead.name}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${currentLead.email}`}
                      className="text-primary hover:underline"
                    >
                      {currentLead.email}
                    </a>
                  </div>
                </div>
                
                {currentLead.phone && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${currentLead.phone}`}
                        className="text-primary hover:underline"
                      >
                        {currentLead.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    {getStatusBadge(currentLead.status)}
                  </div>
                </div>
                
                {currentLead.service_name && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Service Interested</Label>
                    <div className="p-3 bg-muted rounded-lg">
                      {currentLead.service_name}
                    </div>
                  </div>
                )}
                
                {currentLead.subject && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Subject</Label>
                    <div className="p-3 bg-muted rounded-lg">
                      {currentLead.subject}
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Message</Label>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap min-h-[150px] max-h-[300px] overflow-y-auto">
                  {currentLead.message}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(currentLead.created_at)} at {formatTime(currentLead.created_at)}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(currentLead.updated_at)} at {formatTime(currentLead.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentLead(currentLead);
                setNewStatus(currentLead?.status || '');
                setIsStatusOpen(true);
              }}
            >
              Change Status
            </Button>
            <Button onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STATUS UPDATE DIALOG */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
            <DialogDescription>
              Update the status for {currentLead?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">Status Meanings:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <span className="font-medium">New</span>: Recently submitted</li>
                <li>• <span className="font-medium">Contacted</span>: Response sent</li>
                <li>• <span className="font-medium">Resolved</span>: Issue resolved</li>
                <li>• <span className="font-medium">Archived</span>: Moved to archive</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={isSubmitting || !newStatus}
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ContactLeads;