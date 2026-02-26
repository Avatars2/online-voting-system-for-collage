/*
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function AdminClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    adminAPI.getClass(id).then((r) => setCls(r.data)).catch(() => setCls(null));
    adminAPI.students.list().then((r) => {
      const list = r.data || [];
      setStudents(list.filter((s) => s.class?._id === id || s.class === id));
    }).catch(() => setStudents([]));
  }, [id]);

  const handleEnroll = () => {
    if (!form.name.trim() || !form.email.trim() || !form.tempPassword) {
      setError("Name, Email and Temp Password are required");
      return;
    }
if (!form.name.trim() || !form.email.trim() || !form.tempPassword) {
  setError("Name, Email and Temp Password are required");
  return;
}
if (form.tempPassword.length < 6) {
  setError("Temp password must be at least 6 characters");
  return;
}adminAPI.students
  .create({
    name: form.name.trim(),
    email: form.email.trim(),
    enrollmentId: form.enrollmentId.trim() || undefined,
    phone: form.phone.trim() || undefined,
    tempPassword: form.tempPassword,
    department: cls?.department?._id || cls?.department,
    class: id,
  })
  .then(() => {
    setForm({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
    adminAPI.students.list().then((r) => {
      const list = r.data || [];
      setStudents(list.filter((s) => s.class?._id === id || s.class === id));
    });
  })
  .catch((err) => setError(err.response?.data?.error || "Failed"))
  .finally(() => setLoading(false));export async function registerStudent(req, res) {
  try {
    const { name, enrollmentId, email, phone, tempPassword, department, class: classId } = req.body || {};
    if (!name || !email || !tempPassword) {
      return res.status(400).json({ error: "name, email and tempPassword are required" });
    }
    if (String(tempPassword).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1) Email agar pehle se hai to student ko UPDATE karo
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === "admin" || existing.is_admin === true) {
        return res.status(409).json({ error: "This email is already used by the admin account" });
      }

      // Enrollment ID kisi doosre student ke paas to nahi?
      if (enrollmentId) {
        const enrollmentValue = String(enrollmentId).trim();
        const other = await User.findOne({ studentId: enrollmentValue, _id: { $ne: existing._id } });
        if (other) {
          return res.status(409).json({ error: "Enrollment ID already registered" });
        }
        existing.studentId = enrollmentValue;
      }

      existing.name = String(name).trim();
      existing.phone = phone ? String(phone).trim() : existing.phone;
      existing.department = department || existing.department;
      existing.class = classId || existing.class;
      if (tempPassword) {
        existing.password = tempPassword;
      }
      await existing.save();
      const { password: _p, ...safeExisting } = existing.toObject();
      return res.status(200).json(safeExisting);
    }

    // 2) Naya student: enrollmentId duplicate check
    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    // 3) Ab bilkul naya User create karo
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: enrollmentId ? String(enrollmentId).trim() : undefined,
      password: tempPassword,
      phone: phone ? String(phone).trim() : undefined,
      department: department || undefined,
      class: classId || undefined,
      role: "student",
      is_admin: false,
    });
    const { password: _, ...safe } = user.toObject();
    return res.status(201).json(safe);
  } catch (err) {
    console.error("registerStudent error:", err);
    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    if (err?.code === 11000) {
      const pattern = err.keyPattern || {};
      if (pattern.email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (pattern.studentId) {
        return res.status(409).json({ error: "Enrollment ID already registered" });
      }
      return res.status(409).json({ error: "Duplicate field value already exists" });
    }
    return res.status(500).json({ error: "Server error creating student" });
  }
}

    // 2) Naya student: enrollmentId duplicate check
    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    // 3) Ab bilkul naya User create karo
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: enrollmentId ? String(enrollmentId).trim() : undefined,
      password: tempPassword,
      phone: phone ? String(phone).trim() : undefined,
      department: department || undefined,
      class: classId || undefined,
      role: "student",
      is_admin: false,
    });
    const { password: _, ...safe } = user.toObject();
    return res.status(201).json(safe);
  } catch (err) {
    console.error("registerStudent error:", err);
    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    if (err?.code === 11000) {
      const pattern = err.keyPattern || {};
      if (pattern.email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (pattern.studentId) {
        return res.status(409).json({ error: "Enrollment ID already registered" });
      }
      return res.status(409).json({ error: "Duplicate field value already exists" });
    }
    return res.status(500).json({ error: "Server error creating student" });
  }
}    if (form.tempPassword.length < 6) {
      setError("Temp password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    adminAPI.students
      .create({
        name: form.name.trim(),
        email: form.email.trim(),
        enrollmentId: form.enrollmentId.trim() || undefined,
        phone: form.phone.trim() || undefined,
        tempPassword: form.tempPassword,
        department: cls?.department?._id || cls?.department,
        class: id,
      })
      .then(() => {
        setForm({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
        adminAPI.students.list().then((r) => {
          const list = r.data || [];
          setStudents(list.filter((s) => s.class?._id === id || s.class === id));
        });
      })
      .catch((err) => setError(err.response?.data?.error || "Failed"))
      .finally(() => setLoading(false));
  };

  if (!cls) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AdminMobileShell
      title={cls.name}
      subtitle={`Year ${cls.year || "—"} • ${cls.studentCount || students.length} Students`}
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo={`/admin/departments/${cls.department?._id || cls.department}`}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Student Enrollment</div>
        <div className="space-y-3">
          <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" />
          <input type="text" placeholder="Enrollment ID (e.g. 2026CS101)" value={form.enrollmentId} onChange={(e) => setForm({ ...form, enrollmentId: e.target.value })} className="input-base" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-base" />
          <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" />
          <input type="password" placeholder="Assign Temp Password" value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} className="input-base" />
          <button onClick={handleEnroll} disabled={loading} className="btn-primary w-full">
            {loading ? "Enrolling..." : "Enroll Student"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Registered Students</div>
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s._id} className="flex justify-between items-center p-3 border rounded-xl bg-white">
              <span className="font-medium text-gray-900">{s.studentId || s.email} {s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminMobileShell>
  );
}

*/


