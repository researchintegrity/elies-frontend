import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import PropTypes from 'prop-types';
import { FiZoomIn, FiZoomOut, FiMaximize2, FiSliders, FiEye, FiEyeOff, FiX } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

// ============================================================================
// CONSTANTS
// ============================================================================

const GRAPH_CONFIG = {
    // Node sizes
    NODE_RADIUS_QUERY: 35,
    NODE_RADIUS_DEFAULT: 28,
    NODE_RADIUS_HOVER_QUERY: 40,
    NODE_RADIUS_HOVER_DEFAULT: 32,

    // Stroke widths
    STROKE_WIDTH_QUERY: 4,
    STROKE_WIDTH_DEFAULT: 2,
    STROKE_WIDTH_HOVER_QUERY: 5,
    STROKE_WIDTH_HOVER_DEFAULT: 3,

    // Forces
    CHARGE_STRENGTH: -300,
    COLLISION_RADIUS: 40,

    // Link distances (calculated from tightness)
    LINK_DISTANCE_MAX: 200,
    LINK_DISTANCE_MULTIPLIER: 1.5,
    LINK_STRENGTH_BASE: 0.1,
    LINK_STRENGTH_RANGE: 0.7,

    // Zoom
    ZOOM_MIN: 0.3,
    ZOOM_MAX: 3,
    ZOOM_INITIAL: 0.9,
    ZOOM_STEP_IN: 1.3,
    ZOOM_STEP_OUT: 0.7,
    ZOOM_TRANSITION_MS: 300,

    // Animation
    HOVER_TRANSITION_MS: 200,
    SIMULATION_ALPHA: 0.3,

    // Labels
    LABEL_MAX_LENGTH: 12,
    LABEL_TRUNCATE_LENGTH: 10,

    // Edge styling
    EDGE_MIN_WIDTH: 2,
    EDGE_MAX_WIDTH: 6,
    EDGE_WEIGHT_DIVISOR: 20,
    NON_SPANNING_STROKE_WIDTH: 1.5,
    NON_SPANNING_OPACITY: 0.4,
    SPANNING_OPACITY: 0.8,

    // Depth
    MAX_DEPTH_SLIDER: 10,
    DEPTH_SHOW_ALL: 10,

    // Image pattern size
    PATTERN_SIZE: 60,
};

const COLORS = {
    QUERY_NODE: '#10b981',
    DEFAULT_NODE: '#6366f1',
    NODE_STROKE: '#e2e8f0',
    SPANNING_EDGE: '#475569',
    NON_SPANNING_EDGE: '#cbd5e1',
    LABEL_TEXT: '#475569',
    LINK_LABEL: '#64748b',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate link distance from tightness value (0-100)
 * Higher tightness = shorter distance
 */
const calculateLinkDistance = (tightness) =>
    GRAPH_CONFIG.LINK_DISTANCE_MAX - (tightness * GRAPH_CONFIG.LINK_DISTANCE_MULTIPLIER);

/**
 * Calculate link strength from tightness value (0-100)
 */
const calculateLinkStrength = (tightness) =>
    GRAPH_CONFIG.LINK_STRENGTH_BASE + (tightness / 100) * GRAPH_CONFIG.LINK_STRENGTH_RANGE;

/**
 * Calculate edge width based on weight
 */
const calculateEdgeWidth = (weight) =>
    Math.max(
        GRAPH_CONFIG.EDGE_MIN_WIDTH,
        Math.min(GRAPH_CONFIG.EDGE_MAX_WIDTH, weight / GRAPH_CONFIG.EDGE_WEIGHT_DIVISOR)
    );

/**
 * Truncate label if too long
 */
const truncateLabel = (label) => {
    if (!label) return '';
    return label.length > GRAPH_CONFIG.LABEL_MAX_LENGTH
        ? `${label.slice(0, GRAPH_CONFIG.LABEL_TRUNCATE_LENGTH)}...`
        : label;
};

/**
 * Parse label to extract filename and tag
 * Format: "filename (tag)" or just "filename"
 */
const parseNodeLabel = (label) => {
    const match = (label || '').match(/^(.+?)\s*\(([^)]+)\)$/);
    return {
        filename: match ? match[1] : (label || 'N/A'),
        tag: match ? match[2] : null,
    };
};

