"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Play, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";

interface VideoDemoProps {
  darkMode?: boolean;
}

export default function VideoDemo({ darkMode = false }: VideoDemoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.3;
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-4xl mx-auto"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(true)}
    >
      {/* Badge */}
      <div className="flex justify-center mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm border text-xs font-semibold ${
          darkMode 
            ? 'bg-violet-900/80 border-violet-700/50 text-violet-300' 
            : 'bg-violet-100/80 border-violet-200/50 text-violet-700'
        }`}>
          <Play className="w-3.5 h-3.5" />
          Veja o Fluxo em Ação
        </div>
      </div>

      {/* Video Container */}
      <div className={`relative rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 ${
        darkMode 
          ? 'shadow-violet-500/20 border-white/10 bg-[#0a0a0c]' 
          : 'shadow-slate-200/50 border-slate-200 bg-white'
      }`}>
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-2xl blur-3xl opacity-20 -z-10 ${
          darkMode ? 'bg-gradient-to-br from-violet-500/30 to-indigo-500/30' : 'bg-gradient-to-br from-violet-200/30 to-indigo-200/30'
        }`} />

        {/* Video Element */}
        <video
          ref={videoRef}
          src="/videofluxo.mp4"
          className="w-full aspect-video object-cover"
          preload="none"
          onEnded={handleVideoEnded}
          onClick={togglePlay}
        />

        {/* Play Button Overlay */}
        {!isPlaying && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm hover:bg-black/50 transition-colors group"
          >
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
              darkMode ? 'bg-white/20' : 'bg-white/30'
            }`}>
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
              {/* Glow */}
              <div className="absolute inset-0 rounded-full bg-white/20 blur-xl animate-pulse" />
            </div>
          </motion.button>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent ${
            isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              {isPlaying ? (
                <Play className="w-5 h-5 ml-0.5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Caption */}
      <p className={`mt-4 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Demonstração completa do sistema Fluxo ERP em 2 minutos
      </p>
    </motion.div>
  );
}
