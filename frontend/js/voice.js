/**
 * Eshaas - Voice Input/Output
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById('messageInput');
    if (input) {
      input.value = transcript;
      sendMessage();
    }
  };

  recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
  };
}

function startVoice() {
  if (!recognition) {
    alert('Voice input is not supported in your browser. Try Chrome or Edge.');
    return;
  }
  recognition.start();
}

/**
 * Speak text aloud using browser TTS
 * @param {string} text
 */
function speak(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
