import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    FiZoomIn,
    FiZoomOut,
    FiChevronLeft,
    FiChevronRight,
    FiRotateCw,
    FiDownload,
    FiLoader,
    FiAlertTriangle
} from 'react-icons/fi';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const PDFViewer = ({ url, filename }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
        setPageNumber(1);
    }

    function onDocumentLoadError(err) {
        console.error('Error loading PDF:', err);
        setError('Falha ao carregar o documento PDF.');
        setLoading(false);
    }

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => {
            const newPage = prevPageNumber + offset;
            return Math.min(Math.max(1, newPage), numPages || 1);
        });
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const rotate = () => setRotation(prev => (prev + 90) % 360);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#525659] text-white overflow-hidden rounded-lg">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#323639] shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-10 gap-4">
                <div className="flex items-center gap-2">
                    <button
                        className="bg-transparent border-none text-[#f1f1f1] p-2 rounded cursor-pointer flex items-center justify-center transition-colors
                          hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1 || loading}
                        title="Página Anterior"
                    >
                        <FiChevronLeft />
                    </button>
                    <span className="text-sm text-[#e0e0e0] whitespace-nowrap">
                        {loading ? '...' : `${pageNumber} / ${numPages || '--'}`}
                    </span>
                    <button
                        className="bg-transparent border-none text-[#f1f1f1] p-2 rounded cursor-pointer flex items-center justify-center transition-colors
                          hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => changePage(1)}
                        disabled={pageNumber >= (numPages || 1) || loading}
                        title="Próxima Página"
                    >
                        <FiChevronRight />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="bg-transparent border-none text-[#f1f1f1] p-2 rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-white/10"
                        onClick={zoomOut}
                        title="Diminuir Zoom"
                    >
                        <FiZoomOut />
                    </button>
                    <span className="text-sm text-[#e0e0e0] whitespace-nowrap min-w-[3rem] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        className="bg-transparent border-none text-[#f1f1f1] p-2 rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-white/10"
                        onClick={zoomIn}
                        title="Aumentar Zoom"
                    >
                        <FiZoomIn />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="bg-transparent border-none text-[#f1f1f1] p-2 rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-white/10"
                        onClick={rotate}
                        title="Girar"
                    >
                        <FiRotateCw />
                    </button>
                    <button
                        className="bg-transparent border-none text-[#f1f1f1] p-2 rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-white/10"
                        onClick={handleDownload}
                        title="Baixar PDF"
                    >
                        <FiDownload />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto flex justify-center p-8 relative">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full w-full text-[#e0e0e0] gap-4">
                        <FiAlertTriangle className="text-5xl text-[#e74c3c]" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out">
                        <Document
                            file={url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                                <div className="flex flex-col items-center justify-center h-full w-full text-[#e0e0e0] gap-4">
                                    <FiLoader className="text-[2.5rem] animate-spin text-[#3498db]" />
                                    <p>Carregando PDF...</p>
                                </div>
                            }
                            error={
                                <div className="flex flex-col items-center justify-center h-full w-full text-[#e0e0e0] gap-4">
                                    <FiAlertTriangle className="text-5xl text-[#e74c3c]" />
                                    <p>Erro ao renderizar PDF.</p>
                                </div>
                            }
                        >
                            {!loading && (
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    rotate={rotation}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="bg-white"
                                />
                            )}
                        </Document>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFViewer;
