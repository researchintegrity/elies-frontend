import React, { useRef, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import AnnotationOverlay from '../AnnotationOverlay';

const AnalysisCanvas = ({
    selectedImage,
    analyzing,
    resultCanvas,
    originalCanvas,
    showOriginal,
    zoomLevel,
    setZoomLevel,
    // Annotation props
    crop,
    setCrop,
    showAnnotations,
    annotations,
    onAnnotationClick,
    selectedAnnotationId,
    t
}) => {
    const zoomContainerRef = useRef(null);
    const resultCanvasRef = useRef(null);

    // Handle wheel zoom - simplified approach matching AnnotationModal
    useEffect(() => {
        const container = zoomContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoomLevel(z => Math.min(4, Math.max(0.25, z + delta)));
            }
        };

        const handleGestureStart = (e) => { e.preventDefault(); };
        const handleGestureChange = (e) => {
            e.preventDefault();
            const scaleChange = e.scale - 1;
            setZoomLevel(prev => Math.min(4, Math.max(0.25, prev + (scaleChange * 0.1))));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('gesturestart', handleGestureStart, { passive: false });
        container.addEventListener('gesturechange', handleGestureChange, { passive: false });

        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
                container.removeEventListener('gesturestart', handleGestureStart);
                container.removeEventListener('gesturechange', handleGestureChange);
            }
        };
    }, [setZoomLevel]);

    // Draw the analysis result resultCanvas (offscreen) to the visible canvas
    useEffect(() => {
        if (resultCanvas && resultCanvasRef.current) {
            const canvas = resultCanvasRef.current;
            const ctx = canvas.getContext('2d');

            // Match dimensions
            if (canvas.width !== resultCanvas.width || canvas.height !== resultCanvas.height) {
                canvas.width = resultCanvas.width;
                canvas.height = resultCanvas.height;
            }

            // Draw content
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultCanvas, 0, 0);
        }
    }, [resultCanvas, showOriginal]);

    if (!selectedImage) return null;

    return (
        <div className="relative w-full h-full">
            {/* Loading Overlay */}
            <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${analyzing ? 'opacity-100 pointer-events-auto delay-200' : 'opacity-0 pointer-events-none'}`}>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                    <FiRefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('analysis.processing') || 'Processing...'}</p>
                </div>
            </div>

            <div
                ref={zoomContainerRef}
                className="w-full h-full overflow-auto flex items-center justify-center p-6 bg-gray-100 dark:bg-gray-900"
                onDoubleClick={() => setZoomLevel(1)}
            >
                {/* Simplified zoom approach matching AnnotationModal - CSS transform-based */}
                <div
                    className="relative flex items-center justify-center"
                    style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out',
                    }}
                >
                    {showOriginal && originalCanvas ? (
                        <AnnotationOverlay
                            isActive={false}
                            crop={crop}
                            onChange={setCrop}
                            annotations={showAnnotations ? annotations : []}
                            onAnnotationClick={onAnnotationClick}
                            selectedAnnotationId={selectedAnnotationId}
                        >
                            <img
                                src={originalCanvas.toDataURL()}
                                alt="Original"
                                className="rounded-lg shadow-lg select-none"
                                draggable={false}
                                style={{
                                    maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                    maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none',
                                }}
                            />
                        </AnnotationOverlay>
                    ) : (resultCanvas || originalCanvas) ? (
                        <AnnotationOverlay
                            isActive={false}
                            crop={crop}
                            onChange={setCrop}
                            annotations={showAnnotations ? annotations : []}
                            onAnnotationClick={onAnnotationClick}
                            selectedAnnotationId={selectedAnnotationId}
                        >
                            <canvas
                                ref={resultCanvasRef}
                                className="rounded-lg shadow-lg"
                                style={{
                                    maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                    maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none',
                                }}
                            />
                        </AnnotationOverlay>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default AnalysisCanvas;
