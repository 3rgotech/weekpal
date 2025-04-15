import clsx from "clsx";
import React from "react";
import { icons, defaultIcon } from "../utils/icon";

type ButtonColor = "green";

interface IconButtonProps {
  icon: keyof typeof icons;
  onClick: () => void;
  size?: "xs" | "sm" | "md";
  iconClass?: string;
  wrapperClass?: string;
}

const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
};

const btnClasses = {
  xs: "p-0.5",
  sm: "p-1",
  md: "p-2",
};

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  size = "md",
  iconClass = "",
  wrapperClass = "",
}) => {
  const Icon = icons[icon] ?? defaultIcon;
  return (
    <button
      className={clsx(
        "rounded-full transition-colors border",
        btnClasses[size],
        wrapperClass,
        iconClass
      )}
      onClick={onClick}
    >
      <Icon size={iconSizes[size]} className={iconClass} />
    </button>
  );
};
export default IconButton;
