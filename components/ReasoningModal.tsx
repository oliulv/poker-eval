'use client';

interface ReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasoning: string | null;
  model: string;
  action: string;
}

export default function ReasoningModal({
  isOpen,
  onClose,
  reasoning,
  model,
  action,
}: ReasoningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 text-white p-6 rounded-lg border-2 border-amber-500 max-w-2xl w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{model} - {action}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          {reasoning ? (
            <p className="text-gray-200">{reasoning}</p>
          ) : (
            <p className="text-gray-400 italic">Loading reasoning...</p>
          )}
        </div>
      </div>
    </div>
  );
}

