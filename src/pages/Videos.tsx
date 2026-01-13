import { useState, useEffect, useMemo, useCallback } from "react";
// Removed Trash2 and Loader2 since you didn't list them, but they are crucial, so I've added them back.
import { Search, Edit2, Trash2, Loader2, RefreshCw } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/layout/AdminLayout";
import { DialogClose } from "@radix-ui/react-dialog";
import { toast } from 'sonner'; // Assuming you use a toast/notification library
import { Switch } from "@/components/ui/switch"; 

// --- Configuration ---
const API_BASE_URL = 'https://geemadhura.braventra.in/api/videos';

// --- Interfaces ---
interface Video {
  id: number;
  title: string;
  youtube_video_id: string; // Matches backend field name
  enable_home_page: boolean; // Matches backend field name
  created_at: string;
}

interface ApiVideoResponse {
    status: number;
    message: string;
    data: Video[];
    total: number;
}

interface VideoFormData {
    title: string;
    youtubeVideoId: string;
    enableHomePage: boolean;
}


const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- Loading/Error State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Used for create/update/delete
  const [error, setError] = useState<string | null>(null);

  // --- Create Dialog State ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<VideoFormData>({
    title: "",
    youtubeVideoId: "",
    enableHomePage: false,
  });

  // --- Edit Dialog State ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<VideoFormData>({
    title: "",
    youtubeVideoId: "",
    enableHomePage: false,
  });

  // --- Selection State ---
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
  
