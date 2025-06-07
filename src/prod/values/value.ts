import { Consumer, Tuple } from "../types.js"

export type InferFrom<V> = V extends Value<infer T> ? T : V
export type InferFromRecord<V extends Record<string, any>> = {
    [K in keyof V]: InferFrom<V[K]>
}
export type InferFromTuple<P extends Tuple> = 
      P extends [infer H, ...infer T] ? 
          T extends Tuple ? [InferFrom<H>, ...InferFromTuple<T>] 
        : [InferFrom<H>, InferFrom<T>] 
    : []

export type DeepInferFrom<V> = 
      V extends Value<infer T> ? T 
    : V extends (infer T)[] ? DeepInferFrom<T>[]
    : V extends Record<string, any> ? DeepInferFromRecord<V>
    : V
export type DeepInferFromRecord<V extends Record<string, any>> = {
    [K in keyof V]: DeepInferFrom<V[K]>
}
export type DeepInferFromTuple<P extends Tuple> = 
      P extends [infer H, ...infer T] ? 
          T extends Tuple ? [DeepInferFrom<H>, ...DeepInferFromTuple<T>] 
        : [DeepInferFrom<H>, DeepInferFrom<T>] 
    : []

export function value<T>(
    value: T, 
    equality: (a: T, b: T) => boolean = (a, b) => a === b
): BasicValue<T> {
    return new BasicValue(value, equality)
}

export function record<V extends Record<string, any>>(values: V): Value<InferFromRecord<V>> {
    return new RecordValue(values)
}

export function array<T>(values: (T | Value<T>)[]): Value<T[]> {
    return new ArrayValue(values)
}

export function tuple<P extends Tuple>(values: P): Value<InferFromTuple<P>> {
    return array(values) as Value<InferFromTuple<P>>
}

export function from<T>(v: T): Value<DeepInferFrom<T>> {
    const s = structure(v)
    return s instanceof Value ? s : value(s)
}

function structure<T>(value: T): Value<DeepInferFrom<T>> | DeepInferFrom<T> {
    let result: any = value
    if (value instanceof Value) {
        result = value
    } else if (Array.isArray(value)) {
        const a = value.map(v => structure(v))
        result = a.some(v => v instanceof Value) ? array(a) : a
    } else if (typeof value === 'object' && value !== null) {
        const r: Record<string, any> = {}
        for (const [key, val] of Object.entries(value)) {
            r[key] = structure(val)
        }
        result = Object.values(r).some(v => v instanceof Value) ? record(r) : r
    }
    return result as Value<DeepInferFrom<T>> | DeepInferFrom<T>
}


export abstract class Value<T> {

    private sources: [Value<any>, () => void][] = []
    private listeners: (() => void)[] = []

    protected addSource<S>(source: Value<S>, listener: () => void): void {
        source.addListener(listener)
        this.sources.push([source, listener])
    } 

    protected removeSource<S>(source: Value<S>): void {
        this.sources = this.sources.filter(([s, l]) => {
            const isSourceToRemove = s === source
            if (isSourceToRemove) {
                s.removeListener(l)
            }
            return !isSourceToRemove
        })
    } 

    abstract get(): Promise<T>

    addListener(listener: () => void) {
        if (this.listeners.length === 0) {
            this.connectSources()
        }
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener)
            listener()
        }
    }

    removeListener(listener: () => void): void {
        this.listeners = this.listeners.filter(l => l !== listener)
        if (this.listeners.length === 0) {
            this.disconnectSources()
        }
    }

    private connectSources(): void {
        this.sources.forEach(([source, listener]) => source.addListener(listener))
    }

    private disconnectSources(): void {
        this.sources.forEach(([source, listener]) => source.removeListener(listener))
    }

    protected notifyListeners(): void {
        for (const listener of this.listeners) {
            listener()
        }
    }

    map<R>(mapper: (value: T) => R | Promise<R>): Value<R> {
        return new MappedValue(this, mapper)
    }

    flatMap<R>(mapper: (value: T) => Value<R> | Promise<Value<R>>): Value<R> {
        return new FlattenedValue(this.map(mapper))
    }

    mapToRecord<R extends Record<string, any>>(mapper: (value: T) => R | Promise<R>): Value<InferFromRecord<R>> {
        return this.map(mapper).flatMap(value => record(value))
    }

    mapToArray<R extends any[]>(mapper: (value: T) => (R | Value<R>)[] | Promise<(R | Value<R>)[]>): Value<R[]> {
        return this.map(mapper).flatMap(value => array(value))
    }

    mapToTuple<R extends Tuple>(mapper: (value: T) => R | Promise<R>): Value<InferFromTuple<R>> {
        return this.map(mapper).flatMap(value => tuple(value))
    }

    cached(): Value<T> {
        return new CachedValue(this)
    }

    to(consumer: Consumer<T>): Value<T> {
        this.addListener(() => setTimeout(async () => consumer(await this.get())))
        return this
    }

}

class MappedValue<T, R> extends Value<R> {

    constructor(private value: Value<T>, private mapper: (value: T) => R | Promise<R>) {
        super()
        this.addSource(this.value, () => this.notifyListeners())
    }

    async get(): Promise<R> {
        const value = await this.value.get()
        return await this.mapper(value)
    }

}

class FlattenedValue<T> extends Value<T> {

    private nestedValue: Value<T> | null = null
    
    constructor(private value: Value<Value<T>>) {
        super()
        this.addSource(this.value, () => this.notifyListeners())
    }

    async get(): Promise<T> {
        const nestedValue = await this.value.get()
        if (this.nestedValue !== nestedValue) {
            if (this.nestedValue !== null) {
                this.removeSource(this.nestedValue)
            }
            this.nestedValue = nestedValue
            this.addSource(nestedValue, () => this.notifyListeners())
        }
        return await nestedValue.get()
    }

}

class CachedValue<T> extends Value<T> {
    
    private cachedValue: T | null = null

    constructor(private value: Value<T>) {
        super()
        this.addSource(this.value, () => {
            this.cachedValue = null
            this.notifyListeners()
        })
    }

    async get(): Promise<T> {
        if (this.cachedValue === null) {
            this.cachedValue = await this.value.get()
        }
        return this.cachedValue
    }

}

export class BasicValue<T> extends Value<T> {
        
    constructor(private value: T, private equality: (a: T, b: T) => boolean) {
        super()
    }

    async get(): Promise<T> {
        return this.value
    }

    set(value: T): T {
        const oldValue = this.value
        if (!this.equality(oldValue, value)) {
            this.value = value
            this.notifyListeners()
        }
        return oldValue
    }

}

class RecordValue<V extends Record<string, any>> extends Value<InferFromRecord<V>> {
    
    constructor(private values: V) {
        super()
        for (const value of Object.values(values)) {
            if (value instanceof Value) {
                this.addSource(value, () => this.notifyListeners())
            }
        }
    }

    async get(): Promise<InferFromRecord<V>> {
        const result: Record<string, any> = {}
        for (const [key, value] of Object.entries(this.values)) {
            result[key] = await get(value)
        }
        return result as InferFromRecord<V>

    }

}

class ArrayValue<T> extends Value<T[]> {
    
    constructor(private values: (T | Value<T>)[]) {
        super()
        for (const value of values) {
            if (value instanceof Value) {
                this.addSource(value, () => this.notifyListeners())
            }
        }
    }

    async get(): Promise<T[]> {
        return Promise.all(this.values.map(async value => await get(value)))
    }

}

async function get<T>(value: T | Value<T>): Promise<T> {
    return value instanceof Value ? await value.get() : value
}