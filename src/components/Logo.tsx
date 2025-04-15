import React from "react";

import iconWhite from "../assets/icon_white.svg";
import iconDark from "../assets/icon_dark.svg";

const Logo: React.FC = () => (
  <div className="flex justify-center items-center bg-slate-200 dark:bg-sky-900">
    <img src={iconWhite} alt="Logo" className="w-16 h-16 hidden dark:block" />
    <img src={iconDark} alt="Logo" className="w-16 h-16 block dark:hidden" />
  </div>
);

export default Logo;
