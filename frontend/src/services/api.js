import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Public API instance without authentication for registration
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Public registration API without token requirement
export const publicAPI = {
  registerHOD: (hodData) => publicApi.post("/auth/register/hod", hodData),
  getDepartments: () => publicApi.get("/admin/departments"),
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== "/") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  verifyToken: () => api.get("/auth/verify"),
  forgotPassword: (email) => publicApi.post("/auth/forgot-password", { email }),
  resetPasswordWithToken: (data) => publicApi.post("/auth/reset-password-token", data),
  changePassword: (oldPassword, newPassword) =>
    api.post("/auth/change-password", { oldPassword, newPassword }),
  updateMe: (payload) => api.put("/auth/me", payload),
  // Admin password reset for students
  resetStudentPassword: (studentId, newPassword) => 
    api.post("/auth/admin/reset-student-password", { studentId, newPassword }),
};

export const adminAPI = {
  // Auth
  registerHOD: (hodData) => api.post("/admin/register-hod", hodData),
  
  // Dashboard
  getDashboardStats: () => api.get("/admin/stats"),
  departments: { 
    list: () => api.get("/admin/departments"), 
    create: (d) => api.post("/admin/departments", d),
    update: (id, d) => api.put(`/admin/departments/${id}`, d),
    delete: (id) => api.delete(`/admin/departments/${id}`)
  },
  classes: { 
    list: (deptId) => api.get("/admin/classes", { params: deptId ? { department: deptId } : {} }), 
    create: (d) => api.post("/admin/classes", d),
    update: (id, d) => api.put(`/admin/classes/${id}`, d),
    delete: (id) => api.delete(`/admin/classes/${id}`)
  },
  notices: { list: () => api.get("/admin/notices"), create: (d) => api.post("/admin/notices", d) },
  elections: { 
    list: () => api.get("/admin/elections"), 
    create: (d) => api.post("/admin/elections", d),
    update: (id, d) => api.put(`/admin/elections/${id}`, d),
    delete: (electionId) => api.delete(`/admin/elections/${electionId}`),
    addCandidate: (electionId, d) => api.post(`/admin/elections/${electionId}/candidates`, d),
    deleteCandidate: (electionId, candidateId) => api.delete(`/admin/elections/${electionId}/candidates/${candidateId}`),
    results: (electionId) => api.get(`/admin/results/${electionId}`),
  },
  students: {
    list: () => api.get("/admin/students"),
    create: (d) => api.post("/admin/students", d),
    update: (id, d) => api.put(`/admin/students/${id}`, d),
    delete: (id) => api.delete(`/admin/students/${id}`)
  },
  teachers: {
    list: () => api.get("/admin/teachers"),
    register: (data) => api.post("/admin/register-teacher", data)
  },
  getDepartment: (id) => api.get(`/admin/departments/${id}`),
  getClass: (id) => api.get(`/admin/classes/${id}`),

  // HOD API endpoints
  hod: {
    dashboard: () => api.get("/hod/dashboard"),
    profile: () => api.get("/hod/profile"),
    updateProfile: (d) => api.put("/hod/profile", d),
    changePassword: (d) => api.put("/hod/change-password", d),
    registerStudent: (d) => api.post("/hod/register-student", d),
    getDepartment: () => api.get("/hod/department"),
    classes: {
      create: (d) => api.post("/hod/classes", d),
      update: (id, d) => api.put(`/hod/classes/${id}`, d),
      delete: (id) => api.delete(`/hod/classes/${id}`),
      list: () => api.get("/hod/classes")
    },
    registerTeacher: (d) => api.post("/hod/register-teacher", d),
    listTeachers: () => api.get("/hod/teachers"),
    createNotice: (d) => api.post("/hod/notices", d),
    listNotices: () => api.get("/hod/notices"),
    createElection: (d) => api.post("/hod/elections", d),
    listElections: () => api.get("/hod/elections"),
    addCandidate: (electionId, d) => api.post(`/hod/elections/${electionId}/candidates`, d),
    getResults: (electionId) => api.get(`/hod/results/${electionId}`)
  },

  // Department HOD assignment
  assignHodToDepartment: (deptId, hodData) => api.put(`/admin/departments/${deptId}/assign-hod`, hodData),
  registerHodForDepartment: (deptId, hodData) => api.post(`/admin/departments/${deptId}/register-hod`, hodData),
};

