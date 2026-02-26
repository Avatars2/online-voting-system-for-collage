import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function AdminDeptDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dept, setDept] = useState(null);
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    adminAPI.getDepartment(id)
      .then((r) => setDept(r.data))
      .catch(() => setDept(null));
    adminAPI.classes.list(id).then((r) => setClasses(r.data || [])).catch(() => setClasses([]));
  }, [id]);

  const handleCreateClass = () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    setLoading(true);
    setError("");
    adminAPI.classes
      .create({ name: className.trim(), department: id })
      .then(() => {
        setClassName("");
        adminAPI.classes.list(id).then((r) => setClasses(r.data || []));
      })
      .catch((err) => setError(err.response?.data?.error || "Failed"))
      .finally(() => setLoading(false));
  };

  if (!dept) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AdminMobileShell
      title={`${dept.name}`}
      subtitle={`${dept.hod || "Pending"} (HOD)`}
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo="/admin/departments"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Create New Class</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="e.g. TY-CS (C)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="input-base"
          />
          <button onClick={handleCreateClass} disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Dept Classes</div>
          <div className="text-xs font-semibold text-gray-500">{classes.length} Active</div>
        </div>
        <div className="space-y-2">
          {classes.map((c) => (
            <button
              key={c._id}
              onClick={() => navigate(`/admin/classes/${c._id}`)}
              className="w-full p-4 border rounded-xl text-left hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <p className="font-semibold text-gray-900">{c.name}</p>
              <p className="text-sm text-gray-600 mt-1">{c.year || "—"}</p>
            </button>
          ))}
        </div>
      </div>
    </AdminMobileShell>
  );
}
