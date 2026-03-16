import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function ClassPage() {
  console.log("ClassPage rendering - registerTeacher state should be available");
  const [className, setClassName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [year, setYear] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [registerTeacher, setRegisterTeacher] = useState(false);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailValidation, setEmailValidation] = useState({ isValid: false, message: "" });

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const [classesRes, deptRes] = await Promise.all([
        adminAPI.classes.list(),
        adminAPI.departments.list(),
      ]);
      setClasses(classesRes.data || []);
      setDepartments(deptRes.data || []);
      if (!departmentId && deptRes.data?.length > 0) {
        setDepartmentId(deptRes.data[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
      setClasses([]);
      setDepartments([]);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Email validation handler
  const handleEmailValidation = async (email) => {
    if (!email.trim()) {
      setEmailValidation({ isValid: false, message: "" });
      return;
    }

    try {
      const response = await fetch('/api/validate/email-quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setEmailValidation({
          isValid: result.isValid,
          message: result.message || ""
        });
      } else {
        setEmailValidation({ isValid: false, message: "Validation failed" });
      }
    } catch (error) {
      // Fallback to basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email.trim());
      setEmailValidation({
        isValid,
        message: isValid ? "" : "Please enter a valid email address"
      });
    }
  };

  const handleTeacherEmailChange = (e) => {
    const email = e.target.value;
    setTeacherEmail(email);
    handleEmailValidation(email);
  };

  const handleAdd = async () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    if (!departmentId) {
      setError("Please select a department");
      return;
    }
    
    if (registerTeacher) {
      if (!teacherEmail.trim() || !teacherPassword.trim()) {
        setError("Teacher email and password are required when registering teacher");
        return;
      }
      if (!emailValidation.isValid) {
        setError("Please enter a valid teacher email address");
        return;
      }
      if (teacherPhone.trim() && !/^[+]?[\d\s\-\(\)]+$/.test(teacherPhone.trim())) {
        setError("Please enter a valid teacher phone number");
        return;
      } else if (teacherPhone.trim() && teacherPhone.replace(/\D/g, '').length < 10) {
        setError("Teacher phone number must have at least 10 digits");
        return;
      }
    }
    
    setLoading(true);
    setError("");
    
    const payload = { 
      name: className.trim(), 
      department: departmentId,
      year: year.trim() || undefined
    };
    
    if (registerTeacher) {
      payload.teacherEmail = teacherEmail.trim();
      payload.teacherPassword = teacherPassword;
      payload.teacherPhone = teacherPhone.trim();
      payload.teacher = teacherName.trim() || `Teacher of ${className.trim()}`;
    }
    
    try {
      await adminAPI.classes.create(payload);
      setClassName("");
      setYear("");
      setTeacherName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherPhone("");
      setRegisterTeacher(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminMobileShell
      title="Class Manager"
      subtitle="Create and view classes"
      headerColor="bg-gradient-to-r from-indigo-600 to-purple-700"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Add Class</div>
        <div className="space-y-3">
          <select
            className="input-base"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="input-base"
            placeholder="Class name (e.g., CS-A)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            className="input-base"
            placeholder="Year (e.g., 1st Year)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={loading}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="registerTeacher"
              checked={registerTeacher}
              onChange={(e) => {
                console.log("Checkbox clicked:", e.target.checked);
                setRegisterTeacher(e.target.checked);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="registerTeacher" className="text-sm font-medium text-gray-700">
              Register Teacher for this class
            </label>
          </div>

          {registerTeacher && (
            <>
              <input
                type="text"
                placeholder="Teacher Name (optional)"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="input-base"
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Teacher Email (required)"
                value={teacherEmail}
                onChange={handleTeacherEmailChange}
                className={`input-base ${
                  error && error.includes("email") ? 'border-red-500' : 
                  teacherEmail && emailValidation.isValid ? 'border-green-500' : 
                  teacherEmail ? 'border-red-500' : ''
                }`}
                disabled={loading}
              />
              {teacherEmail && error && error.includes("email") && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
              {teacherEmail && !error && emailValidation.message && (
                <p className={`text-xs mt-1 ${
                  emailValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {emailValidation.message}
                </p>
              )}
              {teacherEmail && !error && emailValidation.isValid && (
                <p className="text-xs text-green-600 mt-1">✓ Valid email address</p>
              )}
              <input
                type="password"
                placeholder="Teacher Password (required)"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                className="input-base"
                disabled={loading}
              />
              <input
                type="tel"
                placeholder="Teacher Phone (optional)"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                className={`input-base ${
                  error && error.includes("phone") ? 'border-red-500' : 
                  teacherPhone && !error.includes("phone") ? 'border-green-500' : ''
                }`}
                disabled={loading}
              />
              {teacherPhone && error && error.includes("phone") && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
              {teacherPhone && !error && !error.includes("phone") && (
                <p className="text-xs text-green-600 mt-1">✓ Valid phone number</p>
              )}
            </>
          )}
          
          <button onClick={handleAdd} className="btn-primary w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Class"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-gray-900">Classes</div>
          <div className="text-xs font-semibold text-gray-500">{classes.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {classes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-600">
              No classes yet
            </div>
          ) : (
            classes.map((cls) => (
              <div key={cls._id} className="p-4 border rounded-xl bg-white">
                <div className="font-semibold text-gray-900">{cls.name}</div>
                {cls.department?.name ? (
                  <div className="text-sm text-gray-600 mt-1">{cls.department.name}</div>
                ) : null}
                {cls.year && (
                  <div className="text-sm text-gray-500 mt-1">{cls.year}</div>
                )}
                <div className="text-sm text-gray-600 mt-1">
                  Teacher: {cls.classTeacher?.name || "Pending"}
                </div>
                {cls.classTeacher?.email && (
                  <div className="text-xs text-gray-500 mt-1">{cls.classTeacher.email}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminMobileShell>
  );
}
