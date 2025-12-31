import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FiZoomIn, FiZoomOut, FiMaximize2, FiSliders, FiEye, FiEyeOff } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

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
    const [dimensions, setDimensions] = useState({ width, height });
    const [selectedNode, setSelectedNode] = useState(null);
    const [tightness, setTightness] = useState(50); // 0-100 slider value
    const [showControls, setShowControls] = useState(false);
    const [showAllEdges, setShowAllEdges] = useState(true);
    const [visualDepth, setVisualDepth] = useState(10); // 1-10, 10 means show all
    const [depthSliderValue, setDepthSliderValue] = useState(10); // Local slider state for smooth dragging

    // Create spanning tree edge lookup for efficient checking
    const spanningEdgeSet = useMemo(() => {
        const set = new Set();
        const safeSpanningEdges = Array.isArray(spanningTreeEdges) ? spanningTreeEdges : [];
        safeSpanningEdges.forEach(e => {
            const source = e.source || e.image1_id;
            const target = e.target || e.image2_id;
            const key = [source, target].sort().join('-');
            set.add(key);
        });
        return set;
    }, [spanningTreeEdges]);

    // Compute node depths using BFS from query node
    const nodeDepths = useMemo(() => {
        const depths = new Map();
        if (!nodes || !nodes.length || !queryImageId) return depths;

        const safeAllEdges = Array.isArray(edges) ? edges : [];

        // Build adjacency list
        const adjacency = new Map();
        safeAllEdges.forEach(e => {
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

    // Get max depth in the graph
    const maxDepthInGraph = useMemo(() => {
        let max = 0;
        nodeDepths.forEach(depth => {
            if (depth > max) max = depth;
        });
        return max;
    }, [nodeDepths]);

    // Process nodes and edges for D3 with depth filtering
    const graphData = useMemo(() => {
        if (!nodes || !nodes.length) return { nodes: [], links: [], spanningLinks: [], totalNodes: 0 };

        // Create a map of node IDs
        const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

        const safeAllEdges = Array.isArray(edges) ? edges : [];

        // Find nodes that have at least one edge (connected nodes)
        const connectedNodeIds = new Set();
        safeAllEdges.forEach(e => {
            const source = e.source || e.image1_id;
            const target = e.target || e.image2_id;
            if (source) connectedNodeIds.add(source);
            if (target) connectedNodeIds.add(target);
        });

        // Filter nodes by depth (if visualDepth < 10, filter; if 10, show all)
        const effectiveMaxDepth = visualDepth >= 10 ? Infinity : visualDepth;

        // Filter to only include connected nodes within depth limit
        const processedNodes = nodes
            .filter(n => {
                // Always include query
                if (n.id === queryImageId || n.is_query) return true;
                // Must be connected
                if (!connectedNodeIds.has(n.id)) return false;
                // Check depth
                const depth = nodeDepths.get(n.id);
                return depth !== undefined && depth <= effectiveMaxDepth;
            })
            .map(n => ({
                ...n,
                isQuery: n.id === queryImageId || n.is_query,
                depth: nodeDepths.get(n.id) || 0,
            }));

        // Create set of visible node IDs for edge filtering
        const visibleNodeIds = new Set(processedNodes.map(n => n.id));

        // Process all edges and mark which are spanning tree edges
        const allLinks = safeAllEdges
            .map(e => {
                const source = e.source || e.image1_id;
                const target = e.target || e.image2_id;
                const edgeKey = [source, target].sort().join('-');
                const isSpanning = spanningEdgeSet.has(edgeKey);

                return {
                    source,
                    target,
                    weight: e.shared_area_source || e.shared_area_img1 || e.weight || 50,
                    keypoints: e.matched_keypoints || 0,
                    isSpanning,
                };
            })
            .filter(e =>
                e.source && e.target &&
                nodeMap.has(e.source) && nodeMap.has(e.target) &&
                visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
            );

        // Separate spanning and non-spanning links
        const spanningLinks = allLinks.filter(l => l.isSpanning);

        // Count total connected nodes (for info display)
        const totalNodes = nodes.filter(n =>
            n.id === queryImageId || n.is_query || connectedNodeIds.has(n.id)
        ).length;

        console.log(`Provenance Graph: showing ${processedNodes.length}/${totalNodes} nodes at depth ${visualDepth}`);

        return { nodes: processedNodes, links: allLinks, spanningLinks, totalNodes };
    }, [nodes, edges, spanningEdgeSet, queryImageId, nodeDepths, visualDepth]);

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
                .strength(d => d.isSpanning ? linkStrength : 0);

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
                    .attr('id', `prov-img-${node.id}`)
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

        // Create force simulation - only spanning edges exert force
        const simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.links)
                .id(d => d.id)
                .distance(linkDistance)
                .strength(d => d.isSpanning ? linkStrength : 0))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(w / 2, h / 2))
            .force('x', d3.forceX(w / 2).strength(gravity))
            .force('y', d3.forceY(h / 2).strength(gravity))
            .force('collision', d3.forceCollide().radius(40));

        simulationRef.current = simulation;

        // Separate spanning and non-spanning edges for different rendering
        const nonSpanningLinks = graphData.links.filter(l => !l.isSpanning && showAllEdges);
        const spanningLinks = graphData.links.filter(l => l.isSpanning);

        // Create non-spanning edges (lighter, dashed) - rendered first (behind)
        g.append('g')
            .attr('class', 'non-spanning-links')
            .selectAll('line')
            .data(nonSpanningLinks)
            .enter()
            .append('line')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-dasharray', '4,4');

        // Create spanning edges (darker, solid) - rendered on top
        const spanningLink = g.append('g')
            .attr('class', 'spanning-links')
            .selectAll('line')
            .data(spanningLinks)
            .enter()
            .append('line')
            .attr('stroke', '#475569')
            .attr('stroke-width', d => Math.max(2, Math.min(6, d.weight / 20)))
            .attr('stroke-opacity', 0.8);

        // Create edge labels for spanning edges
        const linkLabels = g.append('g')
            .attr('class', 'link-labels')
            .selectAll('text')
            .data(spanningLinks)
            .enter()
            .append('text')
            .attr('font-size', '10px')
            .attr('fill', '#64748b')
            .attr('text-anchor', 'middle')
            .text(d => `${d.keypoints} pts`);

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

        // Node circles with images
        node.append('circle')
            .attr('r', d => d.isQuery ? 35 : 28)
            .attr('fill', d => {
                const imageUrl = getImageUrl ? getImageUrl(d.id) : null;
                return imageUrl ? `url(#prov-img-${d.id})` : (d.isQuery ? '#10b981' : '#6366f1');
            })
            .attr('stroke', d => d.isQuery ? '#10b981' : '#e2e8f0')
            .attr('stroke-width', d => d.isQuery ? 4 : 2)
            .attr('filter', 'url(#prov-drop-shadow)')
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
                    .attr('stroke-width', d.isQuery ? 4 : 2);
            });

        // Query badge
        node.filter(d => d.isQuery)
            .append('circle')
            .attr('r', 10)
            .attr('cx', 25)
            .attr('cy', -25)
            .attr('fill', '#10b981')
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
            .text('Q');

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
            // Update non-spanning links
            g.selectAll('.non-spanning-links line')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            // Update spanning links
            spanningLink
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
    }, [graphData, dimensions, getImageUrl, onNodeClick, gravity, showAllEdges, tightness]);

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
                <p>No graph data available</p>
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
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    title={t('provenance.graphSettings') || 'Graph Settings'}
                >
                    <FiSliders className={`w-5 h-5 ${showControls ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                </button>
            </div>

            {/* Graph Settings Panel */}
            {showControls && (
                <div className="absolute top-4 right-16 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 w-64 animate-in fade-in slide-in-from-right-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {t('provenance.graphSettings') || 'Graph Settings'}
                    </h3>
                    <div className="space-y-4">
                        {/* Visualization Depth Slider */}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                {t('provenance.visualDepth') || 'Visualization Depth'}
                                <span className="ml-2 text-emerald-500 font-medium">
                                    {depthSliderValue >= 10 ? (t('provenance.all') || 'All') : depthSliderValue}
                                </span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={depthSliderValue}
                                onChange={(e) => setDepthSliderValue(Number(e.target.value))}
                                onMouseUp={() => setVisualDepth(depthSliderValue)}
                                onTouchEnd={() => setVisualDepth(depthSliderValue)}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                <span>1</span>
                                <span>{t('provenance.hops') || 'hops'}</span>
                                <span>{t('provenance.all') || 'All'}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {t('provenance.depthHint') || 'Filter nodes by distance from query'}
                            </p>
                        </div>

                        {/* Tightness Slider */}
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                {t('provenance.graphTightness') || 'Graph Tightness'}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={tightness}
                                onChange={(e) => setTightness(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                <span>{t('provenance.loose') || 'Loose'}</span>
                                <span>{t('provenance.tight') || 'Tight'}</span>
                            </div>
                        </div>

                        {/* Show All Edges Toggle */}
                        <div
                            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 -mx-2 rounded transition-colors"
                            onClick={() => setShowAllEdges(!showAllEdges)}
                        >
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t('provenance.showAllMatches') || 'Show all matches'}
                            </span>
                            {showAllEdges ? (
                                <FiEye size={16} className="text-emerald-500" />
                            ) : (
                                <FiEyeOff size={16} className="text-gray-400" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Graph Info Overlay */}
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-sm backdrop-blur-sm border border-gray-100 dark:border-gray-700 pointer-events-none">
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{t('provenance.depth') || 'Depth'}:</span>
                        <span>{visualDepth >= 10 ? (t('provenance.all') || 'All') : visualDepth}</span>
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
                    onClick={() => setShowAllEdges(!showAllEdges)}
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
            {selectedNode && (() => {
                // Parse label to extract filename and tag (format: "filename (tag)" or just "filename")
                const labelMatch = (selectedNode.label || '').match(/^(.+?)\s*\(([^)]+)\)$/);
                const displayFilename = labelMatch ? labelMatch[1] : (selectedNode.label || 'N/A');
                const displayTag = labelMatch ? labelMatch[2] : null;

                // Also check for tags array from node data
                const nodeTags = selectedNode.tags || [];

                return (
                    <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-[280px] z-30 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 transition-all animate-in fade-in slide-in-from-left-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                                {t('provenance.imageDetails')}
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
                                            <span className="text-xs">{t('provenance.noPreview')}</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Metadata */}
                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">{t('provenance.filename')}</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                        {displayFilename}
                                    </span>
                                </div>

                                {/* Tags - from parsed label or node data */}
                                {(displayTag || nodeTags.length > 0) && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400 block mb-1">{t('provenance.tags') || 'Tags'}</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {displayTag && (
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                    #{displayTag}
                                                </span>
                                            )}
                                            {nodeTags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-blue-600 dark:text-blue-400 font-medium"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">{t('provenance.depth') || 'Depth'}</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {selectedNode.depth === 0 ? (t('provenance.queryImage') || 'Query') : `${selectedNode.depth} ${t('provenance.hopsFromQuery') || 'hop(s) from query'}`}
                                    </span>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    {selectedNode.isQuery ? (
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
            })()}

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

export default ProvenanceGraph;
