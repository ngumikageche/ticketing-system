# Error Boundaries

This application implements React Error Boundaries to gracefully handle JavaScript errors and prevent the entire application from crashing.

## Components

### ErrorBoundary (`src/components/ErrorBoundary.jsx`)
A top-level error boundary that catches errors from the entire application. It displays a full-page error screen with options to retry or reload the page.

**Features:**
- Catches errors in the component tree
- Displays user-friendly error message
- Provides retry and reload options
- Shows detailed error information in development mode
- Logs errors to console

**Usage:**
```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourAppComponents />
    </ErrorBoundary>
  );
}
```

### ComponentErrorBoundary (`src/components/ComponentErrorBoundary.jsx`)
A smaller error boundary for wrapping individual components or sections. It displays an inline error message without affecting the rest of the page.

**Features:**
- Isolates errors to specific components
- Customizable fallback UI
- Retry functionality
- Optional error callback

**Usage:**
```jsx
import ComponentErrorBoundary from './components/ComponentErrorBoundary';

function MyComponent() {
  return (
    <ComponentErrorBoundary
      fallbackMessage="This component failed to load."
      showRetry={true}
    >
      <SomeComplexComponent />
    </ComponentErrorBoundary>
  );
}
```

**Props:**
- `fallback`: Custom fallback component (receives `onRetry` prop)
- `fallbackMessage`: Default error message
- `showRetry`: Whether to show retry button (default: true)
- `onError`: Callback function called when error occurs

## Hooks

### useErrorHandler (`src/hooks/useErrorHandler.js`)
A custom hook for error handling in functional components.

**Usage:**
```jsx
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { error, resetError, handleError } = useErrorHandler();

  if (error) {
    return <div>Error occurred: {error.message}</div>;
  }

  return (
    <div>
      <button onClick={() => handleError(new Error('Test error'))}>
        Trigger Error
      </button>
      <button onClick={resetError}>Reset</button>
    </div>
  );
}
```

### withErrorBoundary HOC
A higher-order component for wrapping components with error boundaries.

**Usage:**
```jsx
import { withErrorBoundary } from '../hooks/useErrorHandler';

const SafeComponent = withErrorBoundary(MyComponent, {
  fallbackMessage: 'Component failed',
  showRetry: false
});
```

## Best Practices

1. **Wrap critical components**: Use `ComponentErrorBoundary` around components that might fail (charts, data tables, complex forms)

2. **Top-level boundary**: Always wrap the entire app with `ErrorBoundary` to catch unhandled errors

3. **Error logging**: Implement proper error logging/reporting in `componentDidCatch`

4. **User experience**: Provide clear error messages and recovery options

5. **Development vs Production**: Show detailed error info only in development

## Examples

### Wrapping a data table:
```jsx
<ComponentErrorBoundary fallbackMessage="Failed to load data table.">
  <DataTable data={data} />
</ComponentErrorBoundary>
```

### Custom fallback component:
```jsx
const CustomFallback = ({ onRetry }) => (
  <div className="error-fallback">
    <h3>Something went wrong</h3>
    <button onClick={onRetry}>Try Again</button>
  </div>
);

<ComponentErrorBoundary fallback={CustomFallback}>
  <ComplexComponent />
</ComponentErrorBoundary>
```

### Using in async operations:
```jsx
const { handleError } = useErrorHandler();

const fetchData = async () => {
  try {
    await apiCall();
  } catch (error) {
    handleError(error);
  }
};
```

## Error Boundary Limitations

- Error boundaries do not catch errors in:
  - Event handlers (use try/catch)
  - Asynchronous code (use try/catch)
  - Server-side rendering
  - Errors thrown in the error boundary itself

- Error boundaries work like JavaScript `catch` blocks but for React components</content>
<parameter name="filePath">/home/future/support-ticketing-system/dashboard/src/components/README_ErrorBoundaries.md