
import React from "react";
import Marble from "./Marble";

type BoardFieldProps = {
  x: number;
  y: number;
  marble?: { color: string; player: number } | null;
  isSelected: boolean;
  isHome?: boolean;
  isTarget?: boolean;
  size?: number;
  onClick: () => void;
  highlight?: boolean;
  bgColor?: string;
};

const BoardField: React.FC<BoardFieldProps> = ({
  x, y, marble, isSelected, isHome, isTarget, size = 36, onClick, highlight, bgColor
}) => {
  return (
    <g
      onClick={onClick}
      style={{ cursor: marble ? "pointer" : "default" }}
      className={highlight ? "hover-scale" : ""}
      tabIndex={0}
      aria-label="Board Field"
    >
      <circle
        cx={x}
        cy={y}
        r={size / 2}
        fill={bgColor ?? (isHome ? "#eee" : isTarget ? "#e2faff" : "#f0e6db")}
        stroke="#b19765"
        strokeWidth={2}
        className="transition-all"
      />
      {marble && (
        <g transform={`translate(${x - size / 2},${y - size / 2})`}>
          <Marble color={marble.color} size={size} selected={isSelected} />
        </g>
      )}
    </g>
  );
};

export default BoardField;
