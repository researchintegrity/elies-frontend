// src/components/common/__tests__/SkeletonCard.test.jsx
// Tests for SkeletonCard component
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkeletonCard, { SkeletonGrid } from '../SkeletonCard';

describe('SkeletonCard', () => {
    it('renders grid variant by default', () => {
        const { container } = render(<SkeletonCard />);
        expect(container.firstChild).toHaveClass('bg-white');
        expect(container.firstChild).toHaveClass('rounded-xl');
    });

    it('renders list variant when specified', () => {
        const { container } = render(<SkeletonCard variant="list" />);
        expect(container.firstChild).toHaveClass('flex');
        expect(container.firstChild).toHaveClass('items-center');
    });

    it('applies additional className', () => {
        const { container } = render(<SkeletonCard className="custom-class" />);
        expect(container.firstChild).toHaveClass('custom-class');
    });
});

describe('SkeletonGrid', () => {
    it('renders correct number of skeleton cards', () => {
        const { container } = render(<SkeletonGrid count={4} />);
        const cards = container.querySelectorAll('.bg-white');
        expect(cards).toHaveLength(4);
    });

    it('renders in grid layout by default', () => {
        const { container } = render(<SkeletonGrid />);
        expect(container.firstChild).toHaveClass('grid');
    });

    it('renders in list layout when specified', () => {
        const { container } = render(<SkeletonGrid variant="list" />);
        expect(container.firstChild).toHaveClass('space-y-3');
    });

    it('uses default count of 6', () => {
        const { container } = render(<SkeletonGrid />);
        const cards = container.querySelectorAll('.bg-white');
        expect(cards).toHaveLength(6);
    });
});
