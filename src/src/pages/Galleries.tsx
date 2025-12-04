import { useState } from "react";
import { Search, Edit2 } from "lucide-react";
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

interface Gallery {
  id: number;
  title: string;
  image: string;
  createdAt: string;
}

const dummyGalleries: Gallery[] = [
  {
    id: 1,
    title: "Latest Generation Neuro & Cardiac CATHLAB, with PHILIPS AZURION 7C20",
    image: "🏥",
    createdAt: "1 year ago",
  },
  {
    id: 2,
    title: "Reception and Lobby area",
    image: "🏢",
    createdAt: "1 year ago",
  },
  {
    id: 3,
    title: "Hospital Reception",
    image: "💼",
    createdAt: "1 year ago",
  },
  {
    id: 4,
    title: "Hospital Chemist Shop",
    image: "💊",
    createdAt: "1 year ago",
  },
  {
    id: 5,
    title: "World Brain Tumor Day on June 8, 2024 celebration",
    image: "🎉",
    createdAt: "1 year ago",
  },
];

const Galleries = () => {
  const [galleries] = useState<Gallery[]>(dummyGalleries);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");

  const filteredGalleries = galleries.filter((gallery) =>
    gallery.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    console.log("Creating gallery:", { title });
    setIsCreateOpen(false);
    setTitle("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Galleries › List
            </div>
            <h1 className="text-3xl font-bold">Galleries</h1>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary">
            New gallery
          </Button>
        </div>

        {/* Content Card */}
        <div className="rounded-lg border border-border bg-card">
          {/* Search */}
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <Checkbox />
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Image</th>
                  <th className="p-4 text-left text-sm font-medium">Title</th>
                  <th className="p-4 text-left text-sm font-medium">
                    Created at
                  </th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredGalleries.map((gallery) => (
                  <tr key={gallery.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <Checkbox />
                    </td>
                    <td className="p-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-2xl">
                        {gallery.image}
                      </div>
                    </td>
                    <td className="p-4 text-sm max-w-md">{gallery.title}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {gallery.createdAt}
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" className="text-primary">
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Gallery Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create gallery</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title (Max Length 150)<span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <div className="text-sm text-muted-foreground">
                  Drag & Drop your files or{" "}
                  <span className="text-primary font-medium">Browse</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleCreate}>
              Create & create another
            </Button>
            <Button onClick={handleCreate} className="bg-primary">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Galleries;
