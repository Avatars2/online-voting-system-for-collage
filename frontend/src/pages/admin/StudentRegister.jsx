import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { validatePassword } from "../../utils/validation";
import { useToast } from "../../components/UI/Toast";

export default function StudentRegister() {
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "", department: "", class: "" });
  const [, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    adminAPI.students.list().then((r) => setStudents(r.data || [])).catch(() => setStudents([]));
    adminAPI.departments.list().then((r) => setDepartments(r.data || [])).catch(() => setDepartments([]));
    adminAPI.classes.list().then((r) => setClasses(r.data || [])).catch(() => setClasses([]));
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    }

    // Validate email
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email is invalid";
    }

    // Validate password using same validation as login
    const passwordValidation = validatePassword(form.tempPassword);
    if (!passwordValidation.isValid) {
      newErrors.tempPassword = passwordValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    adminAPI.students
      .create({
        name: form.name.trim(),
        email: form.email.trim(),
        enrollmentId: form.enrollmentId.trim() || undefined,
        phone: form.phone.trim() || undefined,
        tempPassword: form.tempPassword,
        department: form.department || undefined,
        class: form.class || undefined,
      })
      .then(() => {
        success("Student registered successfully!");
        setForm({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "", department: "", class: "" });
        adminAPI.students.list().then((r) => setStudents(r.data || []));
      })
      .catch((err) => showError(err.response?.data?.error || "Failed to register student"))
      .finally(() => setLoading(false));
  };

  return (
    <AdminMobileShell
      title="Register Student"
      subtitle="Create student login credentials"
      headerColor="bg-gradient-to-r from-purple-600 to-indigo-700"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            className="input-base" 
          />
          {errors.name && <div className="text-red-500 text-sm">{errors.name}</div>}
          
          <input 
            type="text" 
            placeholder="Enrollment ID" 
            value={form.enrollmentId} 
            onChange={(e) => setForm({ ...form, enrollmentId: e.target.value })} 
            className="input-base" 
          />
          
          <input 
            type="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            className="input-base" 
          />
          {errors.email && <div className="text-red-500 text-sm">{errors.email}</div>}
          
          <input 
            type="tel" 
            placeholder="Phone" 
            value={form.phone} 
            onChange={(e) => setForm({ ...form, phone: e.target.value })} 
            className="input-base" 
          />
          
          <input 
            type="password" 
            placeholder="Temp Password (Min. 6 chars with letters, numbers, special chars)" 
            value={form.tempPassword} 
            onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} 
            className="input-base" 
          />
          {errors.tempPassword && <div className="text-red-500 text-sm">{errors.tempPassword}</div>}
          
          <select 
            value={form.department} 
            onChange={(e) => setForm({ ...form, department: e.target.value })} 
            className="input-base"
          >
            <option value="">Select Department</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          
          <select 
            value={form.class} 
            onChange={(e) => setForm({ ...form, class: e.target.value })} 
            className="input-base"
          >
            <option value="">Select Class</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          
          <button 
            onClick={handleRegister} 
            disabled={loading} 
            className="btn-primary w-full"
          >
            {loading ? "Registering..." : "Register Student"}
          </button>
        </div>
      </div>
    </AdminMobileShell>
  );
}
