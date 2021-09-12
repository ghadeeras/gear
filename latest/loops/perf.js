export class FrequencyMeter {
    constructor(unitTime, measurementConsumer) {
        this.unitTime = unitTime;
        this.measurementConsumer = measurementConsumer;
        this.lastReadingTime = 0;
        this.previousTime = 0;
        this.counter = 0;
    }
    tick(time = performance.now()) {
        if (this.counter === 0) {
            this.lastReadingTime = time;
        }
        const elapsedTime = time - this.lastReadingTime;
        if (elapsedTime >= this.unitTime) {
            this.measurementConsumer(this.counter * this.unitTime / elapsedTime);
            this.counter = 0;
            this.lastReadingTime = time;
        }
        this.counter++;
        const delta = time - this.previousTime;
        this.previousTime = time;
        return delta;
    }
    animateForever(frame) {
        this.animate(t => {
            frame(t);
            return true;
        });
    }
    animate(frame) {
        const wrappedFrame = (t) => {
            const requestNextFrame = frame(t);
            this.tick(t);
            if (requestNextFrame) {
                requestAnimationFrame(wrappedFrame);
            }
        };
        requestAnimationFrame(wrappedFrame);
    }
    static create(unitTime, elementOrId) {
        const element = elementOrId instanceof HTMLElement
            ? elementOrId
            : elementOrId
                ? document.getElementById(elementOrId)
                : null;
        return new FrequencyMeter(unitTime, element !== null
            ? (freq => element.innerHTML = freq.toFixed(3))
            : () => { });
    }
}
export function throttled(freqInHz, logic) {
    const periodInMilliseconds = 1000 / freqInHz;
    const lastTime = [performance.now()];
    return time => {
        const t = time !== null && time !== void 0 ? time : performance.now();
        const elapsed = t - lastTime[0];
        if (elapsed > periodInMilliseconds) {
            logic();
            lastTime[0] = t - (elapsed % periodInMilliseconds);
        }
    };
}
