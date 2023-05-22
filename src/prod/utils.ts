import * as types from "./types.js"

export function intact<T>(): types.UnaryOperator<T> {
    return value => value;
}

export function constant<T>(value: T): types.UnaryOperator<T> {
    return () => value;
}

export function compositeConsumer<T>(...consumers: types.Consumer<T>[]): types.Consumer<T> {
    switch (consumers.length) {
        case 0: return () => {};
        case 1: return consumers[0];
        default: return value => { 
            for (const consumer of consumers) {
                consumer(value); 
            }
        }
    }
}

export function compositeProducer<T>(...producers: types.Producer<T>[]): types.Producer<T> {
    switch (producers.length) {
        case 0: return () => {};
        case 1: return producers[0];
        default: return consumer => { 
            for (const producer of producers) {
                producer(consumer); 
            }
        }
    }
}

export function causeConsumer<C, E>(effect: types.Effect<C, E>, effectConsumer: types.Consumer<E>): types.Consumer<C> {
    return cause => effect(cause, effectConsumer)
}

export function effectProducer<C, E>(causeProducer: types.Producer<C>, effect: types.Effect<C, E>): types.Producer<E> {
    return effectConsumer => causeProducer(cause => effect(cause, effectConsumer))
}

export function circuit<T>(producer: types.Producer<T>, consumer: types.Consumer<T>): types.Callable {
    return () => producer(consumer);
}

export function htmlElement(id: string): HTMLElement {
    return required(document.getElementById(id), () => `Element with id '${id}' was not found!'`)
}

export function required<T>(value: T | null | undefined, message = () => `Required value is ${value}!`): T {
    return value === null || value === undefined
        ? error(message())
        : value
}

export function error<T>(message: string): T {
    throw new Error(message)
}

export function property<T, K extends keyof T>(object: T, key: K): types.Property<T[K]> {
    return {
        getter: () => object[key],
        setter: value => object[key] = value
    }
}

export function trap(e: UIEvent) {
    e.preventDefault()
    e.stopImmediatePropagation()
    e.stopPropagation()
}