/**
 * Safely get image URL with error handling
 */
const safeGetImageUrl = (getImageUrl, nodeId) => {
    if (!getImageUrl) return null;
    try {
        return getImageUrl(nodeId);
    } catch (error) {
        console.error(`Failed to get image URL for node ${nodeId}:`, error);
        return null;
    }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Control button component for zoom and settings
 */
const ControlButton = ({ onClick, title, isActive, children }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-lg shadow-md transition-colors ${isActive
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
        title={title}
    >
        {children}
    </button>
);

ControlButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string,
    isActive: PropTypes.bool,
    children: PropTypes.node.isRequired,
};

/**
 * Slider component for graph settings
 */
const SettingsSlider = ({
    label,
    value,
    min,
    max,
    onChange,
    onCommit,
    displayValue,
    minLabel,
    maxLabel,
    hint,
}) => (
    <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
            {label}
            {displayValue !== undefined && (
                <span className="ml-2 text-emerald-500 font-medium">{displayValue}</span>
            )}
        </label>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            onMouseUp={onCommit}
            onTouchEnd={onCommit}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        {(minLabel || maxLabel) && (
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{minLabel}</span>
                {hint && <span>{hint}</span>}
                <span>{maxLabel}</span>
            </div>
        )}
    </div>
);

SettingsSlider.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    min: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    onCommit: PropTypes.func,
    displayValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    minLabel: PropTypes.string,
    maxLabel: PropTypes.string,
    hint: PropTypes.string,
};

/**
 * Toggle row component for settings panel
 */
const ToggleRow = ({ label, isEnabled, onToggle }) => (
    <div
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 -mx-2 rounded transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        {isEnabled ? (
            <FiEye size={16} className="text-emerald-500" />
        ) : (
            <FiEyeOff size={16} className="text-gray-400" />
        )}
    </div>
);

ToggleRow.propTypes = {
    label: PropTypes.string.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
};

/**
 * Selected node details panel
 */
