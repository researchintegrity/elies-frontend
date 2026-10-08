// src/pages/CopyMove/constants.js
import { FiTarget, FiGrid, FiCpu } from 'react-icons/fi';

export const IMAGES_PER_PAGE = 18;
export const POLL_INTERVAL = 2000;
export const MAX_POLL_ATTEMPTS = 60;
export const SIMILARITY_PER_PAGE = 12;

// Forgeryscope runs several deep-learning models (on CPU by default) and can
// wait in the queue behind other analyses: poll for up to 20 minutes.
const MAX_POLL_ATTEMPTS_BY_METHOD = { forgeryscope: 600 };

export const maxPollAttempts = (method) => MAX_POLL_ATTEMPTS_BY_METHOD[method] || MAX_POLL_ATTEMPTS;

export const STEPS = {
    SELECT: 0,
    CONFIGURE: 1,
    RESULTS: 2
};

export const STEP_LABELS = ['select', 'configure', 'results'];

// `modes`: the analysis modes ('single', 'cross') a method supports
export const METHOD_TYPES = [
    { id: 'keypoint', name: 'Feature Matching', descriptionKey: 'copyMove.keypointDesc', icon: FiTarget, modes: ['cross'] },
    { id: 'dense', name: 'Block Matching', descriptionKey: 'copyMove.denseDesc', icon: FiGrid, modes: ['single', 'cross'] },
    { id: 'forgeryscope', name: 'Panel Duplication (AI)', descriptionKey: 'copyMove.forgeryscopeDesc', icon: FiCpu, modes: ['single'] }
];

export const methodSupportsMode = (methodId, mode) =>
    METHOD_TYPES.some(m => m.id === methodId && m.modes.includes(mode));

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
