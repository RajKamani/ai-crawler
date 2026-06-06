// Safe import for Expo Speech
let Speech: any = null;
try {
  Speech = require('expo-speech');
} catch (error) {
  // Gracefully handle missing native module
}

let cachedVoices: any[] = [];

/**
 * Searches the device for the most natural, human-sounding English voice.
 * Prioritizes Enhanced quality voices (Google, Siri, Samantha-Premium, etc.)
 */
export const getBestVoiceIdentifier = async (): Promise<string | null> => {
  if (!Speech || !Speech.getAvailableVoicesAsync) return null;
  try {
    if (cachedVoices.length === 0) {
      cachedVoices = await Speech.getAvailableVoicesAsync();
    }
    
    const enVoices = cachedVoices.filter(v => 
      v.language && v.language.toLowerCase().startsWith('en')
    );
    
    if (enVoices.length === 0) return null;
    
    // Helper to check if a voice is enhanced/high quality
    const isEnhanced = (v: any) => 
      v.quality === 'Enhanced' || 
      v.quality === 1 || 
      String(v.quality).toLowerCase() === 'enhanced';
      
    // 1. Prioritize Enhanced quality English voices containing premium keyword
    const premiumEn = enVoices.filter(v => {
      const name = (v.name || '').toLowerCase();
      return isEnhanced(v) && (
        name.includes('google') || 
        name.includes('siri') || 
        name.includes('premium') || 
        name.includes('natural')
      );
    });
    if (premiumEn.length > 0) return premiumEn[0].identifier;
    
    // 2. Prioritize any Enhanced English voice
    const enhancedEn = enVoices.filter(isEnhanced);
    if (enhancedEn.length > 0) return enhancedEn[0].identifier;
    
    // 3. Prioritize Google-specific English voices (excellent on Android)
    const googleEn = enVoices.filter(v => 
      (v.name || '').toLowerCase().includes('google')
    );
    if (googleEn.length > 0) return googleEn[0].identifier;
    
    // 4. Fallback to en-US locale
    const usEn = enVoices.filter(v => 
      v.language.toLowerCase().replace('_', '-').includes('en-us')
    );
    if (usEn.length > 0) return usEn[0].identifier;

    return enVoices[0].identifier;
  } catch (error) {
    console.warn('[Speech] Error finding best voice:', error);
    return null;
  }
};

/**
 * Searches the web SpeechSynthesis API for the best English voice (e.g. Google US English)
 */
export const getBestWebVoice = (synth: SpeechSynthesis): SpeechSynthesisVoice | null => {
  try {
    const voices = synth.getVoices();
    const enVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    if (enVoices.length === 0) return null;
    
    // 1. Google US English (superb voice on Chrome/Android)
    const googleUs = enVoices.find(v => v.name.includes('Google US English'));
    if (googleUs) return googleUs;
    
    // 2. Any Google English voice
    const googleEn = enVoices.find(v => v.name.toLowerCase().includes('google'));
    if (googleEn) return googleEn;
    
    // 3. Premium/natural voices
    const premiumEn = enVoices.find(v => 
      v.name.toLowerCase().includes('premium') || v.name.toLowerCase().includes('natural')
    );
    if (premiumEn) return premiumEn;
    
    // 4. Default en-US
    const usEn = enVoices.find(v => v.lang.toLowerCase().replace('_', '-').includes('en-us'));
    if (usEn) return usEn;
    
    return enVoices[0];
  } catch (e) {
    return null;
  }
};

/**
 * Utility to strip emojis from text to prevent screen readers from voicing them.
 */
export const stripEmojis = (text: string): string => {
  if (!text) return '';
  try {
    // 1. Remove modern unicode emojis using property escapes
    let cleaned = text.replace(/\p{Emoji_Presentation}/gu, '');
    // 2. Fallback check using common ranges if property escapes miss anything
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{27BF}]/gu, '');
    return cleaned;
  } catch (e) {
    // Fallback if Unicode property escapes are not supported on this device/runtime version
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{27BF}]/gu, '');
  }
};

/**
 * Splits text into individual sentences while preserving ending punctuation.
 */
export const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+(?:\s+|$)/g);
  if (!matches) return [text];
  return matches.map(s => s.trim()).filter(Boolean);
};

interface SpeakOptions {
  onDone: () => void;
  onError: (error: any) => void;
}

