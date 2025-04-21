
import React from "react";

type MarbleProps = {
  color: string;
  size?: number;
  selected?: boolean;
};

const Marble: React.FC<MarbleProps> = ({ color, size = 48, selected }) => (
  <circle
    cx={size / 2}
    cy={size / 2}
    r={size / 2 - 4}
    fill={color}
    stroke="#fff"
    strokeWidth={selected ? 4 : 2}
    style={{
      filter: selected
        ? "drop-shadow(0 0 10px #0006)"
        : "drop-shadow(0 1px 2px #0003)",
      transition: "stroke-width 0.12s, filter 0.2s",
    }}
  />
);

export default Marble;
