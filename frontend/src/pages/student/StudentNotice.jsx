import { useState, useEffect } from "react";
import { noticesAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function StudentNotice() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await noticesAPI.list();
        setNotices(res.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load notices");
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <StudentMobileShell
      title="Notices"
      subtitle="Announcements & updates"
      backTo="/student/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-white/90 text-sm">Loading...</div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-600">
          No notices yet
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-semibold text-gray-900">{notice.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{notice.body || ""}</p>
              {notice.attachment && (
                <div className="mt-3">
                  <a 
                    href={`http://localhost:5001${notice.attachment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    📄 Download PDF
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </StudentMobileShell>
  );
}
