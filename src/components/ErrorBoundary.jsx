// src/components/ErrorBoundary.jsx
import React from 'react';
import ErrorPage from '../pages/ErrorPage';

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child component tree
 * and display a fallback UI instead of crashing the whole application.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
        
        // You could also log to an error reporting service here
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorPage 
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onReset={this.handleReset}
                    onReload={this.handleReload}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
