import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link2,
  Paperclip,
} from 'lucide-react';

export interface ComposeToolbarProps {
  onFormat?: (tag: string) => void;
  onAttach?: () => void;
}

export const ComposeToolbar: React.FC<ComposeToolbarProps> = ({ onFormat, onAttach }) => {
  const handleFormatClick = (syntax: string) => {
    if (onFormat) {
      onFormat(syntax);
    }
  };

  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting options"
      className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-xl select-none"
    >
      {/* Font styles */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('bold')}
          title="Bold"
          aria-label="Bold"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('italic')}
          title="Italic"
          aria-label="Italic"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('underline')}
          title="Underline"
          aria-label="Underline"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('strike')}
          title="Strikethrough"
          aria-label="Strikethrough"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('left')}
          title="Align Left"
          aria-label="Align Left"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('center')}
          title="Align Center"
          aria-label="Align Center"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('right')}
          title="Align Right"
          aria-label="Align Right"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('bullet')}
          title="Bullet List"
          aria-label="Bullet List"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('numbered')}
          title="Numbered List"
          aria-label="Numbered List"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Links & Attachments */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => handleFormatClick('link')}
          title="Insert Link"
          aria-label="Insert Link"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={onAttach}
          title="Attach File"
          aria-label="Attach File"
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 active:bg-gray-300 transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

