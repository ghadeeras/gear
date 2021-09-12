import { Supplier, Consumer } from "./types.js"

export class DeferredComputation<R> {

    private promise: Promise<R> | null = null

    constructor(private computation: Supplier<R>) {
    }

    perform(): Promise<R> {
        if (this.promise == null) {
            this.promise = new Promise((resolve, reject) => setTimeout(() => {
                this.performNow(resolve, reject)
            }))
        }
        return this.promise
    }


    private performNow(resolve: Consumer<R>, reject: Consumer<any>) {
        if (this.promise == null) {
            throw new Error("Failed to defer calculation!")
        }
        this.promise = null
        try {
            resolve(this.computation())
        } catch (e) {
            reject(e)
        }
    }

}

export function invokeLater<A extends any[], R>(f: (...args: A) => R, ...args: A): Promise<R> {
    const computation = new DeferredComputation(() => f(...args))
    return computation.perform()
}

