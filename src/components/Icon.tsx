import React from "react";

interface IconProps {
  icon: React.ElementType; // Utiliser React.ElementType pour un composant JSX
  color: string;
  size: number;
}

export const Icon = ({ icon: IconComponent, color, size }: IconProps) => {
  return <IconComponent color={color} size={size} />;
};
