class SoundManager {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    constructor() {
        try {
            type AudioCtxCtor = typeof window.AudioContext;
            const audioCtor: AudioCtxCtor | undefined =
                window.AudioContext ||
                (window as Window & { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
            this.ctx = audioCtor ? new audioCtor() : null;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    public toggle(val?: boolean) {
        this.enabled = val !== undefined ? val : !this.enabled;
    }

    public playClick() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(800, 'sine', 0.05);
    }

    public playUpgrade() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(600, 'square', 0.1);
        setTimeout(() => this.playTone(800, 'square', 0.1), 100);
    }

    public playAchievement() {
        if (!this.enabled || !this.ctx) return;
        // Victory fanfare-ish
        [400, 500, 600, 800].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.2), i * 100);
        });
    }

    private playTone(freq: number, type: OscillatorType, duration: number) {
        if (!this.ctx) return;

        // Resume context if suspended (browser requirements)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}

export const soundManager = new SoundManager();