const NodeDetailsPanel = ({ node, getImageUrl, onClose, t }) => {
    const { filename, tag } = parseNodeLabel(node.label);
    const nodeTags = node.tags || [];
    const imageUrl = safeGetImageUrl(getImageUrl, node.id);

    return (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-[280px] z-30 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 transition-all animate-in fade-in slide-in-from-left-4">
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    {t('provenance.imageDetails')}
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Close details"
                >
                    <FiX className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-3">
                {/* Thumbnail */}
                <div className="w-full h-32 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={node.label}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-xs">{t('provenance.noPreview')}</span>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="space-y-2 text-xs">
                    <div>
                        <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
                            {t('provenance.filename')}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 break-words">
                            {filename}
                        </span>
                    </div>

                    {/* Tags */}
                    {(tag || nodeTags.length > 0) && (
                        <div>
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                {t('provenance.tags') || 'Tags'}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {tag && (
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        #{tag}
                                    </span>
                                )}
                                {nodeTags.map((tagItem) => (
                                    <span
                                        key={tagItem}
                                        className="text-blue-600 dark:text-blue-400 font-medium"
                                    >
                                        #{tagItem}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
                            {t('provenance.depth') || 'Depth'}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {node.depth === 0
                                ? (t('provenance.queryImage') || 'Query')
                                : `${node.depth} ${t('provenance.hopsFromQuery') || 'hop(s) from query'}`}
                        </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                        {node.isQuery ? (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md font-medium">
                                {t('provenance.queryImage')}
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md font-medium">
                                {t('provenance.referenceImage')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

NodeDetailsPanel.propTypes = {
    node: PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        tags: PropTypes.arrayOf(PropTypes.string),
        depth: PropTypes.number,
        isQuery: PropTypes.bool,
    }).isRequired,
    getImageUrl: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook to compute spanning edge set for efficient lookup
 */
const useSpanningEdgeSet = (spanningTreeEdges) => {
    return useMemo(() => {
        const set = new Set();
        const safeEdges = Array.isArray(spanningTreeEdges) ? spanningTreeEdges : [];
        safeEdges.forEach((e) => {
            const source = e.source || e.image1_id;
            const target = e.target || e.image2_id;
            const key = [source, target].sort().join('-');
            set.add(key);
        });
        return set;
    }, [spanningTreeEdges]);
};

/**
 * Hook to compute node depths using BFS from query node
 */
const useNodeDepths = (nodes, edges, queryImageId) => {
    return useMemo(() => {
        const depths = new Map();
        if (!nodes?.length || !queryImageId) return depths;

        const safeEdges = Array.isArray(edges) ? edges : [];

        // Build adjacency list
        const adjacency = new Map();
        safeEdges.forEach((e) => {
            const source = e.source || e.image1_id;
            const target = e.target || e.image2_id;
            if (!adjacency.has(source)) adjacency.set(source, []);
            if (!adjacency.has(target)) adjacency.set(target, []);
            adjacency.get(source).push(target);
            adjacency.get(target).push(source);
        });

        // BFS from query node
        const queue = [queryImageId];
        depths.set(queryImageId, 0);

        while (queue.length > 0) {
            const current = queue.shift();
            const currentDepth = depths.get(current);
            const neighbors = adjacency.get(current) || [];

            for (const neighbor of neighbors) {
                if (!depths.has(neighbor)) {
                    depths.set(neighbor, currentDepth + 1);
                    queue.push(neighbor);
                }
            }
        }

        return depths;
    }, [nodes, edges, queryImageId]);
};

/**
 * Hook to process graph data with filtering
 */
const useGraphData = (nodes, edges, spanningEdgeSet, queryImageId, nodeDepths, visualDepth) => {
    return useMemo(() => {
        if (!nodes?.length) {
            return { nodes: [], links: [], spanningLinks: [], totalNodes: 0 };
        }

        const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));
        const safeEdges = Array.isArray(edges) ? edges : [];

        // Find connected nodes
        const connectedNodeIds = new Set();
        safeEdges.forEach((e) => {
            const source = e.source || e.image1_id;
            const target = e.target || e.image2_id;
            if (source) connectedNodeIds.add(source);
            if (target) connectedNodeIds.add(target);
        });

        // Calculate effective max depth
        const effectiveMaxDepth = visualDepth >= GRAPH_CONFIG.DEPTH_SHOW_ALL ? Infinity : visualDepth;

        // Filter nodes by depth and connectivity
        const processedNodes = nodes
            .filter((n) => {
                if (n.id === queryImageId || n.is_query) return true;
                if (!connectedNodeIds.has(n.id)) return false;
                const depth = nodeDepths.get(n.id);
                return depth !== undefined && depth <= effectiveMaxDepth;
            })
            .map((n) => ({
                ...n,
                isQuery: n.id === queryImageId || n.is_query,
                depth: nodeDepths.get(n.id) || 0,
            }));

        const visibleNodeIds = new Set(processedNodes.map((n) => n.id));

        // Process edges
        const allLinks = safeEdges
            .map((e) => {
                const source = e.source || e.image1_id;
                const target = e.target || e.image2_id;
                const edgeKey = [source, target].sort().join('-');
                return {
                    source,
                    target,
                    weight: e.shared_area_source || e.shared_area_img1 || e.weight || 50,
                    keypoints: e.matched_keypoints || 0,
                    isSpanning: spanningEdgeSet.has(edgeKey),
                };
            })
            .filter((e) =>
                e.source &&
                e.target &&
                nodeMap.has(e.source) &&
                nodeMap.has(e.target) &&
                visibleNodeIds.has(e.source) &&
                visibleNodeIds.has(e.target)
            );

        const spanningLinks = allLinks.filter((l) => l.isSpanning);

        const totalNodes = nodes.filter((n) =>
            n.id === queryImageId || n.is_query || connectedNodeIds.has(n.id)
        ).length;

        return { nodes: processedNodes, links: allLinks, spanningLinks, totalNodes };
    }, [nodes, edges, spanningEdgeSet, queryImageId, nodeDepths, visualDepth]);
};

/**
 * Hook to handle container resize
 */
const useContainerResize = (containerRef, defaultWidth, defaultHeight) => {
    const [dimensions, setDimensions] = useState({ width: defaultWidth, height: defaultHeight });

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width,
                    height: height > 0 ? height : Math.max(400, width * 0.6),
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [containerRef]);

    return dimensions;
};

// ============================================================================
// D3 SETUP FUNCTIONS
// ============================================================================

/**
 * Setup SVG defs (patterns and filters)
 */
const setupSvgDefs = (svg, nodes, getImageUrl) => {
    const defs = svg.append('defs');

    // Create image patterns for each node
    nodes.forEach((node) => {
        const imageUrl = safeGetImageUrl(getImageUrl, node.id);
        if (imageUrl) {
            defs.append('pattern')
                .attr('id', `prov-img-${node.id}`)
                .attr('patternUnits', 'objectBoundingBox')
                .attr('width', 1)
                .attr('height', 1)
                .append('image')
                .attr('href', imageUrl)
                .attr('width', GRAPH_CONFIG.PATTERN_SIZE)
                .attr('height', GRAPH_CONFIG.PATTERN_SIZE)
                .attr('preserveAspectRatio', 'xMidYMid slice');
        }
    });

    // Add drop shadow filter
    const filter = defs.append('filter')
        .attr('id', 'prov-drop-shadow')
        .attr('height', '130%');

    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 3)
        .attr('result', 'blur');

    filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 2)
        .attr('dy', 2)
        .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'offsetBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    return defs;
};

/**
 * Create zoom behavior
 */
const createZoomBehavior = (g) => {
    return d3.zoom()
        .scaleExtent([GRAPH_CONFIG.ZOOM_MIN, GRAPH_CONFIG.ZOOM_MAX])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
};

/**
 * Create force simulation
 */
const createSimulation = (nodes, links, width, height, tightness, gravity) => {
    const linkDistance = calculateLinkDistance(tightness);
    const linkStrength = calculateLinkStrength(tightness);

    return d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id((d) => d.id)
            .distance(linkDistance)
            .strength((d) => d.isSpanning ? linkStrength : 0))
        .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.CHARGE_STRENGTH))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(gravity))
        .force('y', d3.forceY(height / 2).strength(gravity))
        .force('collision', d3.forceCollide().radius(GRAPH_CONFIG.COLLISION_RADIUS));
};

