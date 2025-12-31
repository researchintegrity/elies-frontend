import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    FiCheck, FiFlag, FiInfo, FiEdit3, FiActivity, FiLink,
    FiMinimize2, FiMaximize2, FiBarChart2, FiChevronDown,
    FiPlus, FiImage, FiZap, FiCopy, FiGitBranch, FiLayers
} from 'react-icons/fi';
import { API_BASE_URL } from '../../../config/api';
import { api } from '../../../services/api';

// Components
import { TabButton } from './TabButton';
import TagInput from '../../TagInput';
import AnnotationModal from '../../annotation/AnnotationModal';
import DualImageComparisonModal from '../../annotation/DualImageComparisonModal';
import AddRelatedImageModal from '../../AddRelatedImageModal';
import RelationshipGraph from '../../RelationshipGraph';
import { AnalysisDetailsPanel } from '../../analysis';
import ProvenanceGraph from '../../ProvenanceGraph';
import { ANALYSIS_TYPE_CONFIG, STATUS_CONFIG, COLOR_CLASSES } from '../constants';

// Constants
const TAB_DETAILS = 'details';
const TAB_ANNOTATIONS = 'annotations';
const TAB_ANALYSIS = 'analysis';
const TAB_RELATED = 'related';

// Analysis Tools Config
const ANALYSIS_TOOLS_CONFIG = {
    ela: { id: 'ela', name: 'Error Level Analysis', hasCanvas: true },
    noise: { id: 'noise', name: 'Noise Analysis', hasCanvas: true },
    gradient: { id: 'gradient', name: 'Luminance Gradient', hasCanvas: true },
    levelSweep: { id: 'levelSweep', name: 'Level Sweep', hasCanvas: true },
    cloneDetection: { id: 'cloneDetection', name: 'Clone Detection', hasCanvas: true }
};

