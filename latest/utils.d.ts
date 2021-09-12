import * as types from "./types.js";
export declare function intact<T>(): types.UnaryOperator<T>;
export declare function constant<T>(value: T): types.UnaryOperator<T>;
export declare function compositeConsumer<T>(...consumers: types.Consumer<T>[]): types.Consumer<T>;
export declare function compositeProducer<T>(...producers: types.Producer<T>[]): types.Producer<T>;
export declare function causeConsumer<C, E>(effect: types.Effect<C, E>, effectConsumer: types.Consumer<E>): types.Consumer<C>;
export declare function effectProducer<C, E>(causeProducer: types.Producer<C>, effect: types.Effect<C, E>): types.Producer<E>;
export declare function circuit<T>(producer: types.Producer<T>, consumer: types.Consumer<T>): types.Callable;
export declare function htmlElement(id: string): HTMLElement;
export declare function required<T>(value: T | null | undefined, message?: () => string): T;
export declare function error<T>(message: string): T;
export declare function property<T, K extends keyof T>(object: T, key: K): types.Property<T[K]>;
export declare function trap(e: UIEvent): void;
