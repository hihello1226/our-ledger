'use client';

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

export default function FloatingActionButton({
  onClick,
  label = '+',
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg z-50 flex items-center justify-center text-2xl font-medium hover:bg-blue-700 active:scale-95 transition-all"
      aria-label="추가"
    >
      {label}
    </button>
  );
}