/**
 * Create edge elements
 */
const createEdges = (g, links, showAllEdges) => {
    const nonSpanningLinks = links.filter((l) => !l.isSpanning && showAllEdges);
    const spanningLinks = links.filter((l) => l.isSpanning);

    // Non-spanning edges (behind)
    g.append('g')
        .attr('class', 'non-spanning-links')
        .selectAll('line')
        .data(nonSpanningLinks)
        .enter()
        .append('line')
        .attr('stroke', COLORS.NON_SPANNING_EDGE)
        .attr('stroke-width', GRAPH_CONFIG.NON_SPANNING_STROKE_WIDTH)
        .attr('stroke-opacity', GRAPH_CONFIG.NON_SPANNING_OPACITY)
        .attr('stroke-dasharray', '4,4');

    // Spanning edges (on top)
    const spanningLink = g.append('g')
        .attr('class', 'spanning-links')
        .selectAll('line')
        .data(spanningLinks)
        .enter()
        .append('line')
        .attr('stroke', COLORS.SPANNING_EDGE)
        .attr('stroke-width', (d) => calculateEdgeWidth(d.weight))
        .attr('stroke-opacity', GRAPH_CONFIG.SPANNING_OPACITY);

    // Edge labels
    const linkLabels = g.append('g')
        .attr('class', 'link-labels')
        .selectAll('text')
        .data(spanningLinks)
        .enter()
        .append('text')
        .attr('font-size', '10px')
        .attr('fill', COLORS.LINK_LABEL)
        .attr('text-anchor', 'middle')
        .text((d) => `${d.keypoints} pts`);

    return { spanningLink, linkLabels };
};

/**
 * Create node elements
 */
