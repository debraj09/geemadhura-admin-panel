import { useState, useEffect, useRef } from "react";
import { Search, Edit2, Loader2, Trash2, ImageIcon, UploadCloud } from "lucide-react";
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

// Configuration
const BASE_URL = "https://geemadhura.braventra.in";
const API_URL = `${BASE_URL}/api/galleryRoutes`;

interface Gallery {
  id: number;
  title: string;
  image_url: string;
  created_at: string;
}

const Galleries = () => {
  // Data State
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentGallery, setCurrentGallery] = useState<Gallery | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);

  // Shared State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Galleries
  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}?search=${searchTerm}`);
      const result = await response.json();
      if (response.ok) {
        setGalleries(result.data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchGalleries();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // 2. Create Gallery Item
  const handleCreate = async (createAnother = false) => {
    if (!title || !selectedFile) {
      alert("Title and Image are required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("image", selectedFile);

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/create`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setTitle("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchGalleries();
        if (!createAnother) setIsCreateOpen(false);
      } else {
        alert("Failed to create gallery item.");
      }
    } catch (error) {
      console.error("Create error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Edit Trigger
  const handleEditClick = (gallery: Gallery) => {
    setCurrentGallery(gallery);
    setEditTitle(gallery.title);
    setEditFile(null);
    setIsEditOpen(true);
  };

  // 4. Update Gallery Item
  const handleUpdate = async () => {
    if (!currentGallery) return;

    const formData = new FormData();
    formData.append("title", editTitle);
    if (editFile) {
      formData.append("image", editFile);
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/update/${currentGallery.id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        await fetchGalleries();
        setIsEditOpen(false);
      } else {
        alert("Update failed.");
      }
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Gallery Item
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this?")) return;

    try {
      const response = await fetch(`${API_URL}/delete/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setGalleries((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Galleries › List</div>
            <h1 className="text-3xl font-bold">Galleries</h1>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary">
            New gallery
          </Button>
        </div>

        {/* Content Table */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-sm font-medium">
                  <th className="p-4 text-left w-12"><Checkbox /></th>
                  <th className="p-4 text-left">Image</th>
                  <th className="p-4 text-left">Title</th>
                  <th className="p-4 text-left">Created at</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />
                      Loading gallery...
                    </td>
                  </tr>
                ) : galleries.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center">No images found.</td></tr>
                ) : (
                  galleries.map((gallery) => (
                    <tr key={gallery.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4"><Checkbox /></td>
                      <td className="p-4">
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted border">
                          <img 
                            src={`${BASE_URL}${gallery.image_url}`} 
                            alt="" 
                            className="h-full w-full object-cover"
                            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/40")}
                          />
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium max-w-xs md:max-w-md truncate">
                        {gallery.title}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(gallery.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditClick(gallery)}>
                          <Edit2 className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(gallery.id)}>
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

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Create gallery</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (Max Length 150)<span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-all cursor-pointer bg-muted/10">
                {selectedFile ? (
                  <div className="text-primary font-medium flex flex-col items-center gap-2">
                    <ImageIcon className="h-6 w-6" /> {selectedFile.name}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <UploadCloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Drag & Drop or <span className="text-primary font-medium">Browse</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="outline" onClick={() => handleCreate(true)} disabled={isSubmitting}>Create & create another</Button>
            <Button onClick={() => handleCreate(false)} className="bg-primary" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Edit gallery</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
              <div onClick={() => editFileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer bg-muted/5">
                {editFile ? (
                  <span className="text-primary font-medium">{editFile.name}</span>
                ) : (
                  <div className="text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <img src={`${BASE_URL}${currentGallery?.image_url}`} className="h-16 w-16 object-cover rounded opacity-50 mb-2" alt="Current" />
                    Click to <span className="text-primary">replace</span> image
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Galleries;