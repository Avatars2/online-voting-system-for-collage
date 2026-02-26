import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

export const ElectionSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0 flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-3 gap-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white rounded-xl border-2 border-gray-100 p-4 text-center shadow-sm animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
      </div>
    ))}
  </div>
);

export const ButtonSkeleton = ({ width = 'full' }) => (
  <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${width === 'full' ? 'w-full' : 'w-32'}`}></div>
);

export const FormSkeleton = () => (
  <div className="space-y-4">
    <div>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
    <div>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
    <div className="h-10 bg-gray-200 rounded w-full"></div>
  </div>
);

export default {
  CardSkeleton,
  ElectionSkeleton,
  StatsSkeleton,
  ButtonSkeleton,
  FormSkeleton
};
