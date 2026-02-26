import { useEffect, useMemo, useState } from "react";
import AdminMobileShell from "../../components/AdminMobileShell";
import { authAPI } from "../../services/api";

export default function AdminProfile(){
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", avatarUrl: "" });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await authAPI.verifyToken();
        const user = res.data?.user || null;
        setMe(user);
        setForm({
          name: user?.name || "",
          phone: user?.phone || "",
          avatarUrl: user?.avatarUrl || "",
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const avatarSrc = useMemo(() => {
    // If user has uploaded a custom avatar, show that
    if (me?.avatarUrl && me.avatarUrl.startsWith('data:')) {
      return me.avatarUrl;
    }
    // Otherwise, show white avatar
    return "https://ui-avatars.com/api/?name=" + encodeURIComponent(me?.name || "Admin") + "&background=ffffff&color=000000&size=150";
  }, [me?.name, me?.avatarUrl]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const maxSizeBytes = 1024 * 1024 * 5; // Increased to 5MB
    if (file.size > maxSizeBytes) {
      setError("Image is too large. Please select a file under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, avatarUrl: result }));
        setSuccess("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateMe({
        name: form.name.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl.trim(),
      });
      const user = res.data?.user || null;
      setMe(user);
      setSuccess("Profile updated");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return(
    <AdminMobileShell
      title="My Profile"
      subtitle="Account information"
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          ✓ {success}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 flex flex-col items-center text-center">
          <div className="relative">
            <img
              src={avatarSrc}
              alt="Admin"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-100"
              onError={(e) => {
                e.currentTarget.src = "https://i.pravatar.cc/150";
              }}
            />
            <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          </div>
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            {loading ? "Loading..." : form.name || "Admin"}
          </h2>
          <p className="text-sm text-gray-600">System Administrator</p>
          <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            SYSTEM SUPERUSER
          </span>
        </div>

        <div className="px-5 pb-5 space-y-5">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Account Information</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="text-sm text-gray-700">Email</div>
                <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                  {me?.email || "—"}
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="text-sm text-gray-700">Phone</div>
                <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                  {me?.phone || "—"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Edit Profile</div>
            <div className="space-y-3">
              <input
                className="input-base"
                placeholder="Admin name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={loading || saving}
              />
              <input
                className="input-base"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                disabled={loading || saving}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={loading || saving}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button onClick={handleSave} className="btn-primary w-full" disabled={loading || saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Quick Settings</div>
            <div className="grid grid-cols-3 gap-3">
              <a href="/admin/reset-password" className="bg-white border rounded-xl p-3 text-center hover:bg-gray-50">
                <div className="text-xl">🔒</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">Security</div>
              </a>
              <a href="/admin/notices" className="bg-white border rounded-xl p-3 text-center hover:bg-gray-50">
                <div className="text-xl">🔔</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">Alerts</div>
              </a>
              <a href="/" className="bg-white border rounded-xl p-3 text-center hover:bg-gray-50">
                <div className="text-xl">🚪</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">Logout</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminMobileShell>
  )
}
