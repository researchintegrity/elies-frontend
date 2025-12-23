import React from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

/**
 * AnnotationOverlay
 * 
 * A controlled component that adds annotation capabilities to its children.
 * 
 * @param {Object} props
 * @param {boolean} props.isActive - Whether annotation mode is enabled (enables cropping)
 * @param {Object} props.crop - Current crop selection (from parent)
 * @param {Function} props.onChange - Callback for crop changes
 * @param {Function} props.onComplete - Callback for crop completion
 * @param {Array} props.annotations - List of existing annotations to display
 * @param {Function} props.onAnnotationClick - Callback when an existing annotation is clicked
 * @param {string} props.selectedAnnotationId - ID of currently selected/editing annotation
 * @param {React.ReactNode} props.children - The content to annotate (image or canvas)
 */
const AnnotationOverlay = ({
    isActive,
    crop,
    onChange,
    onComplete,
    annotations = [],
    onAnnotationClick,
    selectedAnnotationId,
    children
}) => {

    // Helper for colors
    const getGroupColor = (type, id) => {
        if (type !== 'copy-move') return '#EF4444'; // Red for general manipulation
        const colors = [
            '#3B82F6', // Blue
            '#10B981', // Green
            '#F59E0B', // Amber
            '#8B5CF6', // Purple
            '#EC4899', // Pink
            '#06B6D4', // Cyan
        ];
        return colors[(id - 1) % colors.length] || '#3B82F6';
    };

    return (
        <div className="relative inline-block max-w-full max-h-full">
            <ReactCrop
                crop={isActive ? crop : undefined}
                onChange={isActive ? onChange : undefined}
                onComplete={isActive ? onComplete : undefined}
                disabled={!isActive}
                className="max-w-full max-h-full"
                keepSelection={true}
            >
                {children}
            </ReactCrop>

            {/* Existing Annotations Layer */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[150]">
                {annotations.map(anno => {
                    const { x, y, width, height } = anno.coords || {};
                    const color = getGroupColor(anno.type, anno.group_id);
                    const shapeType = anno.shape_type || 'rectangle';

                    // Don't render invalid coords
                    if (!Number.isFinite(x) || !Number.isFinite(width)) return null;

                    // Don't render the selected one (if we want to show it as the active crop instead?)
                    // Usually we want to highlight it or let the user edit it. 
                    // If selectedAnnotationId matches, we might hide this static box and let the parent set the 'crop' to matches these coords, 
                    // effectively turning it into the active selection.
                    if (anno._id === selectedAnnotationId) return null;

                    // Render ellipse shape
                    if (shapeType === 'ellipse') {
                        return (
                            <div
                                key={anno._id}
                                className={`absolute transition-all group pointer-events-auto ${isActive ? 'cursor-pointer hover:opacity-100' : 'opacity-80'}`}
                                style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    width: `${width}%`,
                                    height: `${height}%`,
                                }}
                                onClick={(e) => {
                                    if (isActive && onAnnotationClick) {
                                        e.stopPropagation();
                                        onAnnotationClick(anno);
                                    }
                                }}
                                title={anno.text || anno.type}
                            >
                                <svg
                                    className="absolute inset-0 w-full h-full overflow-visible"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    <ellipse
                                        cx="50"
                                        cy="50"
                                        rx="50"
                                        ry="50"
                                        fill={`${color}33`}
                                        stroke={color}
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                                {/* Badge for Group ID */}
                                {anno.type === 'copy-move' && anno.group_id && (
                                    <div
                                        className="absolute -top-3 -left-0.5 text-[10px] text-white px-1.5 rounded-full shadow-sm font-bold leading-none py-0.5"
                                        style={{ backgroundColor: color }}
                                    >
                                        G{anno.group_id}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Render rectangle shape (default)
                    return (
                        <div
                            key={anno._id}
                            className={`absolute border-2 transition-all group pointer-events-auto ${isActive ? 'cursor-pointer hover:opacity-100' : 'opacity-80'}`}
                            style={{
                                left: `${x}%`,
                                top: `${y}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                borderColor: color,
                                backgroundColor: `${color}33`, // 20% opacity
                            }}
                            onClick={(e) => {
                                if (isActive && onAnnotationClick) {
                                    e.stopPropagation();
                                    onAnnotationClick(anno);
                                }
                            }}
                            title={anno.text || anno.type}
                        >
                            {/* Badge for Group ID - Adjusted size/pos to match modal */}
                            {anno.type === 'copy-move' && anno.group_id && (
                                <div
                                    className="absolute -top-3 -left-0.5 text-[10px] text-white px-1.5 rounded-full shadow-sm font-bold leading-none py-0.5"
                                    style={{ backgroundColor: color }}
                                >
                                    G{anno.group_id}
                                </div>
                            )}
                        </div>
                    );
                })
                }
            </div>
        </div>
    );
};

export default AnnotationOverlay;