export const hodAPI = {
  // Auth
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  
  // Dashboard
  dashboard: () => api.get("/hod/dashboard"),
  verifyToken: () => api.get("/auth/verify"),
  changePassword: (oldPassword, newPassword) =>
    api.post("/auth/change-password", { oldPassword, newPassword }),
  updateMe: (payload) => api.put("/auth/me", payload),
  
  // Dashboard
  getDashboard: () => api.get("/hod/dashboard"),
  
  // Department
  getDepartment: () => api.get("/hod/department"),
  
  // Classes
  classes: {
    list: () => api.get("/hod/classes"),
    create: (data) => api.post("/hod/classes", data),
    update: (id, d) => api.put(`/hod/classes/${id}`, d),
    delete: (id) => api.delete(`/hod/classes/${id}`)
  },
  
  // Teachers
  teachers: {
    list: () => api.get("/hod/teachers"),
    register: (data) => api.post("/hod/register-teacher", data)
  },
  
  // Students
  students: {
    register: (data) => api.post("/hod/register-student", data),
    list: () => api.get("/hod/students"),
    update: (id, data) => api.put(`/hod/students/${id}`, data),
    delete: (id) => api.delete(`/hod/students/${id}`)
  },
  
  // Notices
  notices: {
    list: () => api.get("/hod/notices"),
    create: (data) => api.post("/hod/notices", data)
  },
  
  // Elections
  elections: {
    list: () => api.get("/hod/elections"),
    create: (data) => api.post("/hod/elections", data),
    update: (id, d) => api.put(`/hod/elections/${id}`, d),
    delete: (electionId) => api.delete(`/hod/elections/${electionId}`),
    addCandidate: (electionId, data) => api.post(`/hod/elections/${electionId}/candidates`, data),
    deleteCandidate: (electionId, candidateId) => api.delete(`/hod/elections/${electionId}/candidates/${candidateId}`)
  },
  
  // Results
  results: (electionId) => api.get(`/hod/results/${electionId}`)
};

export const studentAPI = {
  me: () => api.get("/student/me"),
  elections: () => api.get("/student/elections"),
  getElectionCandidates: (electionId) => api.get(`/student/elections/${electionId}/candidates`),
  vote: (electionId, candidateId) => api.post(`/student/vote/${electionId}/${candidateId}`),
  notices: () => api.get("/student/notices"),
  markNoticeAsRead: (noticeId) => api.post(`/student/notices/${noticeId}/read`)
};

export const teacherAPI = {
  // Auth
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  verifyToken: () => api.get("/auth/verify"),
  changePassword: (oldPassword, newPassword) =>
    api.post("/auth/change-password", { oldPassword, newPassword }),
  updateMe: (payload) => api.put("/auth/me", payload),
  
  // Dashboard
  getDashboard: () => api.get("/teacher/dashboard"),
  
  // Profile
  profile: () => api.get("/teacher/me"),
  
  // Class
  getClass: (id) => api.get(`/teacher/classes/${id}`),
  
  // Students
  students: {
    list: (classId) => api.get(`/teacher/students`), // Remove classId parameter since classAccess middleware handles it
    create: (data) => api.post("/teacher/register-student", data),
    update: (id, data) => api.put(`/teacher/students/${id}`, data),
    delete: (id) => api.delete(`/teacher/students/${id}`)
  },
  
  // Notices
  notices: {
    list: () => api.get("/teacher/notices"),
    create: (data) => api.post("/teacher/notices", data)
  },
  
  // Elections
  elections: {
    list: () => api.get("/teacher/elections"),
    create: (data) => api.post("/teacher/elections", data),
    update: (id, d) => api.put(`/teacher/elections/${id}`, d),
    delete: (electionId) => api.delete(`/teacher/elections/${electionId}`),
    addCandidate: (electionId, data) => api.post(`/teacher/elections/${electionId}/candidates`, data),
    deleteCandidate: (electionId, candidateId) => api.delete(`/teacher/elections/${electionId}/candidates/${candidateId}`)
  },
  
  // Results
  results: (electionId) => api.get(`/teacher/results/${electionId}`)
};

export const noticesAPI = { 
  list: () => api.get("/notices") 
};

export default api;
