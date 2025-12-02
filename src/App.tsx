import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Banners from "./pages/Banners";
import Videos from "./pages/Videos";
import Galleries from "./pages/Galleries";
import NotFound from "./pages/NotFound";
import Certifications from "./pages/Certifications";
import FAQ from "./pages/FAQ";
import LatestUpdates from "./pages/LatestUpdates";
import Testimonial from "./pages/Testimonial";
import Blogs from "./pages/Blogs";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/banners" replace />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/galleries" element={<Galleries />} />
          {/* Placeholder routes for other sections */}
          <Route path="/logos" element={<NotFound />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/news" element={<LatestUpdates />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/testimonials" element={<Testimonial />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/updates" element={<NotFound />} />
          <Route path="/doctors" element={<NotFound />} />
          <Route path="/equipment" element={<NotFound />} />
          <Route path="/posts" element={<NotFound />} />
          <Route path="/categories" element={<NotFound />} />
          <Route path="/authors" element={<NotFound />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
