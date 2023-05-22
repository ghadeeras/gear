export class FrequencyMeter {

    private lastReadingTime = 0
    private previousTime = 0
    private counter = 0
    
    constructor(private unitTime: number, private measurementConsumer: (measuredFrequency: number) => void) {
    }

    tick(time: number = performance.now()) {
        if (this.counter === 0) {
            this.lastReadingTime = time
        }
        const elapsedTime = time - this.lastReadingTime
        if (elapsedTime >= this.unitTime) {
            this.measurementConsumer(this.counter * this.unitTime / elapsedTime)
            this.counter = 0
            this.lastReadingTime = time
        }
        this.counter++
        const delta = time - this.previousTime
        this.previousTime = time;
        return delta
    }

    animateForever(frame: (t: number) => void) {
        this.animate(t => {
            frame(t)
            return true
        })
    }

    animate(frame: (t: number) => boolean) {
        const wrappedFrame = (t: number) => {
            const requestNextFrame = frame(t)
            this.tick(t)
            if (requestNextFrame) {
                requestAnimationFrame(wrappedFrame)
            }
        }
        requestAnimationFrame(wrappedFrame)
    }

    static create(unitTime: number, elementOrId: HTMLElement | string) {
        const element = elementOrId instanceof HTMLElement 
            ? elementOrId 
            : elementOrId
                ? document.getElementById(elementOrId)
                : null
        return new FrequencyMeter(unitTime, element !== null 
            ? (freq => element.innerHTML = freq.toFixed(3)) 
            : () => {}
        )
    }

}

export function throttled(freqInHz: number, logic: () => void): (time?: number) => void {
    const periodInMilliseconds = 1000 / freqInHz
    const lastTime = [performance.now()]
    return time => {
        const t = time ?? performance.now()
        const elapsed = t - lastTime[0]
        if (elapsed > periodInMilliseconds) {
            logic()
            lastTime[0] = t - (elapsed % periodInMilliseconds)
        }
    }
}