import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function AdminClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    name: "",
    enrollmentId: "",
    email: "",
    phone: "",
    tempPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    adminAPI.getClass(id)
      .then((r) => setCls(r.data))
      .catch(() => setCls(null));

    loadStudents();
  }, [id]);

  const loadStudents = () => {
    adminAPI.students.list()
      .then((r) => {
        const list = r.data || [];
        setStudents(list.filter(
          (s) => s.class?._id === id || s.class === id
        ));
      })
      .catch(() => setStudents([]));
  };

  const handleEnroll = () => {
    if (!form.name.trim() || !form.email.trim() || !form.tempPassword) {
      setError("Name, Email and Temp Password are required");
      return;
    }

    if (form.tempPassword.length < 6) {
      setError("Temp password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    adminAPI.students.create({
      name: form.name.trim(),
      email: form.email.trim(),
      enrollmentId: form.enrollmentId.trim() || undefined,
      phone: form.phone.trim() || undefined,
      tempPassword: form.tempPassword,
      department: cls?.department?._id || cls?.department,
      class: id,
    })
    .then(() => {
      setForm({
        name: "",
        enrollmentId: "",
        email: "",
        phone: "",
        tempPassword: "",
      });
      loadStudents();
    })
    .catch((err) => setError(err.response?.data?.error || "Failed"))
    .finally(() => setLoading(false));
  };

  if (!cls) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <AdminMobileShell
      title={cls.name}
      subtitle={`Year ${cls.year || "—"} • ${students.length} Students`}
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo={`/admin/departments/${cls.department?._id || cls.department}`}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Enrollment Form */}
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="font-bold mb-3">Student Enrollment</div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-base"
          />

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

          <input
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-base"
          />

          <input
            type="password"
            placeholder="Temp Password"
            value={form.tempPassword}
            onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
            className="input-base"
          />

          <button
            onClick={handleEnroll}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Enrolling..." : "Enroll Student"}
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 mt-4">
        <div className="font-bold mb-3">Registered Students</div>

        <div className="space-y-2">
          {students.map((s) => (
            <div key={s._id} className="p-3 border rounded-xl">
              {s.studentId || s.email} — {s.name}
            </div>
          ))}
        </div>
      </div>
    </AdminMobileShell>
  );
}
