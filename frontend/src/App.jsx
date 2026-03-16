import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { StatsSkeleton, CardSkeleton } from "./components/LoadingSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/UI/Toast";

/* UNIFIED LOGIN */
const Login = lazy(() => import("./pages/shared/Login"));
const ForgotPasswordReset = lazy(() => import("./pages/shared/ForgotPasswordReset"));

/* ADMIN */
const DepartmentPage = lazy(() => import("./pages/admin/DepartmentPage"));
const ClassPage = lazy(() => import("./pages/admin/ClassPage"));

/* HOD */
const HODRegistration = lazy(() => import("./pages/hod/HODRegistration"));

/* SHARED PAGES */
const ResetPassword = lazy(() => import("./pages/shared/ResetPassword"));
const DepartmentDetail = lazy(() => import("./pages/shared/DepartmentDetail"));
const NoticePage = lazy(() => import("./pages/shared/NoticePage"));
const ProfilePage = lazy(() => import("./pages/shared/ProfilePage"));
const DashboardPage = lazy(() => import("./pages/shared/DashboardPage"));
const ResultsPage = lazy(() => import("./pages/shared/ResultsPage"));
const StudentsPage = lazy(() => import("./pages/shared/StudentsPage"));
const ClassDetailPage = lazy(() => import("./pages/shared/ClassDetailPage"));
const ResultDetailPage = lazy(() => import("./pages/shared/ResultDetailPage"));
const StudentRegistrationPage = lazy(() => import("./pages/shared/StudentRegistrationPage"));
const ElectionCreationPage = lazy(() => import("./pages/shared/ElectionCreationPage"));

/* TEACHER */
const TeacherClassPage = lazy(() => import("./pages/teacher/TeacherClassPage"));
const TeacherStudentDetail = lazy(() => import("./pages/teacher/TeacherStudentDetail"));

/* STUDENT */
const StudentElection = lazy(() => import("./pages/student/StudentElection"));
const VotePage = lazy(() => import("./pages/student/VotePage"));

/* 404 Page */
const NotFoundPage = lazy(() => import("./pages/shared/NotFoundPage"));

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

            {/* Public Reset Password */}
            <Route path="/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ForgotPasswordReset />
              </Suspense>
            } />

            {/* ADMIN */}
            <Route path="/admin/login" element={<Navigate to="/" replace />} />
            <Route path="/admin/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DashboardPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ProfilePage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResetPassword />} requiredRoles={["admin", "hod", "teacher", "student"]} />
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
                <ProtectedRoute element={<ClassDetailPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/register-student" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentRegistrationPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/students" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentsPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/elections" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ElectionCreationPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/results" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultsPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/results/detail" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultDetailPage />} requiredRoles={["admin"]} />
              </Suspense>
            } />
            <Route path="/admin/departments/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DepartmentDetail />} requiredRoles={["admin"]} />
              </Suspense>
            } />

            {/* HOD */}
            <Route path="/hod/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DashboardPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ProfilePage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResetPassword />} requiredRoles={["admin", "hod", "teacher", "student"]} />
              </Suspense>
            } />
            <Route path="/hod/register-student" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentRegistrationPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/students" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentsPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/notices" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<NoticePage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/elections" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ElectionCreationPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/results" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultsPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/results/detail" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultDetailPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/departments/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DepartmentDetail />} requiredRoles={["admin", "hod"]} />
              </Suspense>
            } />
            <Route path="/hod/department/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DepartmentDetail />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/classes/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ClassDetailPage />} requiredRoles={["hod"]} />
              </Suspense>
            } />
            <Route path="/hod/register" element={
              <Suspense fallback={<PageLoader />}>
                <HODRegistration />
              </Suspense>
            } />

            {/* TEACHER */}
            <Route path="/teacher/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DashboardPage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/class/:id" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ClassDetailPage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/notices" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<NoticePage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/elections" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ElectionCreationPage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/results" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultsPage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/results/detail" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultDetailPage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/students" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentsPage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ProfilePage />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/student/:studentId" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<TeacherStudentDetail />} requiredRoles={["teacher"]} />
              </Suspense>
            } />
            <Route path="/teacher/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResetPassword />} requiredRoles={["admin", "hod", "teacher", "student"]} />
              </Suspense>
            } />

            {/* STUDENT */}
            <Route path="/student/login" element={<Navigate to="/" replace />} />
            <Route path="/student/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<DashboardPage />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ProfilePage />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResetPassword />} requiredRoles={["admin", "hod", "teacher", "student"]} />
              </Suspense>
            } />
            <Route path="/student/elections" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<StudentElection />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/notices" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<NoticePage />} requiredRoles={["student"]} />
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
                <ProtectedRoute element={<ResultsPage />} requiredRoles={["student"]} />
              </Suspense>
            } />
            <Route path="/student/results/detail" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute element={<ResultDetailPage />} requiredRoles={["student"]} />
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
