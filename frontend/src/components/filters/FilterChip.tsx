'use client';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export default function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-blue-500 hover:text-blue-700 font-bold"
      >
        &times;
      </button>
    </span>
  );
}
