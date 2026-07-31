import React from 'react';

export default function ToolSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 animate-pulse pb-16">
      {/* Header Skeleton */}
      <div className="text-center space-y-4 pt-4">
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
          <div className="h-10 w-64 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-4 w-96 bg-gray-100 rounded mx-auto mt-2"></div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-col lg:flex-row gap-8 items-start h-[500px]">
        {/* Canvas Area Skeleton */}
        <div className="w-full lg:w-2/3 h-full bg-gray-100 rounded-3xl p-6 shadow-inner border border-gray-200 flex items-center justify-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center opacity-50">
             {/* Inner circle */}
             <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col h-full gap-6">
          <div className="h-6 w-1/2 bg-gray-200 rounded-lg"></div>
          
          <div className="space-y-4 flex-1 mt-4">
            <div className="h-24 w-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl"></div>
            <div className="h-12 w-full bg-gray-100 rounded-xl"></div>
            <div className="h-12 w-full bg-gray-100 rounded-xl"></div>
          </div>

          <div className="h-14 w-full bg-gray-200 rounded-xl mt-auto"></div>
        </div>
      </div>
    </div>
  );
}
