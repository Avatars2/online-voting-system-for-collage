import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md sm:max-w-lg">
        <div className="text-6xl sm:text-8xl lg:text-9xl font-bold text-gray-300 mb-4 sm:mb-6">404</div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white px-6 py-3 sm:py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Go Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
