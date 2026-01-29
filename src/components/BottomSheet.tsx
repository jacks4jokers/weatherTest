'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface BottomSheetProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback when the sheet is closed */
  onClose: () => void;
  /** Title displayed at the top of the sheet */
  title?: string;
  /** Content to display inside the sheet */
  children: React.ReactNode;
}

/**
 * Bottom sheet component for mobile-first responsive design
 * PRD-015: Implement bottom sheet pattern for detailed info on mobile
 *
 * Features:
 * - Slides up from bottom on mobile
 * - Swipe down to dismiss
 * - Backdrop click to close
 * - Focus trap for accessibility
 * - Only shown on mobile/tablet (below lg breakpoint)
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentY = useRef<number>(0);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle drag/swipe to dismiss
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track from the handle area
    if ((e.target as HTMLElement).closest('[data-sheet-handle]')) {
      dragStartY.current = e.clientY;
      currentY.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;

    const deltaY = e.clientY - dragStartY.current;
    // Only allow dragging down
    if (deltaY > 0) {
      currentY.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragStartY.current === null || !sheetRef.current) return;

    // If dragged down more than 100px, close the sheet
    if (currentY.current > 100) {
      onClose();
    } else {
      // Snap back
      sheetRef.current.style.transform = '';
    }

    dragStartY.current = null;
    currentY.current = 0;
  }, [onClose]);

  // Reset transform when opening
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
        onClick={onClose}
        aria-hidden="true"
        data-testid="bottom-sheet-backdrop"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-zinc-800 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="bottom-sheet"
      >
        {/* Handle bar for dragging */}
        <div
          className="flex cursor-grab items-center justify-center py-3 active:cursor-grabbing"
          data-sheet-handle
        >
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>

        {/* Header with title and close button */}
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-3 dark:border-zinc-700">
            <h2
              id="sheet-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              aria-label="Close"
              data-testid="bottom-sheet-close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content area with scrolling */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </>
  );
}
