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
import './PDFViewer.css';
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
        <div className="pdf-viewer-root">
            {/* Toolbar */}
            <div className="pdf-toolbar">
                <div className="pdf-toolbar-group">
                    <button
                        className="pdf-toolbar-btn"
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1 || loading}
                        title="Página Anterior"
                    >
                        <FiChevronLeft />
                    </button>
                    <span className="pdf-page-info">
                        {loading ? '...' : `${pageNumber} / ${numPages || '--'}`}
                    </span>
                    <button
                        className="pdf-toolbar-btn"
                        onClick={() => changePage(1)}
                        disabled={pageNumber >= (numPages || 1) || loading}
                        title="Próxima Página"
                    >
                        <FiChevronRight />
                    </button>
                </div>

                <div className="pdf-toolbar-group">
                    <button className="pdf-toolbar-btn" onClick={zoomOut} title="Diminuir Zoom">
                        <FiZoomOut />
                    </button>
                    <span className="pdf-page-info pdf-zoom-level">
                        {Math.round(scale * 100)}%
                    </span>
                    <button className="pdf-toolbar-btn" onClick={zoomIn} title="Aumentar Zoom">
                        <FiZoomIn />
                    </button>
                </div>

                <div className="pdf-toolbar-group">
                    <button className="pdf-toolbar-btn" onClick={rotate} title="Girar">
                        <FiRotateCw />
                    </button>
                    <button className="pdf-toolbar-btn" onClick={handleDownload} title="Baixar PDF">
                        <FiDownload />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pdf-document-container">
                {error ? (
                    <div className="pdf-error">
                        <FiAlertTriangle className="pdf-error-icon" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="pdf-document-wrapper">
                        <Document
                            file={url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                                <div className="pdf-loading">
                                    <FiLoader className="pdf-loading-spinner" />
                                    <p>Carregando PDF...</p>
                                </div>
                            }
                            error={
                                <div className="pdf-error">
                                    <FiAlertTriangle className="pdf-error-icon" />
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
