import clsx from "clsx";
import React from "react";
import { icons, defaultIcon } from "../utils/icon";

type ButtonColor = 'green';

interface IconButtonProps {
  icon: keyof typeof icons;
  onClick: () => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  color?: ButtonColor | null;
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

const colorClasses: Record<ButtonColor | 'default', string> = {
  green: 'border-green-700 bg-green-500 text-white hover:bg-green-600',
  default: 'border-sky-200 dark:border-sky-700 hover:bg-sky-600 hover:border-white text-slate-800 dark:text-slate-100 hover:text-white dark:hover:text-slate-800 dark:hover:bg-sky-500 dark:hover:border-sky-500 bg-white dark:bg-slate-700',
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, size = 'md', color = null, className = '' }) => {
  const Icon = icons[icon] ?? defaultIcon;
  return (
    <button className={clsx(
      'rounded-full transition-colors border',
      btnClasses[size],
      className,
      color ? colorClasses[color as ButtonColor] : colorClasses.default,
    )} onClick={onClick}>
      <Icon size={iconSizes[size]} />
    </button>
  );
};
export default IconButton;
