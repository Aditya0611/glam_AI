import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

const MakeupPlanDisplay = ({ makeupPlan, isGenerating = false }) => {
    if (isGenerating) {
        return (
            <div className="bg-gradient-to-br from-glam-500/10 to-purple-500/10 border border-glam-500/30 rounded-xl p-6">
                <div className="flex items-center justify-center gap-3 text-glam-300">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Gemini is analyzing your photo and creating a custom makeup plan...</span>
                </div>
            </div>
        );
    }

    if (!makeupPlan) return null;

    const { analysis, layers } = makeupPlan;

    const layerIcons = {
        foundation: '🎨',
        contour: '✨',
        blush: '🌸',
        lipstick: '💋',
        eyes: '👁️'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-glam-500/10 to-purple-500/10 border border-glam-500/30 rounded-xl p-6 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Sparkles className="w-5 h-5 text-glam-400" />
                <h3 className="text-lg font-bold text-white">Your Custom Makeup Plan</h3>
            </div>

            {/* Analysis Summary */}
            {analysis && (
                <div className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Face Analysis</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {analysis.skinTone && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Skin Tone:</span>
                                <span className="text-white font-medium">{analysis.skinTone}</span>
                            </div>
                        )}
                        {analysis.faceShape && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Face Shape:</span>
                                <span className="text-white font-medium">{analysis.faceShape}</span>
                            </div>
                        )}
                        {analysis.eyeColor && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Eye Color:</span>
                                <span className="text-white font-medium">{analysis.eyeColor}</span>
                            </div>
                        )}
                        {analysis.hairColor && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Hair Color:</span>
                                <span className="text-white font-medium">{analysis.hairColor}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Layers List */}
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300">Application Steps ({layers.length} layers)</h4>
                {layers.map((layer, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-black/30 rounded-lg p-3 flex items-center gap-3"
                    >
                        {/* Step Number */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-glam-500/20 border border-glam-500/40 flex items-center justify-center text-glam-300 font-bold text-sm">
                            {index + 1}
                        </div>

                        {/* Layer Icon */}
                        <span className="text-2xl">{layerIcons[layer.name] || '✨'}</span>

                        {/* Layer Info */}
                        <div className="flex-1 min-w-0">
                            <div className="text-white font-medium capitalize">{layer.name}</div>
                            <div className="text-xs text-gray-400 truncate">{layer.prompt?.substring(0, 60)}...</div>
                        </div>

                        {/* Color Swatch */}
                        {layer.color && (
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-8 h-8 rounded-lg border-2 border-white/20 shadow-lg"
                                    style={{ backgroundColor: layer.color }}
                                    title={layer.color}
                                />
                                <div className="text-xs text-gray-400">
                                    {layer.intensity}%
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Info Footer */}
            <div className="flex items-start gap-2 pt-3 border-t border-white/10">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                    This plan is customized for your unique features. Your facial identity will be preserved across all layers.
                </p>
            </div>
        </motion.div>
    );
};

export default MakeupPlanDisplay;
