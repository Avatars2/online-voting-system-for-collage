import React from 'react';

export default function EnhancedCard({
  children,
  title,
  subtitle,
  icon,
  actions,
  variant = 'default',
  hover = true,
  className = '',
  onClick,
  ...props
}) {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-lg',
    outlined: 'bg-white border-2 border-gray-300',
      gradient: 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200',
    success: 'bg-green-50 border border-green-200',
    warning: 'bg-yellow-50 border border-yellow-200',
    danger: 'bg-red-50 border border-red-200'
  };

  const classes = [
    'rounded-xl transition-all duration-200',
    variants[variant],
    hover && 'hover:shadow-md hover:border-gray-300 cursor-pointer',
    onClick && 'active:scale-[0.98]',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {(title || subtitle || icon || actions) && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && (
                <span className="text-2xl flex-shrink-0">{icon}</span>
              )}
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// Specialized card components
export function StatCard({ title, value, change, icon, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    purple: 'text-purple-600 bg-purple-100'
  };

  return (
    <EnhancedCard variant="elevated" hover={false}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm font-medium ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? '+' : ''}{change}%
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </EnhancedCard>
  );
}

export function ElectionCard({ election, onClick, status }) {
  const statusColors = {
    Active: 'bg-green-100 text-green-800',
    Upcoming: 'bg-blue-100 text-blue-800',
    Closed: 'bg-gray-100 text-gray-800'
  };

  return (
    <EnhancedCard 
      hover 
      onClick={onClick}
      className="overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">
            {election.title}
          </h3>
          {election.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {election.description}
            </p>
          )}
          {(election.startDate || election.endDate) && (
            <p className="text-xs text-gray-500 mt-2">
              📅 {election.startDate ? new Date(election.startDate).toLocaleDateString() : ""}{" "}
              - {election.endDate ? new Date(election.endDate).toLocaleDateString() : ""}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}>
          {status}
        </span>
      </div>
      {status === 'Active' && (
        <div className="mt-3 text-emerald-700 text-sm font-semibold flex items-center">
          Vote Now →
        </div>
      )}
    </EnhancedCard>
  );
}
