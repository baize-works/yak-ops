import React from "react";

export function WelcomeMarkIcon({
                                  size = 22,
                                  color = "#111827",
                                }: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* left small dot */}
      <circle cx="6.3" cy="12" r="1.35" fill={color}/>

      {/* plus (rounded) */}
      <rect x="10.2" y="4.6" width="3.6" height="14.8" rx="1.8" fill={color}/>
      <rect x="4.6" y="10.2" width="14.8" height="3.6" rx="1.8" fill={color}/>
    </svg>
  );
}
