
import React from 'react';
import BoardField from '../BoardField';
import { Field, MarbleObj } from '@/types/game';
import { getCirclePosition, HOME_POSITIONS, TARGET_STARTS } from '@/utils/gamePositions';

interface BoardFieldsProps {
  fields: Field[];
  selected: number | null;
  onFieldClick: (idx: number) => void;
}

const BoardFields: React.FC<BoardFieldsProps> = ({ fields, selected, onFieldClick }) => {
  const fieldPos = (field: Field) => {
    if (field.type === "circle") {
      return getCirclePosition(field.idx);
    }
    if (field.type === "target") {
      const start = TARGET_STARTS[field.player];
      return {
        x: start.x + start.dx * field.idx,
        y: start.y + start.dy * field.idx,
      };
    }
    if (field.type === "home") {
      const base = HOME_POSITIONS[field.player];
      return {
        x: base.x + 48 * (field.idx % 2),
        y: base.y + 48 * Math.floor(field.idx / 2),
      };
    }
    return { x: 0, y: 0 };
  };

  return (
    <>
      {/* Circle fields */}
      {fields
        .filter(f => f.type === "circle")
        .map((field, i) => {
          const idx = fields.indexOf(field);
          const { x, y } = fieldPos(field);
          return (
            <BoardField
              key={`c-${i}`}
              x={x}
              y={y}
              marble={field.marble}
              isSelected={selected === idx}
              onClick={() => onFieldClick(idx)}
              size={36}
              highlight={selected !== null}
            />
          );
        })}

      {/* Target fields */}
      {fields
        .filter(f => f.type === "target")
        .map((field, i) => {
          const idx = fields.indexOf(field);
          const { x, y } = fieldPos(field);
          return (
            <BoardField
              key={`t-${i}`}
              x={x}
              y={y}
              marble={field.marble}
              isSelected={selected === idx}
              isTarget
              bgColor="#e3eeff"
              onClick={() => onFieldClick(idx)}
              size={36}
              highlight={selected !== null}
            />
          );
        })}

      {/* Home fields */}
      {fields
        .filter(f => f.type === "home")
        .map((field, i) => {
          const idx = fields.indexOf(field);
          const { x, y } = fieldPos(field);
          return (
            <BoardField
              key={`h-${i}`}
              x={x}
              y={y}
              marble={field.marble}
              isSelected={selected === idx}
              isHome
              bgColor="#fafafb"
              onClick={() => onFieldClick(idx)}
              size={36}
              highlight={selected !== null}
            />
          );
        })}
    </>
  );
};

export default BoardFields;
