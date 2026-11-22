/** Short, locally synthesized feedback; no network audio or downloaded assets. */
export function scheduleMatchingSound(audio: AudioContext, correct: boolean) {
  const start = audio.currentTime + 0.02;
  const notes = correct ? [523.25, 659.25, 783.99] : [220, 164.81];
  notes.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const time = start + index * 0.09;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
