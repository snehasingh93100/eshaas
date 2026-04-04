/**
 * voice.js — Voice I/O for Eshaas using Web Speech API
 */

(function () {
  'use strict';

  // ===== BROWSER SUPPORT =====
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasSpeechRecognition = !!SpeechRecognition;
  const hasSpeechSynthesis = !!window.speechSynthesis;

  // ===== STATE =====
  let recognition = null;
  let isRecording = false;
  let ttsEnabled = true;
  let currentUtterance = null;

  // ===== PUBLIC API =====
  window.eshaasVoice = {
    toggle: toggleRecording,
    stopRecording,
    speakText,
    get ttsEnabled() { return ttsEnabled; },
    set ttsEnabled(v) { ttsEnabled = v; },
    isSupported: hasSpeechRecognition,
  };

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', initVoice);

  function initVoice() {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;

    if (!hasSpeechRecognition) {
      voiceBtn.title = 'Voice recognition not supported in this browser';
      voiceBtn.style.opacity = '0.4';
      voiceBtn.style.cursor = 'not-allowed';
      voiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Voice recognition is not supported in your browser. Try Chrome or Edge.', 'warning');
      });
      return;
    }

    setupRecognition();
    voiceBtn.title = 'Click to start voice input';
  }

  // ===== RECOGNITION SETUP =====

  function setupRecognition() {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = onRecognitionStart;
    recognition.onresult = onRecognitionResult;
    recognition.onerror = onRecognitionError;
    recognition.onend = onRecognitionEnd;
  }

  function onRecognitionStart() {
    isRecording = true;
    showRecordingIndicator();
  }

  function onRecognitionResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Show interim result in textarea as preview
    const textarea = document.getElementById('chat-textarea');
    if (textarea && interimTranscript) {
      textarea.value = interimTranscript;
      if (typeof autoResizeTextarea === 'function') autoResizeTextarea(textarea);
    }

    // On final result, fill the textarea
    if (finalTranscript) {
      handleVoiceResult(finalTranscript.trim());
    }
  }

  function onRecognitionError(event) {
    console.error('Speech recognition error:', event.error);
    isRecording = false;
    hideRecordingIndicator();

    const errorMessages = {
      'not-allowed': 'Microphone access denied. Please allow microphone permission.',
      'no-speech': 'No speech detected. Please try again.',
      'network': 'Network error during voice recognition.',
      'audio-capture': 'Could not capture audio. Check your microphone.',
      'aborted': null, // User cancelled — no notification needed
    };

    const msg = errorMessages[event.error];
    if (msg) showNotification(msg, 'error');
  }

  function onRecognitionEnd() {
    isRecording = false;
    hideRecordingIndicator();
  }

  // ===== CONTROLS =====

  function startRecording() {
    if (!hasSpeechRecognition) {
      showNotification('Voice recognition is not available in this browser.', 'warning');
      return;
    }

    if (isRecording) return;

    // Stop any ongoing TTS
    if (hasSpeechSynthesis) window.speechSynthesis.cancel();

    try {
      recognition.start();
    } catch (err) {
      console.error('Could not start recognition:', err);
      showNotification('Could not start voice recognition. Please try again.', 'error');
    }
  }

  function stopRecording() {
    if (!isRecording || !recognition) return;
    try {
      recognition.stop();
    } catch {}
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // ===== RESULT HANDLER =====

  function handleVoiceResult(transcript) {
    if (!transcript) return;

    const textarea = document.getElementById('chat-textarea');
    if (textarea) {
      textarea.value = transcript;
      if (typeof autoResizeTextarea === 'function') autoResizeTextarea(textarea);
      textarea.focus();
    }

    showNotification(`Voice captured: "${truncateText(transcript, 60)}"`, 'success', 2500);

    // Auto-send after a short delay
    setTimeout(() => {
      if (typeof handleSendMessage === 'function') {
        handleSendMessage();
      }
    }, 500);
  }

  // ===== RECORDING INDICATORS =====

  function showRecordingIndicator() {
    const voiceBtn = document.getElementById('voice-btn');
    const voiceOverlay = document.getElementById('voice-overlay');

    if (voiceBtn) {
      voiceBtn.classList.add('recording');
      voiceBtn.title = 'Recording... Click to stop';
      voiceBtn.innerHTML = '🔴';
    }

    if (voiceOverlay) {
      voiceOverlay.classList.add('active');
    }
  }

  function hideRecordingIndicator() {
    const voiceBtn = document.getElementById('voice-btn');
    const voiceOverlay = document.getElementById('voice-overlay');

    if (voiceBtn) {
      voiceBtn.classList.remove('recording');
      voiceBtn.title = 'Click to start voice input';
      voiceBtn.innerHTML = '🎙️';
    }

    if (voiceOverlay) {
      voiceOverlay.classList.remove('active');
    }
  }

  // ===== TEXT-TO-SPEECH =====

  /**
   * Speak a text string using the Web Speech Synthesis API.
   * @param {string} text
   */
  function speakText(text) {
    if (!hasSpeechSynthesis || !ttsEnabled || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;

    // Use a pleasant voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech synthesis error:', e.error);
      }
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Load voices asynchronously (Chrome)
  if (hasSpeechSynthesis) {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices(); // Prime the list
      };
    }
  }
})();
