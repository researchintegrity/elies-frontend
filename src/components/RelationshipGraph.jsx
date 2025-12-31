import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FiZoomIn, FiZoomOut, FiMaximize2, FiSliders, FiEye, FiEyeOff } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

/**
 * RelationshipGraph - D3.js Force-Directed Graph for Image Relationships
 * 
 * Displays a relationship graph with:
 * - Nodes as circular image thumbnails
 * - MST edges (darker, solid) for Maximum Spanning Tree - used for clustering
 * - Non-MST edges (lighter, dashed) for additional relationships - visual only
 * - Interactive pan/zoom
 * - Tightness control slider
 * - Node selection for details
 */
const RelationshipGraph = ({
    nodes = [],
    edges = [],          // All edges
    mstEdges = [],       // Maximum Spanning Tree edges (render darker, used for clustering)
    queryImageId,        // Starting/selected image
    getImageUrl,
    onNodeClick,
    // onRemoveRelationship, // Unused for now
    onDepthChange,       // Callback when user changes depth
    currentDepth = 5,    // Current BFS depth setting
    totalNodesCount = 0, // Total related images in full graph
    width = 800,
    height = 500,
    gravity = 0.02,
}) => {
    const { t } = useLanguage();
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const simulationRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width, height });
    const [selectedNode, setSelectedNode] = useState(null);
    const [tightness, setTightness] = useState(50); // 0-100 slider value
    const [showControls, setShowControls] = useState(false);
    const [depthValue, setDepthValue] = useState(currentDepth === 0 ? 21 : currentDepth); // Local state for depth slider
    const [showWeakRelations, setShowWeakRelations] = useState(true);

    // Create MST edge lookup for efficient checking
    const mstEdgeSet = useMemo(() => {
        const set = new Set();
        mstEdges.forEach(e => {
            const key = [e.source, e.target].sort().join('-');
            set.add(key);
        });
        return set;
    }, [mstEdges]);

    // Process nodes and edges for D3
    const graphData = useMemo(() => {
        if (!nodes || !nodes.length) return { nodes: [], links: [], mstLinks: [] };

        // Create a map of node IDs
        const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

        const processedNodes = nodes.map(n => ({
            ...n,
            isQuery: n.id === queryImageId || n.is_query,
        }));

        // Process all edges - use is_mst_edge from API or fall back to mstEdges prop check
        const allLinks = edges
            .map(e => {
                const source = e.source;
                const target = e.target;
                const edgeKey = [source, target].sort().join('-');

                // Prefer is_mst_edge from API, fall back to mstEdges prop lookup
                const isMst = e.is_mst_edge !== undefined
                    ? e.is_mst_edge
                    : mstEdgeSet.has(edgeKey);

                return {
                    source,
                    target,
                    weight: e.weight || 1.0,
                    sourceType: e.source_type || 'manual',
                    isMstEdge: isMst,
                };
            })
            .filter(e => e.source && e.target && nodeMap.has(e.source) && nodeMap.has(e.target));

        // Only MST edges affect the force simulation for clustering
        const mstLinks = allLinks.filter(l => l.isMstEdge);

        // Log for debugging
        console.log(`Graph: ${allLinks.length} edges (${mstLinks.length} MST, ${allLinks.length - mstLinks.length} non-MST)`);

        return { nodes: processedNodes, links: allLinks, mstLinks };
    }, [nodes, edges, mstEdgeSet, queryImageId]);

    // Sync local depthValue when prop changes
    useEffect(() => {
        setDepthValue(currentDepth === 0 ? 21 : currentDepth);
    }, [currentDepth]);

    // Handle container resize
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
    }, []);

    // Update simulation when tightness changes
    useEffect(() => {
        if (simulationRef.current) {
            // Map tightness (0-100) to distance (200-50) - inverse relationship
            const linkDistance = 200 - (tightness * 1.5);
            // Map tightness to link strength (0.1-0.8)
            const linkStrength = 0.1 + (tightness / 100) * 0.7;

            simulationRef.current
                .force('link')
                .distance(linkDistance)
                .strength(d => d.isMstEdge ? linkStrength : 0);

            simulationRef.current.alpha(0.3).restart();
        }
    }, [tightness]);

    // D3 visualization
    useEffect(() => {
        if (!svgRef.current || !graphData.nodes.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width: w, height: h } = dimensions;

        // Create defs for patterns (circular images)
        const defs = svg.append('defs');

        // Create image patterns for each node
        graphData.nodes.forEach(node => {
            const imageUrl = getImageUrl ? getImageUrl(node.id) : null;
            if (imageUrl) {
                defs.append('pattern')
                    .attr('id', `rel-img-${node.id}`)
                    .attr('patternUnits', 'objectBoundingBox')
                    .attr('width', 1)
                    .attr('height', 1)
                    .append('image')
                    .attr('href', imageUrl)
                    .attr('width', 60)
                    .attr('height', 60)
                    .attr('preserveAspectRatio', 'xMidYMid slice');
            }
        });

        // Add drop shadow filter
        const filter = defs.append('filter')
            .attr('id', 'rel-drop-shadow')
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

        // Add glow filter for selected node
        const glowFilter = defs.append('filter')
            .attr('id', 'rel-glow')
            .attr('height', '150%')
            .attr('width', '150%')
            .attr('x', '-25%')
            .attr('y', '-25%');

        glowFilter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 4)
            .attr('result', 'blur');

        glowFilter.append('feFlood')
            .attr('flood-color', '#f59e0b')
            .attr('flood-opacity', 0.8)
            .attr('result', 'color');

        glowFilter.append('feComposite')
            .attr('in', 'color')
            .attr('in2', 'blur')
            .attr('operator', 'in')
            .attr('result', 'shadow');

        const glowMerge = glowFilter.append('feMerge');
        glowMerge.append('feMergeNode').attr('in', 'shadow');
        glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Create container group for zoom
        const g = svg.append('g');

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Calculate initial distances based on tightness
        const linkDistance = 200 - (tightness * 1.5);
        const linkStrength = 0.1 + (tightness / 100) * 0.7;

        // Create force simulation - ONLY using MST edges for link force
        // Create force simulation - Process ALL edges so D3 resolves references, but only MST edges exert force
        const simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.links)
                .id(d => d.id)
                .distance(linkDistance)
                .strength(d => d.isMstEdge ? linkStrength : 0))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(w / 2, h / 2))
            .force('x', d3.forceX(w / 2).strength(gravity))
            .force('y', d3.forceY(h / 2).strength(gravity))
            .force('collision', d3.forceCollide().radius(40));

        simulationRef.current = simulation;

        // Separate MST and non-MST edges for different rendering
        const nonMstLinks = graphData.links.filter(l => !l.isMstEdge && showWeakRelations);
        const mstLinks = graphData.links.filter(l => l.isMstEdge);

        // Create non-MST edges (lighter, dashed) - rendered first (behind)
        g.append('g')
            .attr('class', 'non-mst-links')
            .selectAll('line')
            .data(nonMstLinks)
            .enter()
            .append('line')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-dasharray', '4,4');

        // Create MST edges (darker, solid) - rendered on top
        const mstLink = g.append('g')
            .attr('class', 'mst-links')
            .selectAll('line')
            .data(mstLinks)
            .enter()
            .append('line')
            .attr('stroke', '#475569')
            .attr('stroke-width', d => Math.max(2, Math.min(5, d.weight * 5)))
            .attr('stroke-opacity', 0.8);

        // Create edge labels for MST edges
        const linkLabels = g.append('g')
            .attr('class', 'link-labels')
            .selectAll('text')
            .data(mstLinks)
            .enter()
            .append('text')
            .attr('font-size', '9px')
            .attr('fill', '#64748b')
            .attr('text-anchor', 'middle')
            .text(d => `${Math.round(d.weight * 100)}%`);

        // Create nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(graphData.nodes)
            .enter()
            .append('g')
            .attr('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
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

        // Node circles with images - AMBER/GOLD for selected image instead of red
        node.append('circle')
            .attr('r', d => d.isQuery ? 35 : 28)
            .attr('fill', d => {
                const imageUrl = getImageUrl ? getImageUrl(d.id) : null;
                return imageUrl ? `url(#rel-img-${d.id})` : (d.isQuery ? '#f59e0b' : '#6366f1');
            })
            .attr('stroke', d => d.isQuery ? '#f59e0b' : (d.is_flagged ? '#ef4444' : '#e2e8f0'))
            .attr('stroke-width', d => d.isQuery ? 4 : (d.is_flagged ? 3 : 2))
            .attr('filter', d => d.isQuery ? 'url(#rel-glow)' : 'url(#rel-drop-shadow)')
            .on('click', (event, d) => {
                event.stopPropagation();
                setSelectedNode(d);
                onNodeClick?.(d);
            })
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', d.isQuery ? 40 : 32)
                    .attr('stroke-width', d.isQuery ? 5 : 3);
            })
            .on('mouseleave', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', d.isQuery ? 35 : 28)
                    .attr('stroke-width', d.isQuery ? 4 : (d.is_flagged ? 3 : 2));
            });

        // Query badge - AMBER/GOLD color
        node.filter(d => d.isQuery)
            .append('circle')
            .attr('r', 10)
            .attr('cx', 25)
            .attr('cy', -25)
            .attr('fill', '#f59e0b')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        node.filter(d => d.isQuery)
            .append('text')
            .attr('x', 25)
            .attr('y', -21)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text('★');

        // Flagged badge (for non-query flagged nodes)
        node.filter(d => !d.isQuery && d.is_flagged)
            .append('circle')
            .attr('r', 8)
            .attr('cx', 20)
            .attr('cy', -20)
            .attr('fill', '#ef4444')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        // Node labels
        node.append('text')
            .attr('dy', 45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#475569')
            .text(d => {
                const label = d.label || d.id;
                return label.length > 12 ? label.slice(0, 10) + '...' : label;
            });

        // Simulation tick
        simulation.on('tick', () => {
            // Update non-MST links
            g.selectAll('.non-mst-links line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            // Update MST links
            mstLink
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            linkLabels
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Initial zoom to fit
        svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.9));

        // Cleanup
        return () => {
            simulation.stop();
            simulationRef.current = null;
        };
    }, [graphData, dimensions, getImageUrl, onNodeClick, gravity, showWeakRelations, tightness]);

    // Zoom controls
    const handleZoomIn = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(
            d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
                svg.select('g').attr('transform', event.transform);
            }).scaleBy,
            1.3
        );
    };

    const handleZoomOut = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(
            d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
                svg.select('g').attr('transform', event.transform);
            }).scaleBy,
            0.7
        );
    };

    const handleResetZoom = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(
            d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
                svg.select('g').attr('transform', event.transform);
            }).transform,
            d3.zoomIdentity.translate(0, 0).scale(0.9)
        );
    };

    if (!graphData.nodes.length) {
        return (
            <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
                <p>{t('relationship.noRelatedImages') || 'No related images'}</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full h-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                    onClick={handleZoomIn}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Zoom In"
                >
                    <FiZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Zoom Out"
                >
                    <FiZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                    onClick={handleResetZoom}
                    className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Reset View"
                >
                    <FiMaximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                    onClick={() => setShowControls(!showControls)}
                    className={`p-2 rounded-lg shadow-md transition-colors ${showControls
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    title="Graph Settings"
                >
                    <FiSliders className={`w-5 h-5 ${showControls ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                </button>
            </div>

            {/* Graph Settings Panel */}
            {showControls && (
                <div className="absolute top-4 right-16 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 w-64 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {t('relationship.graphSettings') || 'Graph Settings'}
                    </h3>
                    <div className="space-y-4">
                        {/* Tightness Slider */}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                {t('relationship.tightness') || 'Cluster Tightness'}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={tightness}
                                onChange={(e) => setTightness(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                <span>{t('relationship.loose') || 'Loose'}</span>
                                <span>{t('relationship.tight') || 'Tight'}</span>
                            </div>
                        </div>

                        {/* Depth Slider - 1-20 are normal depths, 21 means unlimited (sent as 0 to API) */}
                        {onDepthChange && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                    {t('relationship.graphDepth') || 'Graph Depth'}
                                    <span className="ml-2 text-indigo-500 font-medium">
                                        {depthValue === 21 ? (t('relationship.unlimited') || 'All') : depthValue}
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="21"
                                    value={depthValue}
                                    onChange={(e) => setDepthValue(Number(e.target.value))}
                                    onMouseUp={() => onDepthChange(depthValue === 21 ? 0 : depthValue)}
                                    onTouchEnd={() => onDepthChange(depthValue === 21 ? 0 : depthValue)}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                    <span>1</span>
                                    <span>{t('relationship.levels') || 'levels'}</span>
                                    <span>{t('relationship.all') || 'All'}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {t('relationship.depthHint') || 'Slide to "All" for unlimited depth'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Graph Info Overlay */}
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-sm backdrop-blur-sm border border-gray-100 dark:border-gray-700 pointer-events-none">
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{t('relationship.depth') || 'Depth'}:</span>
                        <span>{currentDepth === 0 ? (t('relationship.unlimited') || 'All') : currentDepth}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{t('relationship.visible') || 'Visible'}:</span>
                        <span>{nodes.length > 0 ? nodes.length - 1 : 0}</span>
                    </div>
                    {totalNodesCount > 0 && totalNodesCount > nodes.length && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                            <span className="font-medium">{t('relationship.total') || 'Total'}:</span>
                            <span>{totalNodesCount - 1}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-md text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm" style={{ boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }} />
                    <span className="text-gray-600 dark:text-gray-300">{t('relationship.selectedImage') || 'Selected'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-gray-600" />
                    <span className="text-gray-600 dark:text-gray-300">{t('relationship.strongRelation') || 'Strong relation'}</span>
                </div>
                <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 p-1 -m-1 rounded transition-colors"
                    onClick={() => setShowWeakRelations(!showWeakRelations)}
                    title={showWeakRelations ? "Hide Content Share Relations" : "Show Content Share Relations"}
                >
                    <div className="w-6 h-0.5 bg-gray-300 border-dashed border-t border-gray-400" style={{ borderStyle: 'dashed' }} />
                    <span className={`text-gray-600 dark:text-gray-300 ${!showWeakRelations ? 'text-gray-400' : ''}`}>
                        {t('relationship.weakRelation') || 'Content Share Relation'}
                    </span>
                    {showWeakRelations ? (
                        <FiEye size={10} className="text-gray-400 ml-auto" />
                    ) : (
                        <FiEyeOff size={10} className="text-gray-400 ml-auto" />
                    )}
                </div>
            </div>

            {/* Selected Node Info */}
            {selectedNode && (
                <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-[280px] z-20 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 transition-all animate-in fade-in slide-in-from-left-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                            {t('relationship.imageDetails') || 'Image Details'}
                        </h3>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Thumbnail */}
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                            {(() => {
                                const url = getImageUrl ? getImageUrl(selectedNode.id) : null;
                                return url ? (
                                    <img src={url} alt={selectedNode.label} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <span className="text-xs">{t('relationship.noPreview') || 'No preview'}</span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Metadata */}
                        <div className="space-y-2 text-xs">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400 block mb-0.5">{t('relationship.filename') || 'Filename'}</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                    {selectedNode.label || 'N/A'}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-1">
                                {selectedNode.isQuery ? (
                                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md font-medium">
                                        {t('relationship.selectedImage') || 'Selected'}
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md font-medium">
                                        {t('relationship.relatedImage') || 'Related'}
                                    </span>
                                )}
                                {selectedNode.is_flagged && (
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md font-medium">
                                        {t('relationship.flagged') || 'Flagged'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
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

export default RelationshipGraph;
