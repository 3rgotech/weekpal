import React, { JSX } from "react";

interface IconProps {
  icon: JSX.Element;
  color: string;
  size: number;
}

export const Icon = ({ icon: IconComponent, color, size }: IconProps) => {
  return <IconComponent color={color} size={size} />;
};
