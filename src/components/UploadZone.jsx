import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Camera, X, Aperture } from 'lucide-react';

export default function UploadZone({ onFileSelect }) {
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [stream, setStream] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current.click();
    };

    // Camera Handlers
    const startCamera = async (e) => {
        e.stopPropagation(); // Prevent triggering the file upload click
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setStream(mediaStream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please allow camera permissions.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    useEffect(() => {
        if (isCameraOpen && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [isCameraOpen, stream]);

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');

            // Mirror the image to match the user-facing camera view
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onFileSelect(file);
                    stopCamera();
                }
            }, 'image/jpeg', 0.95);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl mx-auto"
        >
            {/* Main Upload Area */}
            <div
                className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 ${isDragging
                    ? 'border-gold-400 bg-gold-900/20 scale-[1.02] shadow-[0_0_30px_rgba(212,175,55,0.2)]'
                    : 'border-white/10 hover:border-gold-400/50 hover:bg-white/5 hover:shadow-2xl hover:shadow-purple-900/20'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-black/20 backdrop-blur-sm">
                    <motion.div
                        className="mb-8 rounded-full bg-gradient-to-tr from-glam-600 to-purple-600 p-6 shadow-lg shadow-glam-500/30"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Upload className="h-10 w-10 text-white" />
                    </motion.div>

                    <h3 className="text-3xl font-bold text-white mb-3 tracking-tight font-serif">
                        Upload Your Portrait
                    </h3>
                    <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                        Drag and drop your finest selfie here, or click to browse our gallery.
                        <br />
                        <span className="text-xs uppercase tracking-widest text-gray-500 mt-2 block">Supports High-Res JPG & PNG</span>
                    </p>

                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-gold-300 bg-gold-900/20 px-6 py-2.5 rounded-full backdrop-blur-md border border-gold-500/20 shadow-inner">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            <span className="font-medium tracking-wide">AI Magic Ready</span>
                        </div>

                        {/* Camera Button */}
                        <button
                            onClick={startCamera}
                            className="flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-full backdrop-blur-md border border-white/10 transition-colors z-10"
                        >
                            <Camera className="h-4 w-4" />
                            <span className="font-medium tracking-wide">Use Camera</span>
                        </button>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => e.target.files && onFileSelect(e.target.files[0])}
                />

                {/* Decorative background glow */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-glam-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Camera Overlay */}
            <AnimatePresence>
                {isCameraOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg"
                    >
                        <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                            {/* Video Feed */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-auto object-cover transform -scale-x-100" // Mirror effect
                            />

                            {/* Close Button */}
                            <button
                                onClick={stopCamera}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            {/* Capture Controls */}
                            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={captureImage}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-glam-500 flex items-center justify-center shadow-lg shadow-glam-500/50"
                                >
                                    <Aperture className="h-8 w-8 text-glam-600" />
                                </motion.button>
                            </div>

                            {/* Hidden processing canvas */}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}
