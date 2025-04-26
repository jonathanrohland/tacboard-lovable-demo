
import React from 'react';
import { BOARD_SIZE, CENTER, CIRCLE_RADIUS } from '@/utils/gamePositions';

const BoardBackground: React.FC = () => {
  return (
    <>
      <img
        src="/lovable-uploads/6bdc1463-fdb3-45f1-96f1-af0281030cd6.png"
        alt="Tac Board"
        className="absolute left-0 top-0 w-full h-full object-cover rounded-xl z-0"
        draggable={false}
        style={{ opacity: 0.22, pointerEvents: "none" }}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={CIRCLE_RADIUS}
        fill="#f8f8f6"
        stroke="#b19765"
        strokeWidth={5}
      />
    </>
  );
};

export default BoardBackground;
