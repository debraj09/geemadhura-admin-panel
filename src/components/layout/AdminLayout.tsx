import { useState } from "react";
import { ChevronDown, Menu, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavLink } from "@/components/NavLink";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [homeExpanded, setHomeExpanded] = useState(true);
  const [managementExpanded, setManagementExpanded] = useState(false);
  const [blogExpanded, setBlogExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Geemadhura Admin Panel</h1>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 bg-background"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card pt-16 transition-transform md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="overflow-y-auto h-full p-4">
            <nav className="space-y-1">
              {/* Main sections without home */}
              <NavLink
                to="/galleries"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">📷</span>
                Galleries
              </NavLink>
              <NavLink
                to="/logos"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">🎨</span>
                Logos
              </NavLink>
              <NavLink
                to="/news"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">📰</span>
                News
              </NavLink>
              <NavLink
                to="/faq"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">📰</span>
                FAQ
              </NavLink>
              <NavLink
                to="/certifications"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">🔧</span>
                Certifications
              </NavLink>
              <NavLink
                to="/testimonials"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">💬</span>
                Testimonials
              </NavLink>
              <NavLink
                to="/updates"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                activeClassName="bg-muted font-medium"
              >
                <span className="text-muted-foreground">🔔</span>
                Updates
              </NavLink>

              {/* Home section */}
              <div className="pt-4">
                <button
                  onClick={() => setHomeExpanded(!homeExpanded)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">Home</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      homeExpanded && "rotate-180"
                    )}
                  />
                </button>
                {homeExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    <NavLink
                      to="/banners"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Banners
                    </NavLink>
                    <NavLink
                      to="/videos"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Videos
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Management section */}
              <div className="pt-4">
                <button
                  onClick={() => setManagementExpanded(!managementExpanded)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">Management</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      managementExpanded && "rotate-180"
                    )}
                  />
                </button>
                {managementExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    <NavLink
                      to="/certification"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Certification
                    </NavLink>
                    <NavLink
                      to="/doctors"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Doctors
                    </NavLink>
                    <NavLink
                      to="/equipment"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Equipment
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Blog section */}
              <div className="pt-4">
                <button
                  onClick={() => setBlogExpanded(!blogExpanded)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">Blog</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      blogExpanded && "rotate-180"
                    )}
                  />
                </button>
                {blogExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    <NavLink
                      to="/posts"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Posts
                    </NavLink>
                    <NavLink
                      to="/categories"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Categories
                    </NavLink>
                    <NavLink
                      to="/authors"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      activeClassName="bg-muted font-medium text-primary"
                    >
                      Authors
                    </NavLink>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