const createNodes = (g, nodes, simulation, getImageUrl, onNodeClick, setSelectedNode) => {
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(GRAPH_CONFIG.SIMULATION_ALPHA).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));

    // Node circles with images
    node.append('circle')
        .attr('r', (d) => d.isQuery ? GRAPH_CONFIG.NODE_RADIUS_QUERY : GRAPH_CONFIG.NODE_RADIUS_DEFAULT)
        .attr('fill', (d) => {
            const imageUrl = safeGetImageUrl(getImageUrl, d.id);
            return imageUrl ? `url(#prov-img-${d.id})` : (d.isQuery ? COLORS.QUERY_NODE : COLORS.DEFAULT_NODE);
        })
        .attr('stroke', (d) => d.isQuery ? COLORS.QUERY_NODE : COLORS.NODE_STROKE)
        .attr('stroke-width', (d) => d.isQuery ? GRAPH_CONFIG.STROKE_WIDTH_QUERY : GRAPH_CONFIG.STROKE_WIDTH_DEFAULT)
        .attr('filter', 'url(#prov-drop-shadow)')
        .on('click', (event, d) => {
            event.stopPropagation();
            setSelectedNode(d);
            onNodeClick?.(d);
        })
        .on('mouseenter', function (event, d) {
            d3.select(this)
                .transition()
                .duration(GRAPH_CONFIG.HOVER_TRANSITION_MS)
                .attr('r', d.isQuery ? GRAPH_CONFIG.NODE_RADIUS_HOVER_QUERY : GRAPH_CONFIG.NODE_RADIUS_HOVER_DEFAULT)
                .attr('stroke-width', d.isQuery ? GRAPH_CONFIG.STROKE_WIDTH_HOVER_QUERY : GRAPH_CONFIG.STROKE_WIDTH_HOVER_DEFAULT);
        })
        .on('mouseleave', function (event, d) {
            d3.select(this)
                .transition()
                .duration(GRAPH_CONFIG.HOVER_TRANSITION_MS)
                .attr('r', d.isQuery ? GRAPH_CONFIG.NODE_RADIUS_QUERY : GRAPH_CONFIG.NODE_RADIUS_DEFAULT)
                .attr('stroke-width', d.isQuery ? GRAPH_CONFIG.STROKE_WIDTH_QUERY : GRAPH_CONFIG.STROKE_WIDTH_DEFAULT);
        });

    // Query badge
    const queryNodes = node.filter((d) => d.isQuery);
    queryNodes.append('circle')
        .attr('r', 10)
        .attr('cx', 25)
        .attr('cy', -25)
        .attr('fill', COLORS.QUERY_NODE)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    queryNodes.append('text')
        .attr('x', 25)
        .attr('y', -21)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('Q');

    // Node labels
    node.append('text')
        .attr('dy', 45)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', COLORS.LABEL_TEXT)
        .text((d) => truncateLabel(d.label || d.id));

    return node;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ProvenanceGraph - D3.js Force-Directed Graph Visualization
 *
 * Displays a provenance graph with:
 * - Nodes as circular image thumbnails
 * - Spanning tree edges (darker, solid) for primary structure
 * - All match edges (lighter, dashed) - toggleable
 * - Interactive pan/zoom
 * - Graph settings panel with tightness and depth control
 * - Node selection for details
 */
