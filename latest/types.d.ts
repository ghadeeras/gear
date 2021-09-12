export declare type Callable = () => void;
export declare type Supplier<T> = () => T;
export declare type Consumer<T> = (input: T) => void;
export declare type Producer<T> = Consumer<Consumer<T>>;
export declare type Reducer<T, R> = (accumulator: R, value: T) => R;
export declare type Mapper<T, R> = (value: T) => R;
export declare type Predicate<T> = Mapper<T, boolean>;
export declare type UnaryOperator<T> = Mapper<T, T>;
export declare type Effect<C, E> = (value: C, result: Consumer<E>) => void;
export declare type Pair<A, B> = [A, B];
export declare type Key = keyof any;
export declare type Contains<K extends Key, V> = {
    [P in Key]: P extends K ? V : any;
};
export declare type EventHandler<E> = ((event: E) => any) | null;
