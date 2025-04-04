import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const CubeIcon: React.FC<IconProps> = ({ size = 24, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
};

export const BoxModel: React.FC<IconProps> = ({ size = 24, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 4h16v16H4z"></path>
      <path d="M8 8h8v8H8z"></path>
      <path d="M12 4v16"></path>
      <path d="M4 12h16"></path>
    </svg>
  );
};

export const Move3D: React.FC<IconProps> = ({ size = 24, className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 9l-3 3 3 3"></path>
      <path d="M9 5l3-3 3 3"></path>
      <path d="M15 19l3 3 3-3"></path>
      <path d="M19 9l3 3-3 3"></path>
      <path d="M2 12h20"></path>
      <path d="M12 2v20"></path>
      <circle cx="12" cy="12" r="4"></circle>
    </svg>
  );
};