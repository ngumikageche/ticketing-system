import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import ComponentErrorBoundary from '../components/ComponentErrorBoundary';

// Custom hook for error handling in functional components
export const useErrorHandler = () => {
    const [error, setError] = useState(null);

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    const handleError = useCallback((error) => {
        console.error('Error caught by useErrorHandler:', error);
        setError(error);
        toast.error(error.message || 'An error occurred');
    }, []);

    return {
        error,
        resetError,
        handleError
    };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
    return function WrappedComponent(props) {
        return ( <
            ComponentErrorBoundary {...errorBoundaryProps } >
            <
            Component {...props }
            /> < /
            ComponentErrorBoundary >
        );
    };
};