const ProvenanceGraph = ({
    nodes = [],
    edges = [],
    spanningTreeEdges = [],
    queryImageId,
    getImageUrl,
    onNodeClick,
    width = 800,
    height = 500,
    gravity = 0.02,
}) => {
    const { t } = useLanguage();
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const simulationRef = useRef(null);
    const zoomRef = useRef(null);

    const [selectedNode, setSelectedNode] = useState(null);
    const [tightness, setTightness] = useState(50);
    const [showControls, setShowControls] = useState(false);
    const [showAllEdges, setShowAllEdges] = useState(true);
    const [visualDepth, setVisualDepth] = useState(GRAPH_CONFIG.MAX_DEPTH_SLIDER);
    const [depthSliderValue, setDepthSliderValue] = useState(GRAPH_CONFIG.MAX_DEPTH_SLIDER);

    // Custom hooks
    const dimensions = useContainerResize(containerRef, width, height);
    const spanningEdgeSet = useSpanningEdgeSet(spanningTreeEdges);
    const nodeDepths = useNodeDepths(nodes, edges, queryImageId);
    const graphData = useGraphData(nodes, edges, spanningEdgeSet, queryImageId, nodeDepths, visualDepth);

    // Update simulation when tightness changes
    useEffect(() => {
        if (simulationRef.current) {
            const linkDistance = calculateLinkDistance(tightness);
            const linkStrength = calculateLinkStrength(tightness);

            simulationRef.current
                .force('link')
                .distance(linkDistance)
                .strength((d) => d.isSpanning ? linkStrength : 0);

            simulationRef.current.alpha(GRAPH_CONFIG.SIMULATION_ALPHA).restart();
        }
    }, [tightness]);

    // Main D3 visualization effect
    useEffect(() => {
        if (!svgRef.current || !graphData.nodes.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width: w, height: h } = dimensions;

        // Setup
        setupSvgDefs(svg, graphData.nodes, getImageUrl);
        const g = svg.append('g');

        // Zoom
        const zoom = createZoomBehavior(g);
        zoomRef.current = zoom;
        svg.call(zoom);

        // Simulation
        const simulation = createSimulation(
            graphData.nodes,
            graphData.links,
            w,
            h,
            tightness,
            gravity
        );
        simulationRef.current = simulation;

        // Create elements
        const { spanningLink, linkLabels } = createEdges(g, graphData.links, showAllEdges);
        const node = createNodes(g, graphData.nodes, simulation, getImageUrl, onNodeClick, setSelectedNode);

        // Tick handler
        simulation.on('tick', () => {
            g.selectAll('.non-spanning-links line')
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);

            spanningLink
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);

            linkLabels
                .attr('x', (d) => (d.source.x + d.target.x) / 2)
                .attr('y', (d) => (d.source.y + d.target.y) / 2);

            node.attr('transform', (d) => `translate(${d.x},${d.y})`);
        });

        // Initial zoom
        svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(GRAPH_CONFIG.ZOOM_INITIAL));

        // Cleanup
        return () => {
            simulation.stop();
            simulationRef.current = null;
        };
    }, [graphData, dimensions, getImageUrl, onNodeClick, gravity, showAllEdges, tightness]);

    // Zoom handlers
    const handleZoom = useCallback((scaleFactor) => {
        const svg = d3.select(svgRef.current);
        if (zoomRef.current) {
            svg.transition()
                .duration(GRAPH_CONFIG.ZOOM_TRANSITION_MS)
                .call(zoomRef.current.scaleBy, scaleFactor);
        }
    }, []);

    const handleZoomIn = useCallback(() => handleZoom(GRAPH_CONFIG.ZOOM_STEP_IN), [handleZoom]);
    const handleZoomOut = useCallback(() => handleZoom(GRAPH_CONFIG.ZOOM_STEP_OUT), [handleZoom]);

    const handleResetZoom = useCallback(() => {
        const svg = d3.select(svgRef.current);
        if (zoomRef.current) {
            svg.transition()
                .duration(GRAPH_CONFIG.ZOOM_TRANSITION_MS)
                .call(
                    zoomRef.current.transform,
                    d3.zoomIdentity.translate(0, 0).scale(GRAPH_CONFIG.ZOOM_INITIAL)
                );
        }
    }, []);

    const handleDepthCommit = useCallback(() => {
        setVisualDepth(depthSliderValue);
    }, [depthSliderValue]);

    const toggleShowAllEdges = useCallback(() => {
        setShowAllEdges((prev) => !prev);
    }, []);

    const toggleControls = useCallback(() => {
        setShowControls((prev) => !prev);
    }, []);

    const closeSelectedNode = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Empty state
    if (!graphData.nodes.length) {
        return (
            <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
                <p>No graph data available</p>
            </div>
        );
    }

    const depthDisplayValue = depthSliderValue >= GRAPH_CONFIG.DEPTH_SHOW_ALL
        ? (t('provenance.all') || 'All')
        : depthSliderValue;

    const visualDepthDisplay = visualDepth >= GRAPH_CONFIG.DEPTH_SHOW_ALL
        ? (t('provenance.all') || 'All')
        : visualDepth;

    return (
        <div ref={containerRef} className="relative w-full h-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <ControlButton onClick={handleZoomIn} title="Zoom In">
                    <FiZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </ControlButton>
                <ControlButton onClick={handleZoomOut} title="Zoom Out">
                    <FiZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </ControlButton>
                <ControlButton onClick={handleResetZoom} title="Reset View">
                    <FiMaximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </ControlButton>
                <ControlButton
                    onClick={toggleControls}
                    title={t('provenance.graphSettings') || 'Graph Settings'}
                    isActive={showControls}
                >
                    <FiSliders className={`w-5 h-5 ${showControls ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                </ControlButton>
            </div>

            {/* Graph Settings Panel */}
            {showControls && (
                <div className="absolute top-4 right-16 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 w-64 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {t('provenance.graphSettings') || 'Graph Settings'}
                    </h3>
                    <div className="space-y-4">
                        <SettingsSlider
                            label={t('provenance.visualDepth') || 'Visualization Depth'}
                            value={depthSliderValue}
                            min={1}
                            max={GRAPH_CONFIG.MAX_DEPTH_SLIDER}
                            onChange={(e) => setDepthSliderValue(Number(e.target.value))}
                            onCommit={handleDepthCommit}
                            displayValue={depthDisplayValue}
                            minLabel="1"
                            maxLabel={t('provenance.all') || 'All'}
                            hint={t('provenance.hops') || 'hops'}
                        />
                        <p className="text-[10px] text-gray-400 -mt-2">
                            {t('provenance.depthHint') || 'Filter nodes by distance from query'}
                        </p>

                        <SettingsSlider
                            label={t('provenance.graphTightness') || 'Graph Tightness'}
                            value={tightness}
                            min={0}
                            max={100}
                            onChange={(e) => setTightness(Number(e.target.value))}
                            minLabel={t('provenance.loose') || 'Loose'}
                            maxLabel={t('provenance.tight') || 'Tight'}
                        />

                        <ToggleRow
                            label={t('provenance.showAllMatches') || 'Show all matches'}
                            isEnabled={showAllEdges}
                            onToggle={toggleShowAllEdges}
                        />
                    </div>
                </div>
            )}

            {/* Graph Info Overlay */}
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-sm backdrop-blur-sm border border-gray-100 dark:border-gray-700 pointer-events-none">
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{t('provenance.depth') || 'Depth'}:</span>
                        <span>{visualDepthDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{t('provenance.visible') || 'Visible'}:</span>
                        <span>{graphData.nodes.length > 0 ? graphData.nodes.length - 1 : 0}</span>
                    </div>
                    {graphData.totalNodes > graphData.nodes.length && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                            <span className="font-medium">{t('provenance.total') || 'Total'}:</span>
                            <span>{graphData.totalNodes - 1}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-md text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                    <span className="text-gray-600 dark:text-gray-300">{t('provenance.queryImage')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-gray-600" />
                    <span className="text-gray-600 dark:text-gray-300">{t('provenance.spanningTree') || 'Spanning tree'}</span>
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 p-1 -m-1 rounded transition-colors"
                    onClick={toggleShowAllEdges}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleShowAllEdges()}
                    title={showAllEdges ? t('provenance.hideAllMatches') || "Hide all matches" : t('provenance.showAllMatches') || "Show all matches"}
                >
                    <div className="w-6 h-0.5 bg-gray-300 border-dashed border-t border-gray-400" style={{ borderStyle: 'dashed' }} />
                    <span className={`text-gray-600 dark:text-gray-300 ${!showAllEdges ? 'text-gray-400' : ''}`}>
                        {t('provenance.allMatches') || 'All matches'}
                    </span>
                    {showAllEdges ? (
                        <FiEye size={10} className="text-gray-400 ml-auto" />
                    ) : (
                        <FiEyeOff size={10} className="text-gray-400 ml-auto" />
                    )}
                </div>
            </div>

            {/* Selected Node Info */}
            {selectedNode && (
                <NodeDetailsPanel
                    node={selectedNode}
                    getImageUrl={getImageUrl}
                    onClose={closeSelectedNode}
                    t={t}
                />
            )}

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="cursor-grab active:cursor-grabbing"
            />
        </div>
    );
};

ProvenanceGraph.propTypes = {
    nodes: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        is_query: PropTypes.bool,
        tags: PropTypes.arrayOf(PropTypes.string),
    })),
    edges: PropTypes.arrayOf(PropTypes.shape({
        source: PropTypes.string,
        target: PropTypes.string,
        image1_id: PropTypes.string,
        image2_id: PropTypes.string,
    })),
    spanningTreeEdges: PropTypes.arrayOf(PropTypes.object),
    queryImageId: PropTypes.string,
    getImageUrl: PropTypes.func,
    onNodeClick: PropTypes.func,
    width: PropTypes.number,
    height: PropTypes.number,
    gravity: PropTypes.number,
};

export default ProvenanceGraph;
