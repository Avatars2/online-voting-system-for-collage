import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function ClassPage() {
  const [className, setClassName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleAdd = async () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    if (!departmentId) {
      setError("Please select a department");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adminAPI.classes.create({ name: className.trim(), department: departmentId });
      setClassName("");
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
              </div>
            ))
          )}
        </div>
      </div>
    </AdminMobileShell>
  );
}
