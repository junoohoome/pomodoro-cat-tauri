/**
 * 使用 Web Audio API 播放提示音
 * 无需外部音频文件，纯代码生成
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** 播放番茄钟完成提示音 - 清脆的两声 "叮叮" */
export function playCompleteSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 第一声 "叮"
    playTone(ctx, now, 880, 0.15, 0.3);
    // 第二声 "叮"（稍高、稍响）
    playTone(ctx, now + 0.2, 1100, 0.2, 0.4);
  } catch {
    // AudioContext 不可用时静默失败
  }
}

/** 播放休息结束提示音 - 轻柔的三声 "叮叮叮" */
export function playBreakEndSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    playTone(ctx, now, 660, 0.12, 0.25);
    playTone(ctx, now + 0.15, 880, 0.12, 0.25);
    playTone(ctx, now + 0.3, 1100, 0.15, 0.3);
  } catch {
    // AudioContext 不可用时静默失败
  }
}

function playTone(ctx: AudioContext, startTime: number, freq: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  // 音量包络：快速起音，自然衰减
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
