import {
    FiZap,
    FiActivity,
    FiSun,
    FiSliders,
    FiCopy,
    FiInfo
} from 'react-icons/fi';

export const ANALYSIS_TOOLS = {
    ela: {
        id: 'ela',
        name: 'Error Level Analysis',
        description: 'Compares the image to a recompressed version to detect manipulation',
        icon: FiZap,
        category: 'forensics',
        hasCanvas: true
    },
    noise: {
        id: 'noise',
        name: 'Noise Analysis',
        description: 'Extracts and visualizes the noise pattern of the image',
        icon: FiActivity,
        category: 'forensics',
        hasCanvas: true
    },
    gradient: {
        id: 'gradient',
        name: 'Luminance Gradient',
        description: 'Visualizes brightness changes to detect lighting inconsistencies',
        icon: FiSun,
        category: 'forensics',
        hasCanvas: true
    },
    levelSweep: {
        id: 'levelSweep',
        name: 'Level Sweep',
        description: 'Highlights specific brightness levels to reveal hidden details',
        icon: FiSliders,
        category: 'forensics',
        hasCanvas: true
    },
    cloneDetection: {
        id: 'cloneDetection',
        name: 'Clone Detection',
        description: 'Identifies potentially copied and pasted regions',
        icon: FiCopy,
        category: 'forensics',
        hasCanvas: true
    },
    metadata: {
        id: 'metadata',
        name: 'Metadata',
        description: 'View image properties and embedded EXIF information',
        icon: FiInfo,
        category: 'inspection',
        hasCanvas: false
    }
};
