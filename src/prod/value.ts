import * as effects from "./effects.js";
import * as lazy from "./lazy.js";
import * as types from "./types.js";
import * as utils from "./utils.js";

export class Value<T> {

    private consumers: types.Consumer<T>[] = []

    private compositeConsumer: types.Consumer<T> = () => {}

    constructor(producer: types.Producer<T>) {
        utils.invokeLater(() => producer(value => this.compositeConsumer(value)))
    }

    attach(consumer: types.Consumer<T>) {
        this.consumers.push(consumer)
        this.compositeConsumer = utils.compositeConsumer(...this.consumers)
    }

    defaultsTo(value: T): Value<T> {
        return new Value(consumer => {
            this.attach(consumer)
            consumer(value)
        })
    }

    then<R>(effect: types.Effect<T, R>): Value<R> {
        return new Value(effectConsumer => {
            this.attach(utils.causeConsumer(effect, effectConsumer))
        })
    }

    map<R>(mapper: types.Mapper<T, R>) {
        return this.then(effects.mapping(mapper))
    }

    reduce<R>(reducer: types.Reducer<T, R>, identity: R) {
        return this.then(effects.reduction(reducer, identity))
    }

    filter(predicate: types.Predicate<T>) {
        return this.then(effects.filtering(predicate))
    }

    later() {
        return this.then(effects.latency())
    }

    static from<T>(...values: Value<T>[]): Value<T> {
        return new Value(consumer => {
            for (const value of values) {
                value.attach(consumer)
            }
        })
    }
    
}

export class Source<T> {

    private lazyValue: types.Supplier<Value<T>>

    constructor(supplier: types.Supplier<Value<T>>) {
        this.lazyValue = lazy.lazy(supplier)
    }

    get value(): Value<T> {
        return this.lazyValue()
    }

    map<R>(mapper: types.Mapper<Value<T>, Value<R>>): Source<R> {
        return new Source(() => mapper(this.lazyValue()))
    }

    static from<T>(producer: types.Producer<T>): Source<T> {
        return new Source(() => new Value(producer))
    }

    static fromEvent<K extends types.Key, E>(
        object: types.Contains<K, types.EventHandler<E>>, 
        key: K, 
        adapter: types.UnaryOperator<types.Consumer<E>> = utils.intact()
    ): Source<E> {
        return Source.from(consumer => object[key] = adapter(consumer))
    }

}

export class Target<T> {

    private _value: Value<T> | null = null
    
    constructor(private consumer: types.Consumer<T>) {
    }

    get value(): Value<T> | null {
        return this._value
    }

    set value(v: Value<T> | null) {
        if (this._value) {
            throw new Error(v ? "Already bound!" : "Once bound, never unbound!")
        }
        if (v) {
            this._value = v
            v.attach(this.consumer)
        }
    }

}

export function bind<T, K extends keyof T, V extends T[K]>(target: T, key: K, value: Value<V>) {
    value.attach(v => target[key] = v)
}

export type ValuesMapping<T> = {
    [K in keyof T]: Value<T[K]>;
};

export type ValuesMappingFunction<T> = <K extends keyof T>(k: K) => Value<T[K]>

export function join<T>(initialValue: T, values: ValuesMapping<T>): Value<T> {
    return new Join(initialValue, values)
}

export function fork<T>(value: Value<T>): ValuesMappingFunction<T> {
    const valuesMapping: Partial<ValuesMapping<T>> = {}
    return k => {
        let result = valuesMapping[k];
        if (!result) {
            result = value.map(value => value[k])
            valuesMapping[k] = result
        }
        return result
    }
}

class Join<T> extends Value<T> {

    private value: T

    constructor(initialValue: T, values: ValuesMapping<T>) {
        super(consumer => this.attachValues(values, consumer))
        this.value = { ...initialValue }
    }


    private attachValues(values: ValuesMapping<T>, consumer: types.Consumer<T>) {
        for (const key in values) {
            values[key].attach(v => {
                this.value[key] = v
                consumer({ ...this.value })
            })
        }
    }

}