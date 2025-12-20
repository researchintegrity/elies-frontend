// src/components/common/LightboxModal.jsx
// Unified lightbox modal for image viewing with responsive design
import React, { useEffect, useState, useCallback } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiDownload, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

/**
 * LightboxModal - A responsive modal for viewing images in detail
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {string} props.imageUrl - URL of the image to display
 * @param {string} props.title - Image title/filename
 * @param {Function} props.onClose - Close handler
 * @param {React.ReactNode} props.children - Optional sidebar content (metadata, tags, etc.)
 * @param {Function} props.onPrevious - Optional handler for previous image navigation
 * @param {Function} props.onNext - Optional handler for next image navigation
 * @param {Function} props.onDownload - Optional download handler
 * @param {boolean} props.showNavigation - Whether to show prev/next buttons
 * @param {boolean} props.showSidebar - Whether to show the sidebar (default: true if children provided)
 */
const LightboxModal = ({
    isOpen,
    imageUrl,
    title = '',
    onClose,
    children,
    onPrevious,
    onNext,
    onDownload,
    showNavigation = false,
    showSidebar = true
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (onPrevious) onPrevious();
                    break;
                case 'ArrowRight':
                    if (onNext) onNext();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onPrevious, onNext]);

    // Handle body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle image load state
    const handleImageLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    useEffect(() => {
        setIsLoading(true);
    }, [imageUrl]);

    if (!isOpen) return null;

    const hasSidebar = showSidebar && children;

    return (
        <div
            className="fixed inset-0 bg-black/95 z-[1000] flex backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Image lightbox'}
        >
            {/* Close button */}
            <button
                className="absolute top-4 left-4 z-20 p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                onClick={onClose}
                aria-label="Close"
            >
                <FiX size={28} />
            </button>

            {/* Top toolbar - responsive */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                {onDownload && (
                    <button
                        className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        onClick={(e) => { e.stopPropagation(); onDownload(); }}
                        aria-label="Download"
                    >
                        <FiDownload size={20} />
                    </button>
                )}
                <button
                    className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10 hidden sm:block"
                    onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                    {isFullscreen ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
                </button>
            </div>

            {/* Main image container */}
            <div
                className={`flex-1 flex items-center justify-center p-4 sm:p-8 relative ${hasSidebar && !isFullscreen ? 'lg:mr-[360px]' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Navigation buttons - hidden on mobile */}
                {showNavigation && onPrevious && (
                    <button
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10 hidden sm:block"
                        onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                        aria-label="Previous image"
                    >
                        <FiChevronLeft size={32} />
                    </button>
                )}

                {/* Image with loading state */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                )}

                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className={`max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={handleImageLoad}
                    />
                ) : (
                    <div className="w-full h-full max-h-[80vh] aspect-video flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                )}

                {showNavigation && onNext && (
                    <button
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10 hidden sm:block"
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        aria-label="Next image"
                    >
                        <FiChevronRight size={32} />
                    </button>
                )}

                {/* Title on mobile (when no sidebar) */}
                {title && (!hasSidebar || isFullscreen) && (
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                        <p className="text-white text-sm sm:text-base font-medium truncate bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg inline-block max-w-full">
                            {title}
                        </p>
                    </div>
                )}
            </div>

            {/* Sidebar - responsive, hidden in fullscreen */}
            {hasSidebar && !isFullscreen && (
                <div
                    className="hidden lg:flex w-[360px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto flex-col gap-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Title */}
                    {title && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 break-words">
                                {title}
                            </h2>
                        </div>
                    )}

                    {/* Custom content */}
                    {children}
                </div>
            )}

            {/* Mobile swipe hint - only on mobile with navigation */}
            {showNavigation && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs sm:hidden">
                    Swipe to navigate
                </div>
            )}
        </div>
    );
};

export default LightboxModal;
