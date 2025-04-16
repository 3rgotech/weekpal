import React, { useState, useEffect } from "react";
import { Square, SquareCheckBig } from "lucide-react";

const DURATION = 300;

const SquareCheckAnimation = ({ start }: { start: boolean }) => {
  const [squares, setSquares] = useState([false, false, false]);
  const [direction, setDirection] = useState("forward");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState([1, 1, 1]); // Opacity values for each square

  useEffect(() => {
    if (!start) return;

    // Handle the fade-in/fade-out effect
    const fadeInterval = setInterval(() => {
      if (direction === "forward" && currentIndex < 3) {
        // Start fading current square
        setOpacity((prev) => {
          const newOpacity = [...prev];
          newOpacity[currentIndex] = 0; // Fade out current square
          return newOpacity;
        });

        // After fade out completes, change the icon and fade back in
        setTimeout(() => {
          setSquares((prev) => {
            const newSquares = [...prev];
            newSquares[currentIndex] = true; // Change to check square
            return newSquares;
          });

          setOpacity((prev) => {
            const newOpacity = [...prev];
            newOpacity[currentIndex] = 1; // Fade in the check square
            return newOpacity;
          });

          // Proceed to next square after completing animation
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
          }, DURATION / 4);
        }, DURATION / 4);
      } else if (direction === "backward" && currentIndex < 3) {
        // Start fading current square
        setOpacity((prev) => {
          const newOpacity = [...prev];
          newOpacity[currentIndex] = 0; // Fade out current check square
          return newOpacity;
        });

        // After fade out completes, change the icon and fade back in
        setTimeout(() => {
          setSquares((prev) => {
            const newSquares = [...prev];
            newSquares[currentIndex] = false; // Change back to regular square
            return newSquares;
          });

          setOpacity((prev) => {
            const newOpacity = [...prev];
            newOpacity[currentIndex] = 1; // Fade in the regular square
            return newOpacity;
          });

          // Proceed to next square after completing animation
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
          }, DURATION / 4);
        }, DURATION / 4);
      } else {
        // Change direction when all squares are processed
        setDirection((prev) => (prev === "forward" ? "backward" : "forward"));
        setCurrentIndex(0);
      }
    }, DURATION); // Overall animation timing

    return () => clearInterval(fadeInterval);
  }, [currentIndex, direction, start]);

  return (
    <div className="flex items-center justify-center space-x-2">
      {squares.map((isChecked, idx) => (
        <div
          key={idx}
          className="relative h-8 w-8 flex items-center justify-center"
        >
          {/* Regular square */}
          <div
            className="absolute transition-opacity duration-300"
            style={{ opacity: isChecked ? 0 : opacity[idx] }}
          >
            <Square size={32} className="text-white" strokeWidth={2} />
          </div>

          {/* Check square */}
          <div
            className="absolute transition-opacity duration-300"
            style={{ opacity: isChecked ? opacity[idx] : 0 }}
          >
            <SquareCheckBig
              size={32}
              className="text-blue-600"
              strokeWidth={2}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SquareCheckAnimation;
