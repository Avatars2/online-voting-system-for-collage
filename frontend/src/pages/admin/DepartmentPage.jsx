import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function DepartmentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [hod, setHod] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = () => {
    adminAPI.departments.list().then((r) => setDepartments(r.data || [])).catch(() => setDepartments([]));
  };
  useEffect(() => fetch(), []);

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }
    setLoading(true);
    setError("");
    adminAPI.departments
      .create({ name: name.trim(), hod: hod.trim() || undefined })
      .then(() => {
        setName("");
        setHod("");
        fetch();
      })
      .catch((err) => setError(err.response?.data?.error || "Failed"))
      .finally(() => setLoading(false));
  };

  return (
    <AdminMobileShell
      title="Departments"
      subtitle="Institutional structure"
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">New Department</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Dept Name (e.g. Computer Science)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
          />
          <input
            type="text"
            placeholder="HOD Name (optional)"
            value={hod}
            onChange={(e) => setHod(e.target.value)}
            className="input-base"
          />
          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Department"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Active Departments</div>
          <div className="text-xs font-semibold text-gray-500">{departments.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {departments.map((d) => (
            <button
              key={d._id}
              onClick={() => navigate(`/admin/departments/${d._id}`)}
              className="w-full p-4 bg-white border rounded-xl text-left hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <p className="font-semibold text-gray-900">{d.name}</p>
              <p className="text-sm text-gray-600 mt-1">HOD: {d.hod || "Pending"}</p>
            </button>
          ))}
        </div>
      </div>
    </AdminMobileShell>
  );
}