// --- API Calls (using fetch) ---

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the search query parameter
      const url = `${API_BASE_URL}?search=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiVideoResponse = await response.json();
      setVideos(result.data || []); 
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError("Failed to fetch videos. Check console for details.");
      setVideos([]); 
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]); 

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // --- CRUD Handlers ---

  const resetCreateForm = () => {
    setCreateFormData({ title: "", youtubeVideoId: "", enableHomePage: false });
  };
  
  const handleCreate = async (createAnother: boolean = false) => {
    if (!createFormData.title || !createFormData.youtubeVideoId) {
      toast.error("Title and Youtube Video Id are required.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
        const response = await fetch(`${API_BASE_URL}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: createFormData.title,
                youtubeVideoId: createFormData.youtubeVideoId,
                enableHomePage: createFormData.enableHomePage,
            }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Failed with status: ${response.status}`);
        }

        toast.success("Video created successfully!");
        
        if (!createAnother) {
            setIsCreateOpen(false);
        }
        resetCreateForm();
        
        await fetchVideos(); 
        
    } catch (err) {
        console.error('Error creating video:', err);
        const message = err instanceof Error ? err.message : "Failed to create video.";
        toast.error(message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleEditOpen = useCallback(async (id: number) => {
    setIsProcessing(true);
    setEditingVideoId(id);
    
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`);

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `Failed to fetch video data.`);
        }
        
        const result = await response.json();
        const video: Video = result.data;

        setEditFormData({
            title: video.title,
            youtubeVideoId: video.youtube_video_id,
            enableHomePage: video.enable_home_page,
        });

        setIsEditOpen(true);

    } catch (err) {
        console.error('Error opening edit modal:', err);
        const message = err instanceof Error ? err.message : "Failed to load video for editing.";
        toast.error(message);
    } finally {
        setIsProcessing(false);
    }

  }, []);

  const handleUpdate = async () => {
    if (!editingVideoId || !editFormData.title || !editFormData.youtubeVideoId) {
        toast.error("Title and Youtube Video Id are required.");
        return;
    }
    
    setIsProcessing(true);
    setError(null);

    try {
        const response = await fetch(`${API_BASE_URL}/update/${editingVideoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: editFormData.title,
                youtubeVideoId: editFormData.youtubeVideoId,
                enableHomePage: editFormData.enableHomePage,
            }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Failed with status: ${response.status}`);
        }
        
        toast.success("Video updated successfully!");
        
        setIsEditOpen(false);
        setEditingVideoId(null);
        await fetchVideos(); 
        
    } catch (err) {
        console.error('Error updating video:', err);
        const message = err instanceof Error ? err.message : "Failed to update video.";
        toast.error(message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSelected = useCallback(async (idsToDelete: number[] = selectedVideoIds) => {
    if (idsToDelete.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${idsToDelete.length} video(s)?`)) {
        return;
    }
    
    setIsProcessing(true);

    try {
        const response = await fetch(`${API_BASE_URL}/delete-multiple`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: idsToDelete }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `Failed with status: ${response.status}`);
        }
        
        const result = await response.json();
        toast.success(result.message || `${idsToDelete.length} video(s) deleted successfully.`);
        
        // Clear selection and re-fetch
        setSelectedVideoIds([]);
        await fetchVideos();

    } catch (err) {
        console.error('Error deleting multiple videos:', err);
        const message = err instanceof Error ? err.message : "Failed to delete videos.";
        toast.error(message);
    } finally {
        setIsProcessing(false);
    }
  }, [selectedVideoIds, fetchVideos]);
  
  const handleToggleHome = async (id: number, currentStatus: boolean) => {
      setIsProcessing(true);
      try {
          const response = await fetch(`${API_BASE_URL}/toggle-home/${id}`, {
              method: 'PATCH',
          });
          
          if (!response.ok) {
              const errorResult = await response.json();
              throw new Error(errorResult.error || `Failed with status: ${response.status}`);
          }
          
          toast.success(`Home Page status set to ${!currentStatus ? 'enabled' : 'disabled'}.`);
          
          // Optimistically update
          setVideos(prev => prev.map(v => 
              v.id === id ? { ...v, enable_home_page: !currentStatus } : v
          ));

      } catch (err) {
          console.error('Error toggling home page status:', err);
          const message = err instanceof Error ? err.message : "Failed to toggle status.";
          toast.error(message);
      } finally {
        setIsProcessing(false);
      }
  };


// --- Filtering Logic ---
  
  const filteredVideos = useMemo(() => {
    // If videos are loading or an error occurred, show nothing
    if (isLoading || error) return [];

    return videos.filter((video) =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [videos, searchTerm, isLoading, error]);

// --- Selection Logic ---
  
  const isAllSelected = filteredVideos.length > 0 && filteredVideos.every(
    (video) => selectedVideoIds.includes(video.id)
  );
  
  const isIndeterminate = filteredVideos.some(
    (video) => selectedVideoIds.includes(video.id)
  ) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const idsToDeselect = filteredVideos.map(v => v.id);
      setSelectedVideoIds(prev => prev.filter(id => !idsToDeselect.includes(id)));
    } else {
      const idsToSelect = filteredVideos.map(v => v.id);
      setSelectedVideoIds(prev => Array.from(new Set([...prev, ...idsToSelect])));
    }
  };

  const handleSelectVideo = (id: number, checked: boolean) => {
    setSelectedVideoIds((prev) =>
      checked ? [...prev, id] : prev.filter((videoId) => videoId !== id)
    );
  };
  
  const handleDeselectAll = () => {
    setSelectedVideoIds([]);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Videos › List
            </div>
            <h1 className="text-3xl font-bold">Videos</h1>
          </div>
          <Button 
            onClick={() => { setIsCreateOpen(true); resetCreateForm(); }} 
            className="bg-primary"
            disabled={isProcessing}
          >
            New video
          </Button>
        </div>

        {/* Content Card */}
        <div className="rounded-lg border border-border bg-card">
          {/* Search & Bulk Actions */}
          <div className="border-b border-border p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                {/* Search Input */}
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search titles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background"
                    disabled={isProcessing || isLoading}
                  />
                </div>
                {/* Refresh Button */}
                <Button variant="outline" size="icon" onClick={fetchVideos} disabled={isLoading || isProcessing}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            
            {/* Bulk Actions */}
            <div className="flex items-center space-x-2">
              {selectedVideoIds.length > 0 && (
                <div className="text-sm text-primary font-medium mr-2">
                  {selectedVideoIds.length} record(s) selected
                </div>
              )}
              {selectedVideoIds.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={isProcessing}
                  >
                    Deselect All
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteSelected(selectedVideoIds)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete All
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[300px]">
            {isLoading || isProcessing ? (
                <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading Videos...</span>
                </div>
            ) : filteredVideos.length === 0 ? (
                <div className="flex justify-center items-center h-[300px]">
                    <p className="text-muted-foreground">No videos found.</p>
                </div>
            ) : (
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      {/* Master Checkbox */}
                      <th className="p-4 text-left w-10">
                        <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            {...(isIndeterminate && { checked: 'indeterminate' as const })}
                            disabled={isProcessing}
                        />
                      </th>
                      <th className="p-4 text-left text-sm font-medium">
                        Enable Home Page
                      </th>
                      <th className="p-4 text-left text-sm font-medium">Title</th>
                      <th className="p-4 text-left text-sm font-medium">Video ID</th>
                      <th className="p-4 text-left text-sm font-medium">
                        Created At
                      </th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVideos.map((video) => (
                      <tr key={video.id} className="border-b border-border hover:bg-muted/30">
                        {/* Row Checkbox */}
                        <td className="p-4">
                          <Checkbox
                            checked={selectedVideoIds.includes(video.id)}
                            onCheckedChange={(checked) =>
                              handleSelectVideo(video.id, checked as boolean)
                            }
                            disabled={isProcessing}
                          />
                        </td>
                        {/* Toggle Switch */}
                        <td className="p-4">
                           <Switch 
                                checked={video.enable_home_page} 
                                onCheckedChange={() => handleToggleHome(video.id, video.enable_home_page)}
                                disabled={isProcessing}
                            />
                        </td>
                        <td className="p-4 text-sm max-w-md font-medium">{video.title}</td>
                        {/* Video ID and Link */}
                        <td className="p-4 text-sm text-muted-foreground font-mono">
                          <a 
                            href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 underline"
                          >
                             {video.youtube_video_id}
                          </a>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(video.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 flex items-center space-x-2">
                          {/* Edit Button */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary"
                            onClick={() => handleEditOpen(video.id)}
                            disabled={isProcessing}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                           {/* Single Delete Button */}
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSelected([video.id])}
                              disabled={isProcessing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
          </div>
        </div>
      </div>

      {/* --- CREATE Video Dialog --- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create video</DialogTitle>
          </DialogHeader>
          <form className="space-y-6 py-4" onSubmit={(e) => { e.preventDefault(); handleCreate(false); }}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableHomePageCreate"
                checked={createFormData.enableHomePage}
                onCheckedChange={(checked) => 
                    setCreateFormData(prev => ({ ...prev, enableHomePage: checked as boolean }))
                }
                disabled={isProcessing}
              />
              <Label htmlFor="enableHomePageCreate">Enable Home Page</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="titleCreate">
                Title<span className="text-destructive">*</span>
              </Label>
              <Input
                id="titleCreate"
                placeholder="Enter video title"
                value={createFormData.title}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={isProcessing}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoIdCreate">
                Youtube Video Id<span className="text-destructive">*</span>
              </Label>
              <Input
                id="videoIdCreate"
                placeholder="Enter YouTube video ID (e.g., dQw4w9WgXcQ)"
                value={createFormData.youtubeVideoId}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, youtubeVideoId: e.target.value }))}
                disabled={isProcessing}
                required
              />
            </div>
          
            <DialogFooter className="gap-2 pt-4">
              <DialogClose asChild>
                  <Button variant="outline" disabled={isProcessing}>
                    Cancel
                  </Button>
              </DialogClose>
              <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleCreate(true)}
                  disabled={isProcessing || !createFormData.title || !createFormData.youtubeVideoId}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create & create another'}
              </Button>
              <Button 
                  type="submit" 
                  className="bg-primary" 
                  disabled={isProcessing || !createFormData.title || !createFormData.youtubeVideoId}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* --- EDIT Video Dialog --- */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); setEditingVideoId(null); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Video: {editingVideoId}</DialogTitle>
          </DialogHeader>
          {isProcessing && editingVideoId ? (
            <div className="flex justify-center items-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading data...</span>
            </div>
          ) : (
            <form className="space-y-6 py-4" onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableHomePageEdit"
                  checked={editFormData.enableHomePage}
                  onCheckedChange={(checked) => 
                      setEditFormData(prev => ({ ...prev, enableHomePage: checked as boolean }))
                  }
                  disabled={isProcessing}
                />
                <Label htmlFor="enableHomePageEdit">Enable Home Page</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleEdit">
                  Title<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="titleEdit"
                  placeholder="Enter video title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={isProcessing}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoIdEdit">
                  Youtube Video Id<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="videoIdEdit"
                  placeholder="Enter YouTube video ID"
                  value={editFormData.youtubeVideoId}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, youtubeVideoId: e.target.value }))}
                  disabled={isProcessing}
                  required
                />
              </div>

              <DialogFooter className="gap-2 pt-4">
                <DialogClose asChild>
                    <Button variant="outline" disabled={isProcessing}>
                      Cancel
                    </Button>
                </DialogClose>
                <Button 
                    type="submit" 
                    className="bg-primary" 
                    disabled={isProcessing || !editFormData.title || !editFormData.youtubeVideoId}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Videos;