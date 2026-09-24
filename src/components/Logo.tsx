import React from "react";

import iconWhite from "../assets/icon_white.svg";
import iconDark from "../assets/icon_dark.svg";

/**
 * The WeekPal mark, sized for the redesign's 60px bar.
 *
 * The brand's own icon rather than the generic calendar glyph the design mock-up used as a
 * stand-in — one per theme, since the mark is drawn in a single ink.
 */
const Logo: React.FC = () => (
  <div className="flex shrink-0 items-center">
    <img src={iconWhite} alt="WeekPal" className="size-9 hidden dark:block" />
    <img src={iconDark} alt="WeekPal" className="size-9 block dark:hidden" />
  </div>
);

export default Logo;
