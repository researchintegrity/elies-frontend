// src/components/ProvenanceGraph.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';

/**
 * ProvenanceGraph - D3.js Force-Directed Graph Visualization
 * 
 * Displays a provenance graph with:
 * - Nodes as circular image thumbnails
 * - Edges showing content sharing relationships
 * - Interactive pan/zoom
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
    gravity = 0.05,
}) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width, height });
    const [selectedNode, setSelectedNode] = useState(null);

    // Process nodes and edges for D3
    const graphData = useMemo(() => {
        if (!nodes || !nodes.length) return { nodes: [], links: [] };

        // Create a map of node IDs
        const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

        // Use spanning tree edges if available, otherwise use all edges
        const safeSpanningEdges = Array.isArray(spanningTreeEdges) ? spanningTreeEdges : [];
        const safeAllEdges = Array.isArray(edges) ? edges : [];
        const edgesToUse = safeSpanningEdges.length > 0 ? safeSpanningEdges : safeAllEdges;

        const processedNodes = nodes.map(n => ({
            ...n,
            isQuery: n.id === queryImageId || n.is_query,
        }));

        // Handle different edge formats from API
        const processedLinks = edgesToUse
            .map(e => {
                const source = e.source || e.image1_id;
                const target = e.target || e.image2_id;
                return {
                    source,
                    target,
                    weight: e.shared_area_source || e.shared_area_img1 || e.weight || 50,
                    keypoints: e.matched_keypoints || 0,
                };
            })
            .filter(e => e.source && e.target && nodeMap.has(e.source) && nodeMap.has(e.target));

        return { nodes: processedNodes, links: processedLinks };
    }, [nodes, edges, spanningTreeEdges, queryImageId]);

    // Handle container resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width: containerWidth } = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: containerWidth,
                    height: Math.max(400, containerWidth * 0.6),
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                    .attr('id', `img-${node.id}`)
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
            .attr('id', 'drop-shadow')
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

        // Create force simulation
        const simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.links)
                .id(d => d.id)
                .distance(120)
                .strength(0.5))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(w / 2, h / 2))
            .force('x', d3.forceX(w / 2).strength(gravity))
            .force('y', d3.forceY(h / 2).strength(gravity))
            .force('collision', d3.forceCollide().radius(40));

        // Create edges (links)
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(graphData.links)
            .enter()
            .append('line')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', d => Math.max(2, Math.min(6, d.weight / 20)))
            .attr('stroke-opacity', 0.6);

        // Create edge labels
        const linkLabels = g.append('g')
            .attr('class', 'link-labels')
            .selectAll('text')
            .data(graphData.links)
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
                return imageUrl ? `url(#img-${d.id})` : (d.isQuery ? '#10b981' : '#6366f1');
            })
            .attr('stroke', d => d.isQuery ? '#10b981' : '#e2e8f0')
            .attr('stroke-width', d => d.isQuery ? 4 : 2)
            .attr('filter', 'url(#drop-shadow)')
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
            link
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
        };
    }, [graphData, dimensions, getImageUrl, onNodeClick, gravity]);

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
        <div ref={containerRef} className="relative w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
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
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-md text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                    <span className="text-gray-600 dark:text-gray-300">Query Image</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white" />
                    <span className="text-gray-600 dark:text-gray-300">Related Image</span>
                </div>
            </div>

            {/* Selected Node Info */}
            {selectedNode && (
                <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg max-w-[200px] z-10">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {selectedNode.label || selectedNode.id}
                    </p>
                    {selectedNode.isQuery && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                            Query Image
                        </span>
                    )}
                    <button
                        onClick={() => setSelectedNode(null)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                        Close
                    </button>
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

export default ProvenanceGraph;
