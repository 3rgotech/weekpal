import clsx from "clsx";
import React from "react";
import { icons, defaultIcon } from "../utils/icon";
import { Tooltip } from "@heroui/react";
import type { Placement } from "react-aria-components";
import { TOOLTIP_CLASSES } from "../utils/color";


type ButtonColor = "green";

interface IconButtonProps {
  icon: keyof typeof icons;
  /** A tooltip is not an accessible name — buttons that are icon-only need this too. */
  'aria-label'?: string;
  onClick?: () => void;
  size?: "xs" | "sm" | "md";
  iconClass?: string;
  wrapperClass?: string;
  tooltip?: string | false;
  tooltipPosition?: Placement;
  tooltipClass?: string;
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
  onClick = () => { },
  size = "md",
  iconClass = "",
  wrapperClass = "",
  tooltip = false,
  tooltipPosition = undefined,
  tooltipClass = undefined,
  ...otherProps
}) => {
  const Icon = icons[icon] ?? defaultIcon;

  // These buttons are icon-only, so without this they reach a screen reader as "button" and
  // nothing else. The tooltip already says what the control does, so it is the name — an
  // explicit `aria-label` still wins, for the cases where the two should differ.
  const accessibleName = otherProps['aria-label']
    ?? (typeof tooltip === 'string' ? tooltip : undefined);

  const button = (
    <button
      {...otherProps}
      aria-label={accessibleName}
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
    <Tooltip closeDelay={1000}>
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content
        placement={tooltipPosition}
        showArrow
        className={tooltipClass ?? TOOLTIP_CLASSES}
      >
        {tooltip}
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip>
  );
};
export default IconButton;
