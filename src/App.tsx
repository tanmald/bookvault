import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Library = lazy(() => import("./pages/Library"));
const UploadBook = lazy(() => import("./pages/UploadBook"));
const BookDetails = lazy(() => import("./pages/BookDetails"));
const Friends = lazy(() => import("./pages/Friends"));
const Invites = lazy(() => import("./pages/Invites"));
const JoinInvite = lazy(() => import("./pages/JoinInvite"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResponsibleUse = lazy(() => import("./pages/ResponsibleUse"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid refetching on every mount/window focus; data still stays
      // reasonably fresh since most mutations invalidate their queries.
      staleTime: 30 * 1000,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LibraryProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Analytics />
              <BrowserRouter>
                <div className="flex flex-1 flex-col">
                  <ErrorBoundary>
                    <Suspense fallback={<RouteFallback />}>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/join/:code" element={<JoinInvite />} />
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute>
                              <Library />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/upload"
                          element={
                            <ProtectedRoute>
                              <UploadBook />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/book/:id"
                          element={
                            <ProtectedRoute>
                              <BookDetails />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/friends"
                          element={
                            <ProtectedRoute>
                              <Friends />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/invites"
                          element={
                            <ProtectedRoute>
                              <Invites />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute>
                              <Profile />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/terms"
                          element={
                            <ProtectedRoute>
                              <ResponsibleUse />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </LibraryProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
