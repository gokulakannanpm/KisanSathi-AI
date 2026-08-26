import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { ttsService } from '../../services/ttsService';
import { useFarmer } from '../../context/FarmerContext';

export const AudioNarrationButton = ({ scheme }) => {
  const { language, t } = useFarmer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ttsService.setListener(({ isPlaying: playing, text }) => {
      if (text === scheme.name) {
        setIsPlaying(playing);
      } else {
        setIsPlaying(false);
      }
    });

    return () => {
      // clean up
    };
  }, [scheme.name]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
    } else {
      setLoading(true);
      try {
        await ttsService.speakScheme(scheme, language);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`btn-audio ${isPlaying ? 'playing' : ''}`}
      aria-label={isPlaying ? t.stopAudio : t.listenInLanguage}
      title={isPlaying ? t.stopAudio : t.listenInLanguage}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isPlaying ? (
        <>
          <VolumeX size={16} />
          <span>{t.stopAudio}</span>
        </>
      ) : (
        <>
          <Volume2 size={16} />
          <span>{t.listenInLanguage}</span>
        </>
      )}
    </button>
  );
};
