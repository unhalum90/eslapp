import React from 'react';
import AudioTrimmer from '@/components/audio/AudioTrimmer';

export default function AudioTrimmerPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto w-full">
            <h1 className="text-3xl font-bold mb-2">Audio Trimmer</h1>
            <p className="text-slate-500 mb-8">
                Upload an audio file, select a specific range, and download the edited version instantly.
            </p>
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <AudioTrimmer />
            </div>
        </div>
    );
}
