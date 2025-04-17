import React, { useEffect, useState } from "react";
import SquareCheckAnimation from "./SquareCheckAnimation";
import letteringDark from "../assets/lettering_dark.svg";
import letteringWhite from "../assets/lettering_white.svg";
import { useSettings } from "../contexts/SettingsContext";
import { useMediaQuery } from "usehooks-ts";

// Animation timings - total animation 1500ms
const DURATION = 1500;
const displayTheme = document.body.classList.contains("dark")
  ? "dark"
  : "light";

const SplashScreen = () => {
  const [start, setStart] = useState(false);

  useEffect(() => {
    // Elements
    const path1 = document.querySelectorAll(
      "#splash-screen path:nth-child(1)"
    )[0];
    const path2 = document.querySelectorAll(
      "#splash-screen path:nth-child(2)"
    )[0];
    const path3 = document.querySelectorAll(
      "#splash-screen path:nth-child(3)"
    )[0];

    console.log(document.querySelectorAll("#splash-screen path"));
    if (!path1 || !path2 || !path3) {
      return;
    }

    // Set initial positions (off-screen)
    path1.setAttribute("style", "transform: translate(-100px, -150px);");
    path2.setAttribute("style", "transform: translate(100px, 200px);");
    path3.setAttribute("style", "opacity: 0;");

    // Start animation
    setTimeout(() => {
      // First element animation
      path1.animate(
        [
          { transform: "translate(-100px, -150px)" },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: DURATION / 3,
          fill: "forwards",
          easing: "ease-out",
        }
      );

      // Second element animation - starts after the first
      setTimeout(() => {
        path2.animate(
          [
            { transform: "translate(100px, 200px)" },
            { transform: "translate(0, 0)" },
          ],
          {
            duration: DURATION / 3,
            fill: "forwards",
            easing: "ease-out",
          }
        );

        // Third element animation - fade in after the second
        setTimeout(() => {
          path3.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: DURATION / 3,
            easing: "ease-out",
            fill: "forwards",
          });

          document
            .getElementById("loading-message")
            ?.classList.remove("opacity-0");
          document
            .getElementById("loading-message")
            ?.classList.add("opacity-100");

          document.getElementById("lettering")?.classList.remove("opacity-0");
          document.getElementById("lettering")?.classList.add("opacity-100");
          setStart(true);
        }, 500);
      }, 500);
    }, 0);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center h-screen w-screen bg-white dark:bg-slate-800"
      id="splash-screen"
    >
      <div
        className="flex items-center justify-center opacity-0 transition-opacity duration-500"
        id="lettering"
      >
        <img
          src={letteringDark}
          alt="lettering"
          className="w-[80%] h-full block dark:hidden"
        />
        <img
          src={letteringWhite}
          alt="lettering"
          className="w-[80%] h-full hidden dark:block"
        />
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        viewBox="0 0 300 300"
        className="size-[80%] overflow-hidden"
      >
        <defs>
          <style>
            {`
              .check { fill: #00a6f4; }
              .bar { fill: ${displayTheme === "dark" ? "#fff" : "#052f4a"}; }
              .empty { fill: none; }
            `}
          </style>
        </defs>
        <rect className="empty" width="300" height="300" />
        <g>
          <path
            id="path1"
            className="bar"
            d="M116.9,208.1c-4.9,0-9.7-2.8-11.9-7.5L67.9,121.8c-3.1-6.6-.3-14.4,6.3-17.5s14.4-.3,17.5,6.3l37.1,78.8c3.1,6.6.3,14.4-6.3,17.5-1.8.9-3.7,1.3-5.6,1.3v-.1Z"
          />
          <path
            id="path2"
            className="bar"
            d="M160.5,208.1c-4.9,0-9.7-2.8-11.9-7.5l-37.1-78.8c-3.1-6.6-.3-14.4,6.3-17.5s14.4-.3,17.5,6.3l37.1,78.8c3.1,6.6.3,14.4-6.3,17.5-1.8.9-3.7,1.3-5.6,1.3v-.1Z"
          />
          <path
            id="path3"
            className="check"
            d="M187,163.9c-.5,0-.9,0-1.4,0-3.1-.4-5.9-2.3-7.3-5.1l-20.1-37.9c-2.6-4.8-.7-10.8,4.1-13.3,4.8-2.6,10.8-.7,13.3,4.1l13.7,25.9l27-28.1c3.8-3.9,10-4,13.9-.3,3.9,3.8,4,10,.3,13.9L194,161c-1.9,1.9-4.4,3-7.1,3l.1-.1Z"
            opacity="0"
          />
        </g>
      </svg>
      <div
        id="loading-message"
        className="flex items-center justify-center space-x-4 mt-8 opacity-0 transition-opacity duration-500"
      >
        <SquareCheckAnimation start={start} />
        <div className="text-lg font-bold text-white">Loading...</div>
      </div>
    </div>
  );
};

export default SplashScreen;
