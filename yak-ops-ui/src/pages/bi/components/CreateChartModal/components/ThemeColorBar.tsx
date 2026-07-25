import React from "react";

interface ThemeColorBarProps {
  colors: string[];
  compact?: boolean;
}

const ThemeColorBar: React.FC<ThemeColorBarProps> = ({
                                                       colors,
                                                       compact = false,
                                                     }) => {
  return (
    <div
      className={[
        "flex overflow-hidden rounded-full",
        compact ? "h-3 w-[220px]" : "h-5 w-[232px]",
      ].join(" ")}
    >
      {colors.map((color) => (
        <span
          key={color}
          className="flex-1"
          style={{backgroundColor: color}}
        />
      ))}
    </div>
  );
};

export default ThemeColorBar;