const FlaggedImageDetailPanel = ({
    image,
    onUnflag,
    onNavigate,
    selectedIds,
    onSelect,
    isSelectionMode,
    onAddTag,
    onRemoveTag,
    annotationModalOpen,
    setAnnotationModalOpen,
    t,
    locale
}) => {
    const [activeTab, setActiveTab] = useState(TAB_DETAILS);
    const [analyses, setAnalyses] = useState([]);
    const [annotations, setAnnotations] = useState([]);
    const [loadingRelationshipGraph, setLoadingRelationshipGraph] = useState(false);
    const [dualAnnotationCount, setDualAnnotationCount] = useState(0);
    const [relationshipGraph, setRelationshipGraph] = useState(null);
    const [showAddRelatedModal, setShowAddRelatedModal] = useState(false);
    const [graphDepth, setGraphDepth] = useState(5);
    const [imageExpanded, setImageExpanded] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [showAnalyzeMenu, setShowAnalyzeMenu] = useState(false);
    const analyzeMenuRef = useRef(null);

    // Analysis State
    const [selectedAnalysisForView, setSelectedAnalysisForView] = useState(null);

    // Helper
    const getFullImageUrl = (imageId) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/images/${imageId}/download${token ? `?token=${token}` : ''}`;
    };

    // Reset state on image change
    useEffect(() => {
        setSelectedAnalysisForView(null);
    }, [image?.imageId]);

    // Fetch Analyses
    useEffect(() => {
        const fetchAnalyses = async () => {
            if (!image?.imageId) return;
            try {
                const data = await api.getAnalysesByImage(image.imageId);
                setAnalyses(data || []);
            } catch (err) {
                console.error('Error fetching analyses:', err);
            }
        };
        fetchAnalyses();
    }, [image?.imageId]);

    // Fetch Annotations
    useEffect(() => {
        const fetchAnnotations = async () => {
            if (!image?.imageId) return;
            try {
                const [singleData, dualData] = await Promise.all([
                    api.getSingleAnnotations(image.imageId),
                    api.getDualAnnotations(image.imageId)
                ]);
                setAnnotations(singleData || []);
                setDualAnnotationCount(dualData?.length || 0);
            } catch (err) {
                console.error('Error fetching annotations:', err);
            }
        };
        fetchAnnotations();
    }, [image?.imageId]);

    // Fetch Relationship Graph
    useEffect(() => {
        const fetchRelationshipGraph = async () => {
            if (!image?.imageId || activeTab !== TAB_RELATED) return;
            setLoadingRelationshipGraph(true);
            try {
                const graphData = await api.getRelationshipGraph(image.imageId, graphDepth);
                setRelationshipGraph(graphData);
            } catch (err) {
                console.error('Error fetching relationship graph:', err);
                setRelationshipGraph(null);
            } finally {
                setLoadingRelationshipGraph(false);
            }
        };
        fetchRelationshipGraph();
    }, [image?.imageId, activeTab, graphDepth]);

    // Click outside listener for analyze menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (analyzeMenuRef.current && !analyzeMenuRef.current.contains(event.target)) {
                setShowAnalyzeMenu(false);
            }
        };
        if (showAnalyzeMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAnalyzeMenu]);

    const handleStartNewAnalysis = (analysisType) => {
        const pageMapping = {
            'imageAnalysis': 'imageAnalysis',
            'manipulationDetection': 'manipulationDetection',
            'copyMove': 'copyMove',
            'copyMoveSingle': 'copyMove',
            'provenance': 'provenance'
        };
        const targetPage = pageMapping[analysisType] || analysisType;

        sessionStorage.setItem('startAnalysis', JSON.stringify({
            imageIds: [image.imageId],
            targetPage: targetPage,
            mode: 'single'
        }));

        if (onNavigate) {
            onNavigate(targetPage);
        } else {
            window.location.reload();
        }
    };

    const handleReproduce = (analysis) => {
        const typeToPageKey = {
            'trufor': 'manipulationDetection',
            'single_image_copy_move': 'copyMove',
            'cross_image_copy_move': 'copyMove',
            'provenance': 'provenance',
            'cbir_search': 'cbirSearch',
            'screening_tool': 'imageAnalysis'
        };

        const pageKey = typeToPageKey[analysis.type];
        if (pageKey && analysis.source_image_id) {
            const reproduceData = {
                imageId: analysis.source_image_id,
                targetImageId: analysis.target_image_id || null,
                parameters: analysis.parameters,
                type: analysis.type,
                targetPage: pageKey
            };
            sessionStorage.setItem('reproduceAnalysis', JSON.stringify(reproduceData));
            window.location.reload();
        }
    };

    const handleViewFullResults = (analysis) => {
        const typeToPageKey = {
            'trufor': 'manipulationDetection',
            'single_image_copy_move': 'copyMove',
            'cross_image_copy_move': 'copyMove',
            'provenance': 'provenance',
            'cbir_search': 'cbirSearch',
            'screening_tool': 'imageAnalysis'
        };

        const pageKey = typeToPageKey[analysis.type];
        if (pageKey && analysis.status === 'completed') {
            const viewResultsData = {
                analysisId: analysis._id,
                imageId: analysis.source_image_id,
                targetImageId: analysis.target_image_id || null,
                parameters: analysis.parameters,
                type: analysis.type,
                results: analysis.results || {},
                targetPage: pageKey
            };
            sessionStorage.setItem('viewResultsAnalysis', JSON.stringify(viewResultsData));
            window.location.reload();
        }
    };

    if (!image) return null;

    const analysisOptions = [
        { key: 'imageAnalysis', icon: FiImage, label: t('analyze.imageAnalysis') || 'Image Analysis' },
        { key: 'manipulationDetection', icon: FiZap, label: t('analyze.manipulationDetection') || 'Manipulation Detection' },
        { key: 'copyMoveSingle', icon: FiCopy, label: t('analyze.copyMoveSingle') || 'Copy-Move (Single)' },
        { key: 'provenance', icon: FiGitBranch, label: t('analyze.provenance') || 'Provenance' },
    ];

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="flex-none px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex-shrink-0 cursor-pointer transition-opacity duration-200 ${selectedIds?.has(image.id) || isSelectionMode ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                            onClick={() => onSelect && onSelect(image.id)}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds?.has(image.id)
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
                                }`}>
                                {selectedIds?.has(image.id) && <FiCheck size={14} strokeWidth={3} />}
                            </div>
                        </div>
                        <h3 className={`text-lg font-bold truncate flex-1 mr-4 ${selectedIds?.has(image.id) ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                            {image.filename}
                        </h3>
                    </div>
                    <button
                        onClick={() => onUnflag(image)}
                        className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        title={t('flagged.unflag') || 'Remove flag'}
                    >
                        <FiFlag size={16} className="fill-current" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex-none flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <TabButton icon={FiInfo} label={t('flagged.tabs.details') || 'Details'} isActive={activeTab === TAB_DETAILS} onClick={() => setActiveTab(TAB_DETAILS)} />
                <TabButton icon={FiEdit3} label={t('flagged.tabs.annotations') || 'Annotations'} isActive={activeTab === TAB_ANNOTATIONS} onClick={() => setActiveTab(TAB_ANNOTATIONS)} count={annotations.length} />
                <TabButton icon={FiActivity} label={t('flagged.tabs.analysis') || 'Analysis'} isActive={activeTab === TAB_ANALYSIS} onClick={() => setActiveTab(TAB_ANALYSIS)} count={analyses.length} />
                <TabButton icon={FiLink} label={t('flagged.tabs.related') || 'Related'} isActive={activeTab === TAB_RELATED} onClick={() => setActiveTab(TAB_RELATED)} count={relationshipGraph?.total_nodes_count > 1 ? relationshipGraph.total_nodes_count - 1 : (relationshipGraph?.nodes?.length > 1 ? relationshipGraph.nodes.length - 1 : 0)} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === TAB_DETAILS && (
                    <div className="h-full flex flex-col">
                        <div className={`flex-shrink-0 ${imageExpanded ? 'flex-1 min-h-[300px]' : 'h-64'} bg-gray-100 dark:bg-gray-800 relative`}>
                            <img src={getFullImageUrl(image.imageId)} alt={image.filename} className="w-full h-full object-contain" />
                            <button onClick={() => setImageExpanded(!imageExpanded)} className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors">
                                {imageExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                            </button>
                        </div>
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"><span className="text-xs text-gray-500 mb-1 block">Origin</span><span className="text-sm font-medium">{image.sourceType}</span></div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"><span className="text-xs text-gray-500 mb-1 block">Uploaded</span><span className="text-sm font-medium">{new Date(image.uploadedDate).toLocaleDateString(locale)}</span></div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"><span className="text-xs text-gray-500 mb-1 block">Size</span><span className="text-sm font-medium">{(image.fileSize / 1024).toFixed(1)} KB</span></div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"><span className="text-xs text-gray-500 mb-1 block">Format</span><span className="text-sm font-medium uppercase">{image.filename.split('.').pop()}</span></div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h4>
                                <TagInput tags={image.imageType || []} onAdd={(tag) => onAddTag(image, tag)} onRemove={(tag) => onRemoveTag(image, tag)} />
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setAnnotationModalOpen(true)} className="flex items-center justify-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"><FiEdit3 /> Annotate</button>
                                    <div className="relative" ref={analyzeMenuRef}>
                                        <button onClick={() => setShowAnalyzeMenu(!showAnalyzeMenu)} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><FiBarChart2 /> Analyze <FiChevronDown className={showAnalyzeMenu ? 'rotate-180' : ''} /></button>
                                        {showAnalyzeMenu && (
                                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border p-2 z-50">
                                                {analysisOptions.map(opt => (
                                                    <button key={opt.key} onClick={() => { setShowAnalyzeMenu(false); handleStartNewAnalysis(opt.key); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 text-left rounded-lg"><opt.icon /> {opt.label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Annotations Tab */}
                {activeTab === TAB_ANNOTATIONS && (
                    <div className="h-full flex flex-col">
                        <div className="flex-none p-4 border-b flex justify-between">
                            <h4 className="font-semibold text-sm">Annotations ({annotations.length})</h4>
                            <button onClick={() => setAnnotationModalOpen(true)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg">Edit</button>
                        </div>
                        {dualAnnotationCount > 0 && (
                            <div className="flex-none px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center text-indigo-700 dark:text-indigo-300">
                                <span className="text-xs flex items-center gap-2"><FiLayers /> {dualAnnotationCount} linked annotations</span>
                                <button onClick={() => setShowComparisonModal(true)} className="text-xs underline font-medium">Compare</button>
                            </div>
                        )}
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
                            <div className="relative inline-block">
                                <img src={getFullImageUrl(image.imageId)} alt={image.filename} className="max-h-[40vh] object-contain block" />
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {annotations.map((ann, i) => {
                                        const coords = ann.coords || {};
                                        const color = ann.type === 'imagedb_match' ? '#3B82F6' : '#EF4444'; // Blue for match, Red for others

                                        if (ann.shape_type === 'polygon' && coords.points) {
                                            const pointsStr = coords.points.map(p => `${p.x},${p.y}`).join(' ');
                                            return (
                                                <polygon
                                                    key={i}
                                                    points={pointsStr}
                                                    fill="rgba(239, 68, 68, 0.2)"
                                                    stroke={color}
                                                    strokeWidth="0.5" // Relative to 100x100 viewbox, 0.5 is roughly 0.5% of image size
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            );
                                        } else {
                                            return (
                                                <rect
                                                    key={i}
                                                    x={coords.x}
                                                    y={coords.y}
                                                    width={coords.width}
                                                    height={coords.height}
                                                    fill="rgba(239, 68, 68, 0.2)"
                                                    stroke={color}
                                                    strokeWidth="0.5"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            );
                                        }
                                    })}
                                </svg>
                            </div>
                        </div>
                        <div className="flex-none p-3 max-h-32 overflow-y-auto bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {annotations.map((a, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded text-xs">{a.text || 'Annotation ' + (i + 1)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Analysis Tab */}
                {activeTab === TAB_ANALYSIS && (
                    <div className="h-full flex">
                        <div className="w-56 border-r flex flex-col bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
                            <div className="p-2 border-b dark:border-gray-800">
                                <button onClick={() => setShowAnalyzeMenu(!showAnalyzeMenu)} className="w-full flex items-center justify-between px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg"><span className="flex items-center gap-1"><FiPlus /> New Analysis</span></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1 space-y-1">
                                {analyses.map(a => {
                                    const config = ANALYSIS_TYPE_CONFIG[a.type] || ANALYSIS_TYPE_CONFIG.screening_tool;
                                    const StatusIcon = STATUS_CONFIG[a.status]?.icon || FiActivity;
                                    const Icon = config.icon;
                                    const isSelected = selectedAnalysisForView?._id === a._id;

                                    return (
                                        <button
                                            key={a._id}
                                            onClick={() => setSelectedAnalysisForView(a)}
                                            className={`w-full text-left p-2 rounded-lg text-xs mb-1 transition-all flex items-center gap-2
                                                ${isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent'
                                                }`}
                                        >
                                            <div className={`p-1.5 rounded flex-shrink-0 ${COLOR_CLASSES[config.color]}`}>
                                                <Icon size={14} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{config.label}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'completed' ? 'bg-green-500' : a.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                                    <span className="text-[10px] opacity-70 truncate">{new Date(a.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col">
                            {selectedAnalysisForView ? (
                                <AnalysisDetailsPanel
                                    analysis={selectedAnalysisForView}
                                    onClose={() => setSelectedAnalysisForView(null)}
                                    onReproduce={handleReproduce}
                                    onViewResults={handleViewFullResults}
                                    t={t}
                                    locale={locale}
                                    embedded={true}
                                    ProvenanceGraph={ProvenanceGraph}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Select an analysis</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Related Tab */}
                {activeTab === TAB_RELATED && (
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b flex justify-between">
                            <h4 className="font-semibold text-sm">Related Images</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAddRelatedModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg flex items-center gap-1"><FiPlus /> Add</button>
                                <button onClick={() => setShowComparisonModal(true)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg flex items-center gap-1"><FiLayers /> Compare</button>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            {loadingRelationshipGraph ? (
                                <div className="absolute inset-0 flex items-center justify-center">Loading...</div>
                            ) : relationshipGraph ? (
                                <RelationshipGraph
                                    nodes={relationshipGraph.nodes}
                                    edges={relationshipGraph.edges}
                                    queryImageId={image.imageId}
                                    getImageUrl={(id) => `${API_BASE_URL}/images/${id}/thumbnail?token=${localStorage.getItem('authToken')}`}
                                    currentDepth={graphDepth}
                                    onDepthChange={setGraphDepth}
                                    onNodeClick={() => { }}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No related images</div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Modals */}
            <AnnotationModal
                isOpen={annotationModalOpen}
                imageUrl={getFullImageUrl(image.imageId)}
                imageId={image.imageId}
                imageName={image.filename}
                existingAnnotations={annotations}
                onClose={() => setAnnotationModalOpen(false)}
                onSaveSuccess={() => {
                    api.getSingleAnnotations(image.imageId).then(setAnnotations);
                }}
                availableAnalysisTools={Object.values(ANALYSIS_TOOLS_CONFIG)}
            />

            {showComparisonModal && (
                <DualImageComparisonModal
                    isOpen={showComparisonModal}
                    onClose={() => setShowComparisonModal(false)}
                    selectedImage={image}
                    onSaveSuccess={() => {
                        api.getDualAnnotations(image.imageId).then(data => setDualAnnotationCount(data.length));
                    }}
                />
            )}

            <AddRelatedImageModal
                isOpen={showAddRelatedModal}
                onClose={() => setShowAddRelatedModal(false)}
                currentImageId={image.imageId}
                currentImageFilename={image.filename}
                onRelationshipsCreated={() => {
                    api.getRelationshipGraph(image.imageId, graphDepth).then(setRelationshipGraph);
                }}
            />

        </div>
    );
};

FlaggedImageDetailPanel.propTypes = {
    image: PropTypes.object,
    onUnflag: PropTypes.func.isRequired,
    onNavigate: PropTypes.func,
    selectedIds: PropTypes.instanceOf(Set),
    onSelect: PropTypes.func,
    isSelectionMode: PropTypes.bool,
    onAddTag: PropTypes.func.isRequired,
    onRemoveTag: PropTypes.func.isRequired,
    annotationModalOpen: PropTypes.bool.isRequired,
    setAnnotationModalOpen: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    locale: PropTypes.string
};

export default FlaggedImageDetailPanel;