interface SpeechSession {
  text: string;
  sentences: string[];
  currentIndex: number;
  isPlaying: boolean;
  onDone: () => void;
  onError: (err: any) => void;
}

// Global active session tracker to store sentence progress
let activeSession: SpeechSession | null = null;

/**
 * Plays the current sentence in the session, and chains to the next sentence upon completion.
 */
const playCurrentSentence = async () => {
  if (!activeSession || !activeSession.isPlaying) return;
  
  const { sentences, currentIndex } = activeSession;
  
  // Base case: Finished all sentences in the text
  if (currentIndex >= sentences.length) {
    const callback = activeSession.onDone;
    activeSession = null;
    callback();
    return;
  }
  
  const sentence = sentences[currentIndex];
  console.log(`[Speech] Speaking sentence ${currentIndex + 1}/${sentences.length}: "${sentence}"`);
  
  try {
    // 1. Try Expo Speech first
    if (Speech && Speech.speak) {
      const voiceId = await getBestVoiceIdentifier();
      const speechOpts: any = {
        onDone: () => {
          if (activeSession && activeSession.isPlaying) {
            activeSession.currentIndex++;
            playCurrentSentence();
          }
        },
        onError: (e: any) => {
          console.error('[Speech] Native speak error:', e);
          if (activeSession) {
            activeSession.isPlaying = false;
            activeSession.onError(e);
          }
        },
        onStopped: () => {
          // Do not increment index when paused/stopped
          if (activeSession) activeSession.isPlaying = false;
        },
        pitch: 1.0,
        rate: 0.95, // deliberate Google Assistant speed feel
      };
      
      if (voiceId) {
        speechOpts.voice = voiceId;
      }
      
      Speech.speak(sentence, speechOpts);
      return;
    }
    
    // 2. Try Web Speech Synthesis fallback
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const synth = window.speechSynthesis;
      if (synth.speaking) {
        synth.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.onend = () => {
        if (activeSession && activeSession.isPlaying) {
          activeSession.currentIndex++;
          playCurrentSentence();
        }
      };
      utterance.onerror = (e) => {
        console.error('[Speech] Web speak error:', e);
        if (activeSession) {
          activeSession.isPlaying = false;
          activeSession.onError(e);
        }
      };
      utterance.pitch = 1.0;
      utterance.rate = 0.95;
      
      const webVoice = getBestWebVoice(synth);
      if (webVoice) {
        utterance.voice = webVoice;
      }
      
      synth.speak(utterance);
      return;
    }
  } catch (error) {
    console.error('[Speech] playCurrentSentence error:', error);
    if (activeSession) {
      activeSession.isPlaying = false;
      activeSession.onError(error);
    }
  }
};

/**
 * Speaks text using the best available local or web voice.
 * Resumes from the last spoken sentence if the same text is supplied again.
 */
export const speakText = async (text: string, options: SpeakOptions): Promise<boolean> => {
  try {
    const cleanedText = stripEmojis(text);
    
    // Check if we are resuming the same active session
    if (activeSession && activeSession.text === cleanedText) {
      console.log(`[Speech] Resuming session at sentence index ${activeSession.currentIndex}`);
      activeSession.isPlaying = true;
      activeSession.onDone = options.onDone;
      activeSession.onError = options.onError;
      playCurrentSentence();
      return true;
    }
    
    // Otherwise, stop any current speech and start a new session
    stopSpeech();
    
    const sentences = splitIntoSentences(cleanedText);
    if (sentences.length === 0) return false;
    
    activeSession = {
      text: cleanedText,
      sentences: sentences,
      currentIndex: 0,
      isPlaying: true,
      onDone: options.onDone,
      onError: options.onError,
    };
    
    playCurrentSentence();
    return true;
  } catch (error) {
    console.error('[Speech] speakText failed:', error);
  }
  return false;
};

/**
 * Pauses/Stops any active speech synthesis, preserving the sentence index for resuming.
 */
export const stopSpeech = () => {
  if (activeSession) {
    activeSession.isPlaying = false;
    console.log(`[Speech] Paused session at sentence index ${activeSession.currentIndex}`);
  }
  
  try {
    if (Speech && Speech.stop) {
      Speech.stop();
    }
  } catch (e) {}
  
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {}
};

/**
 * Resets the speech session completely (used on card swipe/unmount).
 */
export const resetSpeechSession = () => {
  stopSpeech();
  activeSession = null;
  console.log('[Speech] Reset active session');
};
