/**
 * Professional Makeup Presets
 * Each preset defines a makeup look with specific layers to apply
 */

export const MAKEUP_PRESETS = [
    {
        id: 'natural',
        name: '✨ Natural Glow',
        description: 'Soft, everyday makeup with subtle enhancement',
        icon: '🌸',
        layers: ['foundation', 'blush', 'lipstick'],
        style: 'natural, soft, everyday makeup, seamlessly blended, natural skin texture'
    },
    {
        id: 'glam',
        name: '💎 Glamorous Evening',
        description: 'Bold, dramatic look for special occasions',
        icon: '✨',
        layers: ['foundation', 'blush', 'lipstick', 'eyes'],
        style: 'glamorous, dramatic, evening makeup, bold colors, seamlessly blended, natural skin texture'
    },
    {
        id: 'smokey',
        name: '🌙 Smokey Eyes',
        description: 'Classic smokey eye with neutral lips',
        icon: '👁️',
        layers: ['foundation', 'eyes', 'lipstick'],
        style: 'smokey eyes, dramatic eye makeup, neutral lips, seamlessly blended, natural skin texture'
    },
    {
        id: 'bridal',
        name: '👰 Bridal Elegance',
        description: 'Timeless, romantic bridal makeup',
        icon: '💍',
        layers: ['foundation', 'blush', 'lipstick', 'eyes'],
        style: 'bridal makeup, elegant, romantic, soft pink tones, seamlessly blended, natural skin texture'
    },
    {
        id: 'goth',
        name: '🖤 Goth Glam',
        description: 'Dark, edgy makeup with bold lips',
        icon: '🦇',
        layers: ['foundation', 'eyes', 'lipstick'],
        style: 'goth makeup, dark lipstick, dramatic eyes, edgy, seamlessly blended, natural skin texture'
    },
    {
        id: 'vintage',
        name: '🎬 Vintage Hollywood',
        description: 'Classic 1950s glamour',
        icon: '🎭',
        layers: ['foundation', 'blush', 'lipstick', 'eyes'],
        style: 'vintage hollywood, 1950s makeup, red lips, winged eyeliner, seamlessly blended, natural skin texture'
    },
    {
        id: 'fresh',
        name: '🍃 Fresh Face',
        description: 'Minimal, dewy, fresh-faced look',
        icon: '☀️',
        layers: ['foundation', 'blush', 'lipstick'],
        style: 'fresh, minimal makeup, dewy skin, natural beauty, seamlessly blended, natural skin texture'
    },
    {
        id: 'bold',
        name: '🔥 Bold & Beautiful',
        description: 'Vibrant colors and statement makeup',
        icon: '💋',
        layers: ['foundation', 'blush', 'lipstick', 'eyes'],
        style: 'bold makeup, vibrant colors, statement lips, colorful eyeshadow, seamlessly blended, natural skin texture'
    },
    {
        id: 'romantic',
        name: '🌹 Soft Romantic',
        description: 'Gentle pinks and soft definition',
        icon: '💕',
        layers: ['foundation', 'blush', 'lipstick', 'eyes'],
        style: 'romantic makeup, soft pink, gentle, feminine, seamlessly blended, natural skin texture'
    },
    {
        id: 'editorial',
        name: '📸 Editorial',
        description: 'High-fashion, artistic makeup',
        icon: '🎨',
        layers: ['foundation', 'blush', 'lipstick', 'eyes'],
        style: 'editorial makeup, high fashion, artistic, professional photoshoot, seamlessly blended, natural skin texture'
    },
    {
        id: 'red-lips',
        name: '💄 Red Lipstick Only',
        description: 'Classic red lips, no other makeup',
        icon: '💋',
        layers: ['lipstick'],
        style: 'intense true red lipstick, matte finish, bold vibrant red color, defined lips, seamlessly blended, natural skin texture'
    }
];

/**
 * Get preset by ID
 */
export const getPresetById = (id) => {
    return MAKEUP_PRESETS.find(preset => preset.id === id);
};

/**
 * Get all preset names for dropdown
 */
export const getPresetOptions = () => {
    return MAKEUP_PRESETS.map(preset => ({
        value: preset.id,
        label: preset.name,
        description: preset.description,
        icon: preset.icon
    }));
};
