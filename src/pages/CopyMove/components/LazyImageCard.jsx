import React from 'react';
import ImageCard from './ImageCard';
import { getThumbnailUrl } from '../utils';

const LazyImageCard = ({ image, isSelected, onClick, role, t }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    return <ImageCard image={image} isSelected={isSelected} onClick={onClick} imageUrl={imageUrl} loading={false} role={role} t={t} />;
};

export default LazyImageCard;
