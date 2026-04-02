import React, { type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  className?: string; // Additional classes for the wrapper
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  className = ''
}) => {
  return (
    <div className={`group relative flex ${className}`}>
      {children}
      
      {/* Tooltip Content */}
      <div
        className={`absolute z-[100] w-64 p-3 text-xs leading-relaxed text-white bg-[#262626] border border-[#494847]/40 rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.9)] opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none left-1/2 -translate-x-1/2 text-center whitespace-normal
        ${position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`}
      >
        <span className="relative z-10">{content}</span>
        
        {/* Arrow element */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent 
          ${position === 'top' 
            ? 'top-full border-t-[#262626]' 
            : 'bottom-full border-b-[#262626]'
          }`}
        />
      </div>
    </div>
  );
};
