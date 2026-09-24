import React from "react";
import { icons, defaultIcon } from "../utils/icon";
import { cn, Tooltip } from "@heroui/react";
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

/*
 * The glyph, and the room around it.
 *
 * Fixed squares rather than padding, so a row of them lines up whatever glyph each one holds:
 * `md` is the redesign's 34px toolbar button, `sm` the 28px one in a column header, `xs` the
 * 24px one inside a card.
 */
const iconSizes = {
  xs: 14,
  sm: 16,
  md: 18,
};

const btnClasses = {
  xs: "size-6",
  sm: "size-7",
  md: "size-[34px]",
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
      /*
       * Borderless by default: the redesign draws a ring only where the button is a target in
       * its own right (a card's tick), and those callers pass `border` with their own colour.
       * `cn` is tailwind-merge aware, so a caller's radius or border wins rather than ties.
       */
      className={cn(
        // `cursor-pointer` is explicit: Tailwind 4's reset gives buttons the default arrow, so
        // every icon-only control on the board — the review's tick and bin among them — looked
        // like text rather than something to press.
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer",
        "text-wp-fg-secondary hover:bg-wp-track focus-visible:outline-2 focus-visible:outline-wp-accent",
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
