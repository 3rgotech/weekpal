import clsx from "clsx";
import React from "react";
import { icons, defaultIcon } from "../utils/icon";
import { Tooltip } from "@heroui/react";
import * as _heroui_aria_utils from '@heroui/aria-utils';
import { TOOLTIP_CLASSES } from "../utils/color";


type ButtonColor = "green";

interface IconButtonProps {
  icon: keyof typeof icons;
  onClick: () => void;
  size?: "xs" | "sm" | "md";
  iconClass?: string;
  wrapperClass?: string;
  tooltip?: string | false;
  tooltipPosition?: _heroui_aria_utils.OverlayPlacement;
  tooltipClass?: string;
  tooltipArrowClass?: string;
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
  tooltip = false,
  tooltipPosition = undefined,
  tooltipClass = undefined,
  tooltipArrowClass = undefined,
}) => {
  const Icon = icons[icon] ?? defaultIcon;
  const button = (
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

  if (!tooltip) return button;

  return (
    <Tooltip
      content={tooltip}
      placement={tooltipPosition}
      closeDelay={1000}
      showArrow={true}
      classNames={tooltipClass ? {
        base: tooltipClass,
        arrow: tooltipArrowClass,
      } : TOOLTIP_CLASSES}
    >
      {button}
    </Tooltip>
  );
};
export default IconButton;
