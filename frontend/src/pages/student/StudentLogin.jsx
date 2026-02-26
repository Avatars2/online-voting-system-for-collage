import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function StudentLogin(){
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    setError("");
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!pass) {
      setError("Password is required");
      return;
    }
    nav("/student/dashboard");
  };

  return(
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✓</div>
          <h1 className="text-3xl font-bold text-gray-900">Voting</h1>
          <p className="text-gray-600 mt-2">Student Login</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); login(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="input-base"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              className="input-base"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors w-full mt-6"
          >
            Sign In
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">Demo Credentials:</p>
          <p className="text-xs text-gray-500 text-center">
            Email: student@mail.com<br/>
            Password: student123
          </p>
        </div>
      </div>
    </div>
  )
}
