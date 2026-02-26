import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function NoticePage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotices = () => {
    adminAPI.notices.list()
      .then((r) => setNotices(r.data || []))
      .catch(() => setNotices([]));
  };

  useEffect(() => fetchNotices(), []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError("Only PDF files are allowed");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setPdfFile(file);
    setError("");
    
    // Upload the file
    const formData = new FormData();
    formData.append('pdf', file);
    
    setUploading(true);
    try {
      const response = await fetch('http://localhost:5001/api/notices/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (response.ok) {
        setPdfUrl(data.url);
        setError("");
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      setError("Notice title is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adminAPI.notices.create({ 
        title: title.trim(), 
        body: body.trim(),
        attachment: pdfUrl
      });
      setTitle("");
      setBody("");
      setPdfFile(null);
      setPdfUrl("");
      fetchNotices();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d) => {
    if (!d) return "";
    const diff = (Date.now() - new Date(d)) / 3600000;
    if (diff < 1) return `${Math.round(diff * 60)}m ago`;
    if (diff < 24) return `${Math.round(diff)}h ago`;
    return `${Math.round(diff / 24)}d ago`;
  };

  return (
    <AdminMobileShell
      title="Notice Board"
      subtitle="Broadcast to students"
      headerColor="bg-gradient-to-r from-rose-600 to-red-600"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Draft New Notice</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Notice Title (e.g. Holiday Alert)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-base"
          />
          <textarea
            placeholder="Write your message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="input-base h-28 resize-none"
          />
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
            <label className="block">
              <div className="text-center">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm text-gray-600 mb-2">
                  {uploading ? "Uploading..." : pdfFile ? pdfFile.name : "Click to upload PDF (optional)"}
                </div>
                <div className="text-xs text-gray-500">Max size: 10MB</div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </div>
            </label>
          </div>
          
          {pdfUrl && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-700">✅ PDF uploaded successfully</p>
              <p className="text-xs text-green-600 mt-1">File will be attached to notice</p>
            </div>
          )}
          
          <button onClick={handlePublish} disabled={loading || uploading} className="btn-primary w-full">
            {loading ? "Publishing..." : uploading ? "Uploading..." : "Publish Broadcast"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Live Notices</div>
          <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
            {notices.length} ACTIVE
          </span>
        </div>
        <div className="space-y-3">
          {notices.length === 0 ? (
            <p className="text-gray-500 text-sm">No notices yet</p>
          ) : (
            notices.map((n) => (
              <div key={n._id} className="p-4 border rounded-xl bg-gray-50">
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{n.body || ""}</p>
                {n.attachment && (
                  <div className="mt-2">
                    <a 
                      href={`http://localhost:5001${n.attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      � {n.attachment.split('/').pop()}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">{formatTime(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminMobileShell>
  );
}
