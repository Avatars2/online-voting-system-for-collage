export default function SmallCard({ title, onClick, icon = "📋" }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm hover:shadow-md active:shadow-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95 min-h-32 flex flex-col items-center justify-center text-center"
    >
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className="font-semibold text-base md:text-lg text-gray-900">{title}</h3>
    </div>
  );
}
