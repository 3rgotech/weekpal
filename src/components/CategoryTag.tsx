import React from "react";
import clsx from "clsx";
import Category from "../data/category";
import { tagStyle } from "../utils/color";

interface CategoryTagProps {
  category: Category;
  /** A completed task's tag recedes with it rather than staying the loudest thing on the card. */
  faded?: boolean;
  className?: string;
}

/**
 * A category as the redesign draws it: a soft, tinted label rather than a filled chip.
 *
 * The tint and the text are both derived from the one stored hue (`.wp-tag`), so every entry of
 * the palette gets a readable pair in both themes without a hand-kept table of sixteen of them.
 */
const CategoryTag: React.FC<CategoryTagProps> = ({ category, faded = false, className }) => (
  <span
    className={clsx(
      "wp-tag inline-flex shrink-0 items-center rounded px-[7px] py-0.5 text-[11px] font-semibold leading-4",
      faded && "opacity-60",
      className,
    )}
    style={tagStyle(category.hex)}
  >
    {category.name}
  </span>
);

export default CategoryTag;
