// src/components/common/__tests__/EmptyState.test.jsx
// Tests for EmptyState component
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(
            <EmptyState
                title="No items found"
                description="There are no items to display."
            />
        );

        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
        const handleAction = vi.fn();
        render(
            <EmptyState
                title="Empty"
                description="No data"
                actionLabel="Upload Now"
                onAction={handleAction}
                showAction={true}
            />
        );

        const button = screen.getByText('Upload Now');
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('hides action button when showAction is false', () => {
        render(
            <EmptyState
                title="Empty"
                description="No data"
                actionLabel="Upload Now"
                onAction={() => { }}
                showAction={false}
            />
        );

        expect(screen.queryByText('Upload Now')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <EmptyState
                title="Test"
                description="Test description"
                className="custom-empty-state"
            />
        );

        expect(container.firstChild).toHaveClass('custom-empty-state');
    });

    it('uses default values for title and description', () => {
        render(<EmptyState />);

        expect(screen.getByText('No items found')).toBeInTheDocument();
        expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
    });
});
