
import React from 'react';
import { Undo } from 'lucide-react';

interface UndoButtonProps {
  onUndo: () => void;
}

const UndoButton: React.FC<UndoButtonProps> = ({ onUndo }) => {
  return (
    <button
      className="absolute bottom-16 right-6 z-20 bg-white/90 rounded-full p-3 shadow-md hover:bg-blue-50 transition-all hover-scale"
      onClick={onUndo}
      title="Undo"
    >
      <Undo size={28} className="text-blue-600" />
    </button>
  );
};

export default UndoButton;
