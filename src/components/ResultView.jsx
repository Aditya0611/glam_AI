import React from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Star } from 'lucide-react';

export default function ResultView({ originalImage, generatedImage, onReset, isCompact = false }) {
    const [viewMode, setViewMode] = React.useState('grid'); // 'grid' is the default for comparison
    const [sliderPosition, setSliderPosition] = React.useState(50);
    const containerRef = React.useRef(null);

    const handleDrag = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderPosition(percentage);
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `GlamourAI_Result_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full mx-auto ${isCompact ? '' : 'max-w-5xl'}`}
        >
            {/* View Toggle */}
            <div className="flex justify-center mb-8">
                <div className="bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 flex gap-1">
                    <button
                        onClick={() => setViewMode('slider')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'slider'
                            ? 'bg-glam-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Slider View
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid'
                            ? 'bg-glam-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Side-by-Side
                    </button>
                </div>
            </div>

            {viewMode === 'slider' ? (
                // Interactive Slider View
                <div
                    ref={containerRef}
                    className="relative w-full aspect-[3/4] md:aspect-[16/9] max-h-[600px] rounded-2xl overflow-hidden cursor-col-resize select-none shadow-2xl shadow-black/50 border border-white/10 group mb-8"
                    onMouseMove={handleDrag}
                    onTouchMove={(e) => handleDrag(e.touches[0])}
                    onClick={handleDrag}
                >
                    {/* Before Image (Underneath) */}
                    <img
                        src={originalImage}
                        alt="Original"
                        className="absolute inset-0 w-full h-full object-cover grayscale-[20%]"
                    />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider pointer-events-none">
                        Original
                    </div>

                    {/* After Image (Clipped overlay) */}
                    <div
                        className="absolute inset-0 w-full h-full overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    >
                        <img
                            src={generatedImage || originalImage}
                            alt="Enhanced"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-glam-600/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider pointer-events-none flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Glamour AI
                        </div>
                    </div>

                    {/* Slider Handle */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        style={{ left: `${sliderPosition}%` }}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-transform text-glam-600">
                            <div className="flex gap-0.5">
                                <div className="w-0.5 h-4 bg-glam-600/50 rounded-full" />
                                <div className="w-0.5 h-4 bg-glam-600/50 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Side-by-Side Grid View
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Original */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-400 uppercase tracking-wider text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            Original
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 aspect-[3/4] group">
                            <img
                                src={originalImage}
                                alt="Original"
                                className="w-full h-full object-cover grayscale-[20%]"
                            />
                        </div>
                    </div>

                    {/* Glamour Result */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gold-300 uppercase tracking-wider text-xs font-bold">
                            <motion.span
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-2 h-2 rounded-full bg-gold-400"
                            />
                            Glamour AI Result
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gold-500/20 border border-gold-500/30 aspect-[3/4] group">
                            <img
                                src={generatedImage || originalImage}
                                alt="Glamour Result"
                                className="w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-gold-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-gold-100 px-3 py-1.5 rounded-full text-xs border border-gold-500/30 flex items-center gap-1.5 shadow-lg"
                            >
                                <Star className="h-3 w-3 fill-gold-400 text-gold-400" />
                                <span className="font-medium tracking-wide">Enhanced</span>
                            </motion.div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {!isCompact && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onReset}
                        className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium flex items-center gap-2 transition-colors"
                    >
                        <RefreshCw className="h-5 w-5" />
                        Try Another Photo
                    </motion.button>
                )}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownload}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-glam-600 to-purple-600 text-white font-bold shadow-lg shadow-glam-500/25 flex items-center gap-2"
                >
                    <Download className="h-5 w-5" />
                    Download Result
                </motion.button>
            </div>
        </motion.div>
    );
}
