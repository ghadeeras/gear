import { Supplier } from "./types.js"

export class Lazy<T> {

    private _value: T | null = null;

    constructor(private readonly supplier: Supplier<T>) {
    }

    get(): T {
        if (!this._value) {
            this._value = this.supplier();
        }
        return this._value;
    }

    refresh() {
        this._value = null
    }

    asSupplier(): Supplier<T> {
        return () => this.get()
    }

}

export function lazy<T>(constructor: Supplier<T>): Supplier<T> {
    let lazy = new Lazy(constructor);
    return lazy.asSupplier();
}
