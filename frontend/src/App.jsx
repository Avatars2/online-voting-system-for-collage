import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { StatsSkeleton, CardSkeleton } from "./components/LoadingSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/UI/Toast";

/* UNIFIED LOGIN */
const Login = lazy(() => import("./pages/Login"));

/* ADMIN */
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const ResetPassword = lazy(() => import("./pages/admin/ResetPassword"));
const NoticePage = lazy(() => import("./pages/admin/NoticePage"));
const DepartmentPage = lazy(() => import("./pages/admin/DepartmentPage"));
const ClassPage = lazy(() => import("./pages/admin/ClassPage"));
const StudentRegister = lazy(() => import("./pages/admin/StudentRegister"));
const ElectionCreate = lazy(() => import("./pages/admin/ElectionCreate"));
const ResultPage = lazy(() => import("./pages/admin/ResultPage"));
const AdminClassDetail = lazy(() => import("./pages/admin/AdminClassDetail"));
const AdminDeptDetail = lazy(() => import("./pages/admin/AdminDeptDetail"));
const AdminResultDetail = lazy(() => import("./pages/admin/AdminResultDetail"));

/* STUDENT */
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentResetPassword = lazy(() => import("./pages/student/StudentResetPassword"));
const StudentElection = lazy(() => import("./pages/student/StudentElection"));
const VotePage = lazy(() => import("./pages/student/VotePage"));
const StudentResult = lazy(() => import("./pages/student/StudentResult"));
const StudentNotice = lazy(() => import("./pages/student/StudentNotice"));

/* 404 Page */
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

/* Loading Component */
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 p-3 sm:p-4 flex justify-center">
    <div className="w-full max-w-lg">
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-white/30 flex flex-col h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Unified Login */}
            <Route path="/" element={
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            } />

            {/* ADMIN */}
            <Route path="/admin/login" element={<Navigate to="/" replace />} />
            <Route path="/admin/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<AdminDashboard />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<AdminProfile />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResetPassword />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/notices" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<NoticePage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/departments" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DepartmentPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/classes" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ClassPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/classes/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<AdminClassDetail />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/register-student" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentRegister />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/elections" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ElectionCreate />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/results" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/results/detail" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<AdminResultDetail />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/departments/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<AdminDeptDetail />} requiredRoles={["admin"]} />
              </Suspense>
            } />

            {/* STUDENT */}
            <Route path="/student/login" element={<Navigate to="/" replace />} />
            <Route path="/student/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentDashboard />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentProfile />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentResetPassword />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/elections" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentElection />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/notices" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentNotice />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/vote" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<VotePage />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/vote/:electionId" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<VotePage />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/results" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentResult />} requiredRoles={["student"]} />
              </Suspense>
            } />

            {/* 404 Page */}
            <Route path="*" element={
              <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
              </Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
