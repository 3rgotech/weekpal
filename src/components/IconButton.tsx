import React from "react";

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  small?: boolean;
  className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, small = false, className = '' }) => (
  <button className={`rounded-full border border-gray-300 ${small ? "p-1" : "p-2"} ${className}`} onClick={onClick}>
    {icon}
  </button>
);

export default IconButton;
