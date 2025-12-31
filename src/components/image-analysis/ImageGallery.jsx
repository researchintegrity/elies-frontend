import React from 'react';
import {
    FiAlertTriangle,
    FiCheck,
    FiFilter,
    FiMaximize2,
    FiMinimize2,
    FiSearch,
    FiTag,
    FiCalendar,
    FiX,
    FiChevronLeft,
    FiChevronRight
} from 'react-icons/fi';

const IMAGES_PER_PAGE = 24;

// Compact Image Card for Source Selection
export const SourceImageCard = ({ image, isSelected, onClick, imageUrl, loading, size = 'default' }) => (
    <div
        onClick={onClick}
        className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected
            ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
    >
        <div className={`${size === 'large' ? 'aspect-[5/3]' : 'aspect-square'} bg-gray-100 dark:bg-gray-800 overflow-hidden`}>
            {loading ? (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : imageUrl ? (
                <img
                    src={imageUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiAlertTriangle size={16} />
                </div>
            )}
        </div>
        {isSelected && (
            <div className="absolute top-1 right-1 bg-indigo-600 text-white p-1 rounded-full">
                <FiCheck size={10} strokeWidth={3} />
            </div>
        )}
    </div>
);


const ImageGallery = ({
    images,
    imageUrls,
    loadingImages,
    loadingUrls,
    selectedImage,
    onSelectImage,
    totalImages,
    page,
    setPage,
    totalPages,
    filters,
    setFilters,
    availableCategories,
    collapsed,
    setCollapsed,
    showFilters,
    setShowFilters,
    t
}) => {
    return (
        <div className={`flex-none border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ${collapsed
            ? 'w-12'
            : selectedImage
                ? 'w-64'
                : 'w-full max-w-6xl'
            }`}>
            <div className="h-full flex flex-col">
                {/* Gallery Header */}
                <div className="flex-none p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {selectedImage
                                    ? (t('analysis.selectImage') || 'Select Image')
                                    : (t('analysis.imageGallery') || 'Browse Images')
                                }
                            </span>
                            {!selectedImage && (
                                <span className="text-xs text-gray-400">
                                    ({totalImages} {t('gallery.images', 'images')})
                                </span>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        {!collapsed && (
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${(filters.search || filters.dateFrom || filters.dateTo || filters.imageType)
                                    ? 'text-indigo-500'
                                    : 'text-gray-500'
                                    }`}
                                title={t('filters.toggle', 'Toggle filters')}
                            >
                                <FiFilter size={18} />
                            </button>
                        )}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                        >
                            {collapsed ? <FiMaximize2 size={18} /> : <FiMinimize2 size={18} />}
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {!collapsed && showFilters && (
                    <div className="flex-none p-2 border-b border-gray-100 dark:border-gray-700 space-y-2">
                        {/* Search Input */}
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => { setFilters.setSearch(e.target.value); setPage(1); }}
                                placeholder={t('gallery.searchPlaceholder', 'Search...')}
                                className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Image Type Dropdown */}
                        <div className="relative">
                            <FiTag className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <select
                                value={filters.imageType}
                                onChange={(e) => { setFilters.setImageType(e.target.value); setPage(1); }}
                                className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                            >
                                <option value="">{t('cbir.allTypes', 'All Types')}</option>
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-1">
                            <div className="relative">
                                <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => { setFilters.setDateFrom(e.target.value); setPage(1); }}
                                    className="w-full pl-6 pr-1 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    title={t('filters.dateFrom', 'From date')}
                                />
                            </div>
                            <div className="relative">
                                <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => { setFilters.setDateTo(e.target.value); setPage(1); }}
                                    className="w-full pl-6 pr-1 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    title={t('filters.dateTo', 'To date')}
                                />
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {(filters.search || filters.dateFrom || filters.dateTo || filters.imageType) && (
                            <button
                                onClick={() => {
                                    setFilters.setSearch('');
                                    setFilters.setDateFrom('');
                                    setFilters.setDateTo('');
                                    setFilters.setImageType('');
                                    setPage(1);
                                }}
                                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                                <FiX size={12} />
                                {t('filters.clearFilters', 'Clear filters')}
                            </button>
                        )}

                        {/* Results count */}
                        <div className="text-center text-xs text-gray-400">
                            {totalImages} {t('gallery.images', 'images')}
                        </div>
                    </div>
                )}

                {/* Gallery Content */}
                {!collapsed && (
                    <div className="flex-1 overflow-y-auto p-1.5">
                        {loadingImages ? (
                            <div className={`grid gap-4 ${selectedImage ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                                {[...Array(selectedImage ? 9 : 18)].map((_, i) => (
                                    <div key={i} className={`${selectedImage ? 'aspect-square' : 'aspect-[5/3]'} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse`} />
                                ))}
                            </div>
                        ) : images.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">
                                {t('analysis.noImages') || 'No images'}
                            </div>
                        ) : (
                            <div className={`grid gap-4 ${selectedImage ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                                {images.map((img) => (
                                    <SourceImageCard
                                        key={img.id}
                                        image={img}
                                        isSelected={selectedImage?.id === img.id}
                                        onClick={() => onSelectImage(img)}
                                        imageUrl={imageUrls[img.id]}
                                        loading={loadingUrls?.[img.id]}
                                        size={selectedImage ? 'default' : 'large'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {!collapsed && totalImages > IMAGES_PER_PAGE && (
                    <div className="flex-none p-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            <FiChevronLeft size={14} />
                        </button>
                        <span className="text-sm text-gray-500">{page}/{totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageGallery;
