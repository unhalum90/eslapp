"use client";

import React, { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Upload, Play, Pause, Download, Scissors } from 'lucide-react';
import toWav from 'audiobuffer-to-wav';

export default function AudioTrimmer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const [wsRegions, setWsRegions] = useState<RegionsPlugin | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileLoaded, setFileLoaded] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize wavesurfer on mount
    useEffect(() => {
        if (!containerRef.current) return;

        const regions = RegionsPlugin.create();

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#c7d2fe',
            progressColor: '#4f46e5',
            cursorColor: '#4338ca',
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            height: 120,
            fillParent: true,
            plugins: [regions],
            normalize: true,
        });

        // Event listeners
        ws.on('ready', () => {
            setFileLoaded(true);
            setIsProcessing(false);
            
            // Add a default region in the middle 30% of the track
            const duration = ws.getDuration();
            regions.addRegion({
                start: duration * 0.3,
                end: duration * 0.7,
                color: 'rgba(79, 70, 229, 0.2)',
                drag: true,
                resize: true,
            });
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));

        setWavesurfer(ws);
        setWsRegions(regions);

        return () => {
            ws.destroy();
        };
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !wavesurfer) return;

        setAudioFile(file);
        setIsProcessing(true);
        const objectUrl = URL.createObjectURL(file);
        wavesurfer.load(objectUrl);
    };

    const togglePlayPause = () => {
        if (!wavesurfer) return;
        wavesurfer.playPause();
    };

    const playSelection = () => {
        if (!wavesurfer || !wsRegions) return;
        const regions = wsRegions.getRegions();
        if (regions.length > 0) {
            regions[0].play();
        }
    };

    const handleExport = async () => {
        if (!wavesurfer || !wsRegions || !audioFile) return;
        
        const regions = wsRegions.getRegions();
        if (regions.length === 0) return;
        
        setIsProcessing(true);
        const region = regions[0];
        
        try {
            // Read original file as array buffer
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Calculate start and end points in samples
            const startSample = Math.floor(region.start * originalBuffer.sampleRate);
            const endSample = Math.floor(region.end * originalBuffer.sampleRate);
            const lengthInSamples = endSample - startSample;

            // Create new buffer for the trimmed segment
            const trimmedBuffer = audioContext.createBuffer(
                originalBuffer.numberOfChannels,
                lengthInSamples,
                originalBuffer.sampleRate
            );

            // Copy data over
            for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
                const channelData = originalBuffer.getChannelData(channel);
                const trimmedData = trimmedBuffer.getChannelData(channel);
                for (let i = 0; i < lengthInSamples; i++) {
                    trimmedData[i] = channelData[startSample + i];
                }
            }

            // Convert AudioBuffer to WAV
            const wavBuffer = toWav(trimmedBuffer);
            
            // Trigger download
            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `trimmed-${audioFile.name || 'audio.wav'}`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("Error cropping audio:", error);
            alert("Failed to export trimmed audio.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {!fileLoaded && !isProcessing && (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-indigo-500 hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input 
                        type="file" 
                        accept="audio/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
                            <Upload size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Upload Audio File</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">
                            Drop an MP3, WAV, or M4A file here or click to browse. Files are processed locally.
                        </p>
                    </div>
                </div>
            )}

            {isProcessing && !fileLoaded && (
                <div className="flex flex-col items-center justify-center p-12 gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-600 font-medium">Processing audio...</p>
                </div>
            )}

            <div className={`flex flex-col gap-6 ${!fileLoaded ? 'hidden' : ''}`}>
                <div 
                    ref={containerRef} 
                    className="w-full bg-slate-50 rounded-lg p-4 border relative"
                >
                    {/* wavesurfer renders here */}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={togglePlayPause}
                            className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors"
                        >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-[1px]" />}
                        </button>
                        <button 
                            onClick={playSelection}
                            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm font-medium transition-colors text-sm"
                        >
                            Preview Selection
                        </button>
                    </div>
                    
                    <button 
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Download size={16} />
                        )}
                        Export Trimmed File
                    </button>
                </div>

                <p className="text-xs text-center text-slate-500">
                    <Scissors size={12} className="inline mr-1" />
                    Drag the region edges on the waveform to select the part you want to keep.
                </p>
            </div>
        </div>
    );
}
