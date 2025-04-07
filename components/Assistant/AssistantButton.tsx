import React, { useState } from 'react';
import { IconQuestionMark } from '@tabler/icons-react';
import { HelpModal } from './HelpModal';

interface Props {
  onClick?: () => void;
}

export const AssistantButton: React.FC<Props> = ({ onClick }) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#D42121] text-white shadow-lg hover:bg-[#B31B1B] transition-colors duration-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsHelpModalOpen(true);
          if (onClick) onClick();
        }}
        title="Help"
      >
        <IconQuestionMark size={20} />
      </button>
      <HelpModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </>
  );
}; 