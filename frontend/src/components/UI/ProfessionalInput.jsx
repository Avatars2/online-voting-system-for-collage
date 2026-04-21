import React, { useState } from 'react';

export default function ProfessionalInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched,
  disabled = false,
  required = false,
  autoComplete,
  icon,
  className = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = touched && error;
  const inputId = `input-${name}`;

  // Professional validation states
  const getStateClasses = () => {
    if (disabled) return 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200';
    if (hasError) return 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500';
    if (isFocused) return 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20';
    return 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500';
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Professional label with required indicator */}
      {label && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-medium transition-colors ${
            hasError ? 'text-red-700' : isFocused ? 'text-blue-700' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Icon with professional styling */}
        {icon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
            hasError ? 'text-red-400' : isFocused ? 'text-blue-500' : 'text-gray-400'
          }`}>
            <span className="text-sm">{icon}</span>
          </div>
        )}

        {/* Professional input with enhanced states */}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          className={`block w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            icon ? 'pl-10' : ''
          } ${getStateClasses()}`}
          {...props}
        />

        {/* Professional password toggle */}
        {type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center group"
            onClick={() => {
              const input = document.getElementById(inputId);
              input.type = input.type === 'password' ? 'text' : 'password';
            }}
            aria-label="Toggle password visibility"
          >
            <span className="text-gray-400 hover:text-gray-600 group-hover:text-gray-700 transition-colors text-sm">
              👁️
            </span>
          </button>
        )}

        {/* Professional validation indicator */}
        {touched && !hasError && value && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-green-500 text-sm">✓</span>
          </div>
        )}
      </div>

      {/* Professional error message */}
      {hasError && (
        <div className="flex items-start space-x-2 animate-in slide-in-from-top-1">
          <span className="text-red-500 text-xs mt-0.5 flex-shrink-0">•</span>
          <p id={`${inputId}-error`} className="text-sm text-red-600 font-medium leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {/* Professional success state (optional) */}
      {touched && !hasError && value && !error && (
        <p className="text-sm text-green-600 font-medium flex items-center space-x-1">
          <span>✓</span>
          <span>Valid</span>
        </p>
      )}
    </div>
  );
}
