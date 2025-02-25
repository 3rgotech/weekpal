import clsx from "clsx";
import React from "react";
import { icons, defaultIcon } from "../utils/icon";

interface IconButtonProps {
  icon: keyof typeof icons;
  onClick: () => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  color?: string;
}

const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
}

const btnClasses = {
  xs: 'p-0.5',
  sm: 'p-1',
  md: 'p-2',
}

const iconClasses = {};

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, size = 'md', color = 'currentColor', className = '' }) => {
  const Icon = icons[icon] ?? defaultIcon;
  return (
    <button className={clsx('rounded-full border border-gray-300',
      btnClasses[size],
      className
    )} onClick={onClick}>
      <Icon size={iconSizes[size]} color={color} />
    </button>
  );
};
export default IconButton;
