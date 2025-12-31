// src/pages/CopyMove/constants.js
import { FiTarget, FiGrid } from 'react-icons/fi';

export const IMAGES_PER_PAGE = 18;
export const POLL_INTERVAL = 2000;
export const MAX_POLL_ATTEMPTS = 60;
export const SIMILARITY_PER_PAGE = 12;

export const STEPS = {
    SELECT: 0,
    CONFIGURE: 1,
    RESULTS: 2
};

export const STEP_LABELS = ['select', 'configure', 'results'];

export const METHOD_TYPES = [
    { id: 'keypoint', name: 'Feature Matching', descriptionKey: 'copyMove.keypointDesc', icon: FiTarget },
    { id: 'dense', name: 'Block Matching', descriptionKey: 'copyMove.denseDesc', icon: FiGrid }
];

export const DENSE_METHODS = [
    { id: 1, name: 'ZM-cart', description: 'Zernike Moments (Cartesian)' },
    { id: 2, name: 'ZM-polar', description: 'Zernike Moments (Polar) - Default' },
    { id: 3, name: 'PCT-cart', description: 'Polar Cosine Transform (Cartesian)' },
    { id: 4, name: 'PCT-polar', description: 'Polar Cosine Transform (Polar)' },
    { id: 5, name: 'FMT', description: 'Fourier-Mellin Transform' }
];

export const KEYPOINT_DESCRIPTORS = [
    { id: 'cv_rsift', name: 'RootSIFT', descriptionKey: 'copyMove.descriptorRsift' },
    { id: 'cv_sift', name: 'SIFT', descriptionKey: 'copyMove.descriptorSift' },
    { id: 'vlfeat_sift_heq', name: 'VLFeat SIFT HEQ', descriptionKey: 'copyMove.descriptorVlfeat' }
];
