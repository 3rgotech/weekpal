import React from "react";

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick }) => (
  <button className="rounded-full p-2 border border-gray-300" onClick={onClick}>
    {icon}
  </button>
);

export default IconButton;
