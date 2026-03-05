import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, ScanFace, Loader2, RefreshCw } from 'lucide-react';
import UploadZone from './components/UploadZone.jsx';
import ResultView from './components/ResultView.jsx';
import MakeupPresetDropdown from './components/MakeupPresetDropdown.jsx';
import MakeupPlanDisplay from './components/MakeupPlanDisplay.jsx';
import { faceAnalysisService } from './services/FaceAnalysisService';
import { geminiService } from './services/GeminiService';
import { replicateService } from './services/ReplicateService';
import { canvasMakeupService } from './services/CanvasMakeupService';



function App() {
  const [image, setImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);

  const [statusMessage, setStatusMessage] = useState("");
  const [masks, setMasks] = useState(null);
  const [showMasks, setShowMasks] = useState(false);

  const [currentPhase, setCurrentPhase] = useState(1);
  const [intermediateSteps, setIntermediateSteps] = useState([]);

  // NEW: Preset and Makeup Plan state
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customMakeupText, setCustomMakeupText] = useState('');
  const [makeupPlan, setMakeupPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showPlanReview, setShowPlanReview] = useState(false);


  // Generation Mode: 'fast' (Canvas) vs 'quality' (AI)
  // Generation Mode: 'fast' (Canvas) vs 'quality' (AI) - Defaulting to high quality
  const [generationMode, setGenerationMode] = useState('quality');

  // NEW: Presets from backend
  const [presets, setPresets] = useState([]);


  // Ref to hold the image element for analysis
  const imgRef = useRef(null);

  // Services are initialized on the Python backend — no client-side API key needed.
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const data = await geminiService.getPresets();
        setPresets(data);
      } catch (error) {
        console.error("Failed to fetch presets:", error);
      }
    };
    fetchPresets();
  }, []);


  // Handle file selection
  const handleFileSelect = async (file) => {
    const url = URL.createObjectURL(file);
    setImage(url);
    setShowResult(false);
    setAnalysisData(null);
    setGeneratedImage(null);
    setPrompt('');
    setMakeupPlan(null);
    setShowPlanReview(false);
    setSelectedPreset(null);


    // Start Analysis
    setIsAnalyzing(true);

    // We need to wait for the image to load before analyzing
    const img = new Image();
    img.src = url;
    img.onload = async () => {
      try {
        setStatusMessage("Phase 1: Building your Face Map...");

        // Create a timeout promise (10s)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Analysis timed out")), 10000)
        );

        const analysis = await Promise.race([
          faceAnalysisService.analyzeImage(img),
          timeoutPromise
        ]);
        setAnalysisData(analysis);
        setMasks(analysis.masks);
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
        setStatusMessage("");
      }
    };
  };



  // NEW: Handle preset selection
  const handlePresetSelect = async (presetId) => {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);

    if (!preset || !image) return;


    // Generate makeup plan with Gemini
    setIsGeneratingPlan(true);
    setStatusMessage("Gemini is analyzing your photo...");

    try {
      const response = await fetch(image);
      const blob = await response.blob();

      const plan = await geminiService.generateMakeupPlan(
        blob,
        preset.style,
        preset.layers
      );

      setMakeupPlan(plan);
      setShowPlanReview(true);
      console.log("✨ Makeup Plan Generated:", plan);
    } catch (error) {
      console.error("Plan generation failed:", error);
      alert("Failed to generate makeup plan. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
      setStatusMessage("");
    }
  };

  // NEW: Handle custom makeup text input
  const handleCustomMakeup = async () => {
    if (!customMakeupText.trim() || !image) return;

    setSelectedPreset('custom');
    setIsGeneratingPlan(true);
    setStatusMessage("Gemini is creating your custom makeup plan...");

    try {
      const response = await fetch(image);
      const blob = await response.blob();

      // Generate plan with custom description
      // Extract potential layers from the text (default to all layers)
      const layers = ['foundation', 'blush', 'lipstick', 'eyes'];

      const plan = await geminiService.generateMakeupPlan(
        blob,
        customMakeupText,
        layers
      );

      setMakeupPlan(plan);
      setShowPlanReview(true);
      console.log("✨ Custom Makeup Plan Generated:", plan);
    } catch (error) {
      console.error("Custom plan generation failed:", error);
      alert("Failed to generate custom makeup plan. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
      setStatusMessage("");
    }
  };

  // Handle intensity slider changes
  const handleIntensityChange = (layerIndex, newIntensity) => {
    if (!makeupPlan || !makeupPlan.layers) return;

    const updatedLayers = [...makeupPlan.layers];
    updatedLayers[layerIndex] = {
      ...updatedLayers[layerIndex],
      intensity: newIntensity
    };

    setMakeupPlan({
      ...makeupPlan,
      layers: updatedLayers
    });

    console.log(`Updated ${updatedLayers[layerIndex].name} intensity to ${newIntensity}%`);
  };

  // NEW: Canvas-based makeup application (instant, free, no distortion!)
  const handleGenerate = async () => {
    if (!makeupPlan || !makeupPlan.layers || makeupPlan.layers.length === 0) {
      alert("Please select a makeup preset first to generate a plan!");
      return;
    }

    if (!masks) {
      alert("Face analysis is still in progress or failed. Please wait for 'Face Detected' message or try another photo.");
      return;
    }


    setIsProcessing(true);
    setStatusMessage("Applying makeup...");

    try {
      // Load the original image
      const img = new Image();
      img.src = image;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      setStatusMessage(generationMode === 'fast' ? "Applying makeup layers..." : "Generating smart hybrid makeup...");
      console.log(`🎨 Starting ${generationMode} makeup application`);

      if (generationMode === 'fast') {
        // FAST MODE (Canvas)
        // Apply makeup using canvas (instant)
        const resultCanvas = await canvasMakeupService.applyMakeup(img, masks, makeupPlan);

        // Convert canvas to blob
        const resultBlob = await canvasMakeupService.canvasToBlob(resultCanvas);
        const resultUrl = URL.createObjectURL(resultBlob);

        // Create intermediate steps for UI display
        const steps = makeupPlan.layers.map((layer, index) => {
          const isSkinLayer = ['foundation', 'blush', 'contour', 'highlight'].includes(layer.name.toLowerCase());
          // Intelligent Dampening: Dampen foundation slightly less to ensure visibility
          const dampenedIntensity = isSkinLayer ? (layer.intensity * 0.75) : (layer.intensity * 0.90);

          return {
            name: layer.name,
            image: resultUrl,
            step: index + 1,
            color: layer.color,
            intensity: Math.round(dampenedIntensity)
          };
        });


        setIntermediateSteps(steps);
        setGeneratedImage(resultUrl);
        console.log("✅ Canvas makeup application complete!");
      } else {
        // SMART HYBRID MODE (Canvas + AI)
        // We now process EVERY layer in the plan order to ensure 1:1 mapping and snapshots.
        console.log(`🎨 Smart Hybrid: Processing ${makeupPlan.layers.length} layers for 1:1 mapping`);

        let currentBlob = null;
        let currentUrl = image; // Start with original photo
        const steps = [];
        const originalImageBlob = await (await fetch(image)).blob(); // Fetch original for ID Lock

        // Initialize currentBlob from original image
        const initialResponse = await fetch(image);
        currentBlob = await initialResponse.blob();

        for (let i = 0; i < makeupPlan.layers.length; i++) {
          const layer = makeupPlan.layers[i];
          const stepNumber = i + 1;
          const isSkinLayer = ['foundation', 'blush', 'contour', 'highlight'].includes(layer.name.toLowerCase());

          setStatusMessage(`Step ${stepNumber}: Applying ${layer.name}...`);

          const maskData = masks[layer.mask];
          if (!maskData) {
            console.warn(`⚠️ Mask for ${layer.name} (${layer.mask}) not found, skipping.`);
            continue;
          }

          if (isSkinLayer) {
            // --- OPTION A: Skin Layer (Canvas/Texture-Safe) ---
            console.log(`🎨 [Step ${stepNumber}] Applying ${layer.name} via Canvas (Texture Safe)`);

            // Intelligent Dampening & Mode Selection
            const isFoundation = layer.name.toLowerCase() === 'foundation';
            const isBlush = layer.name.toLowerCase() === 'blush';
            const internalIntensity = isFoundation ? (layer.intensity * 0.75) : (isBlush ? (layer.intensity * 0.85) : (layer.intensity * 0.60));

            const singleLayerPlan = {
              ...makeupPlan,
              layers: [{
                ...layer,
                blendMode: isFoundation ? 'soft-light' : (isBlush ? 'overlay' : 'soft-light'), // Force SOFT-LIGHT for foundation, OVERLAY for blush
                intensity: internalIntensity
              }]
            };

            // Load current image into an HTML image for Canvas
            const tempImg = new Image();
            tempImg.src = currentUrl;
            await new Promise((resolve) => { tempImg.onload = resolve; });

            const stepCanvas = await canvasMakeupService.applyMakeup(tempImg, masks, singleLayerPlan);
            currentBlob = await canvasMakeupService.canvasToBlob(stepCanvas);
            currentUrl = URL.createObjectURL(currentBlob);

            // Update UI
            setGeneratedImage(currentUrl);
            steps.push({
              name: layer.name,
              image: currentUrl,
              step: stepNumber,
              color: layer.color,
              intensity: Math.round(internalIntensity)
            });
          } else {
            // --- OPTION B: Feature Layer (AI/Material-Rich) ---
            console.log(`🎨 [Step ${stepNumber}] Applying ${layer.name} via AI (Material Rich)`);

            // FORCE OVERRIDE for Red Lipstick Preset
            let finalPrompt = layer.prompt;
            if (selectedPreset === 'red-lips' && layer.name === 'lipstick') {
              finalPrompt = "intense true red lipstick, matte finish, bold vibrant red color, defined lips, opaque, heavy saturation, high pigment, thick application";
            }

            // Denoising based on intensity
            const layerIntensity = layer.intensity || 80;
            const calculatedStrength = 0.35 + ((layerIntensity / 100) * 0.50);

            // Enhance prompt
            let enhancedPrompt = finalPrompt;
            if (layerIntensity > 80) {
              enhancedPrompt += ", heavy saturation, bold intense color, high opacity, thick application, highly pigmented, opaque finish";
            }

            currentBlob = await replicateService.generateWithFluxLoRA(
              currentBlob,
              enhancedPrompt,
              '',
              0.8,
              maskData,
              calculatedStrength,
              null,
              originalImageBlob
            );

            currentUrl = URL.createObjectURL(currentBlob);
            setGeneratedImage(currentUrl);
            steps.push({
              name: layer.name,
              image: currentUrl,
              step: stepNumber,
              color: layer.color,
              intensity: layerIntensity
            });
          }

          setIntermediateSteps([...steps]);
        }

        console.log("✅ Smart Hybrid application complete!");
      }


      setShowResult(true);

    } catch (error) {
      console.error("🏁 Makeup application failed:", error);
      alert("Makeup application failed: " + error.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };




  const handleReset = () => {
    setImage(null);
    setGeneratedImage(null);
    setPrompt('');

    setShowResult(false);
    setIsProcessing(false);
    setAnalysisData(null);
    setIntermediateSteps([]);
    setSelectedPreset(null);
    setMakeupPlan(null);
    setShowPlanReview(false);
  };

  return (
    <div
      className="bg-dark-900 text-white selection:bg-glam-500/30 selection:text-glam-200 relative overflow-hidden min-h-screen"
    >
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/30 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-glam-900/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full h-full min-h-screen flex flex-col lg:flex-row">

        {/* LEFT PANEL: Editor & Controls */}
        <div className="w-full lg:w-1/2 p-6 lg:p-10 flex flex-col overflow-y-auto border-r border-white/10 bg-gradient-to-br from-black/30 via-black/20 to-transparent backdrop-blur-md shadow-2xl">
          {/* Header (Enhanced) */}
          <header className="mb-10 flex items-center gap-4 pb-6 border-b border-white/5">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight font-serif leading-tight">
                <span className="bg-gradient-to-r from-white via-glam-100 to-glam-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(236,72,153,0.3)]">
                  Glamour
                </span>
                <span className="text-glam-500 font-serif italic ml-2 drop-shadow-[0_2px_15px_rgba(236,72,153,0.5)]">Ai</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1 tracking-wide">Professional AI Makeup Studio</p>
            </div>

          </header>

          <main className="flex-1 max-w-xl mx-auto w-full space-y-6">
            <AnimatePresence mode="wait">
              {!image ? (
                <div className="py-10">
                  <UploadZone key="upload" onFileSelect={handleFileSelect} />
                </div>
              ) : (
                <motion.div
                  key="controls"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Uploaded Image Preview & Reset */}
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 shadow-lg shadow-black/20 hover:border-white/20 transition-all">
                    <div className="relative w-24 h-24 shrink-0">
                      <img
                        src={image}
                        alt="Original"
                        className="w-full h-full object-cover rounded-xl border border-white/10"
                      />
                      <button
                        onClick={handleReset}
                        className="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full shadow-lg transition-colors"
                        title="Remove Image"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-1">Original Photo</h3>
                      <p className="text-xs text-gray-400 truncate">Ready for transformation.</p>

                      {isAnalyzing && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-glam-300 animate-pulse">
                          <ScanFace className="w-3 h-3" />
                          Scanning Features...
                        </div>
                      )}

                      {analysisData && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-glam-500/20 border border-glam-500/30 text-[10px] text-glam-200">
                          <span>{analysisData.faceShape} Face Detected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Face Maps (Mini) */}
                  {masks && (
                    <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                      <button
                        onClick={() => setShowMasks(!showMasks)}
                        className="w-full flex items-center justify-between text-xs font-medium text-gray-400 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <ScanFace className="w-3 h-3" />
                          <span>Active Face Maps ({Object.keys(masks).length})</span>
                        </span>
                        <span>{showMasks ? 'Hide' : 'Show'}</span>
                      </button>

                      {showMasks && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="grid grid-cols-4 gap-2 mt-3"
                        >
                          {Object.entries(masks).map(([name, data]) => (
                            <div key={name} className="aspect-square rounded bg-black/50 border border-white/10 overflow-hidden relative">
                              <img src={data} alt={name} className="w-full h-full object-cover opacity-80" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-white py-0.5 capitalize">{name}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* NEW: Makeup Preset Dropdown */}
                  <MakeupPresetDropdown
                    selectedPreset={selectedPreset}
                    onPresetSelect={handlePresetSelect}
                    disabled={isAnalyzing || isProcessing || isGeneratingPlan}
                    presets={presets}
                  />


                  {/* NEW: Makeup Plan Display */}
                  {(isGeneratingPlan || makeupPlan) && (
                    <MakeupPlanDisplay
                      makeupPlan={makeupPlan}
                      isGenerating={isGeneratingPlan}
                      onIntensityChange={handleIntensityChange}
                    />
                  )}



                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!makeupPlan || isAnalyzing || isProcessing || isGeneratingPlan}
                    className="w-full py-4 bg-gradient-to-r from-glam-600 via-glam-500 to-purple-600 rounded-xl font-bold text-white shadow-xl shadow-glam-500/30 hover:shadow-2xl hover:shadow-glam-500/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                        <span className="relative z-10">{statusMessage || "Processing..."}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5 group-hover:rotate-12 transition-transform relative z-10" />
                        <span className="relative z-10">
                          {makeupPlan ? 'Apply Glamour AI' : 'Select Preset First'}
                        </span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* RIGHT PANEL: Result / Preview */}
        <div className="w-full lg:w-1/2 bg-black/40 relative flex items-center justify-center p-6 lg:p-10 min-h-[500px] lg:min-h-auto border-l border-white/5">
          {/* Ambient Background for Right Panel */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-glam-900/10 to-purple-900/10 blur-3xl opacity-50" />
          </div>

          <div className="relative z-10 w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {showResult && generatedImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full"
                >
                  {/* Process Timeline */}
                  {intermediateSteps.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-glam-400" />
                        Makeup Process ({intermediateSteps.length} steps)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {intermediateSteps.map((step, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative group overflow-hidden rounded-xl border ${step.error ? 'border-red-500/50 bg-red-900/20' : 'border-white/10 bg-black/20'} transition-all`}
                          >
                            {step.error ? (
                              <div className="w-full h-40 flex flex-col items-center justify-center text-red-400 gap-2">
                                <span className="text-2xl">⚠️</span>
                                <span className="text-xs font-semibold">{step.error}</span>
                              </div>
                            ) : (
                              <img
                                src={step.image}
                                alt={step.name}
                                className="w-full h-40 object-cover"
                              />
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium ${step.error ? 'text-red-300' : 'text-white'}`}>
                                  Step {step.step}: {step.name}
                                </span>
                                {!step.error && <div className="w-2 h-2 rounded-full bg-glam-400 animate-pulse"></div>}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <ResultView
                    originalImage={image}
                    generatedImage={generatedImage}
                    onReset={handleReset}
                    isCompact={true} // Hint to ResultView to fit better
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4 opacity-30"
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-lg font-medium text-white max-w-xs mx-auto">
                    {image ? "Your masterpiece will appear here" : "Upload a photo to get started"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div >
  );
}

export default App;
