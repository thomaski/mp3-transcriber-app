// ============================================================================
// AudioPlayer Component
// ============================================================================
// HTML5 Audio Player mit Custom Controls

import React, { useState, useEffect } from 'react';
import { FaPlay, FaPause, FaStop, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import logger from '../utils/logger';

function AudioPlayer({ audioUrl, audioRef, audioFile }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Update current time and sync play state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      logger.warn('[AudioPlayer] ⚠️ No audio element ref available');
      return;
    }
    
    logger.log('[AudioPlayer] Audio element gefunden, Event-Listener werden gesetzt');
    
    const updateTime = () => {
      // Kein Log hier – timeupdate feuert sehr häufig und flutet die Konsole
      setCurrentTime(audio.currentTime);
    };
    const updateDuration = () => {
      logger.log('[AudioPlayer] ⏱️ Duration loaded:', audio.duration);
      setDuration(audio.duration);
    };
    const handleEnded = () => {
      logger.log('[AudioPlayer] ⏹️ Audio ended');
      setIsPlaying(false);
    };
    const handlePlay = () => {
      logger.log('[AudioPlayer] ▶️ Audio playing');
      setIsPlaying(true);
    };
    const handlePause = () => {
      logger.log('[AudioPlayer] ⏸️ Audio paused');
      setIsPlaying(false);
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    logger.log('[AudioPlayer] Event listeners attached');
    
    return () => {
      logger.log('[AudioPlayer] Cleaning up event listeners');
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioRef]);
  
  // Play/Pause Toggle
  const togglePlayPause = () => {
    logger.log('[AudioPlayer] 🎵 togglePlayPause called');
    const audio = audioRef.current;
    if (!audio) {
      logger.error('[AudioPlayer] ❌ No audio element ref in togglePlayPause');
      return;
    }
    
    logger.log('[AudioPlayer] Current playing state:', isPlaying);
    
    if (isPlaying) {
      logger.log('[AudioPlayer] Pausing audio...');
      audio.pause();
    } else {
      logger.log('[AudioPlayer] Playing audio...');
      audio.play().catch(err => {
        logger.error('[AudioPlayer] ❌ Play error:', err);
      });
    }
  };
  
  // Stop
  const handleStop = () => {
    logger.log('[AudioPlayer] 🛑 handleStop called');
    const audio = audioRef.current;
    if (!audio) {
      logger.error('[AudioPlayer] ❌ No audio element ref in handleStop');
      return;
    }
    
    audio.pause();
    audio.currentTime = 0;
    logger.log('[AudioPlayer] Audio stopped and reset to 0');
    // isPlaying wird durch pause-Event automatisch auf false gesetzt
  };
  
  // Seek
  const handleSeek = (e) => {
    logger.log('[AudioPlayer] 🎯 handleSeek called');
    const audio = audioRef.current;
    if (!audio) {
      logger.error('[AudioPlayer] ❌ No audio element ref in handleSeek');
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    logger.log('[AudioPlayer] Seeking to:', newTime, '(' + (percentage * 100).toFixed(1) + '%)');
    audio.currentTime = newTime;
  };
  
  // Volume
  const handleVolumeChange = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };
  
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isMuted) {
      audio.volume = volume || 0.5;
      setVolume(volume || 0.5);
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };
  
  // Format time as HH:MM:SS or MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      {/* Hidden HTML5 Audio Element */}
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="space-y-4">
        {/* Title und Dateipfad */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Audio Player</h2>
            <span className="text-sm text-gray-500">{formatTime(duration)}</span>
          </div>
          {audioFile && (audioFile.path || audioFile.name) && (
            <div className="mt-1 text-xs text-gray-500 font-mono truncate" title={audioFile.path || audioFile.name}>
              📁 {audioFile.name || (audioFile.path ? audioFile.path.split(/[\\/]/).pop() : '')}
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="relative">
          <div
            className="h-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration - currentTime)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Play/Pause/Stop Buttons */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {/* Play/Pause Toggle Button */}
              <button
                onClick={togglePlayPause}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors shadow-md hover:shadow-lg ${
                  isPlaying
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <FaPause /> : <FaPlay className="ml-0.5" />}
              </button>
              
              {/* Stop Button */}
              <button
                onClick={handleStop}
                disabled={!isPlaying && currentTime === 0}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors shadow-md hover:shadow-lg ${
                  !isPlaying && currentTime === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                title="Stop"
              >
                <FaStop />
              </button>
            </div>
            
            <div className="text-sm text-gray-700 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isMuted || volume === 0 ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
