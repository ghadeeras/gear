import { Pair } from "./types.js";

export async function fetchTextFiles<K extends string, T extends Record<K, string>>(files: T, path: string = "."): Promise<T> {
    const result: Partial<Record<K, string>> = {};
    const keys = Object.keys(files) as K[];
    const promises = keys.map(k => fetchTextFile(k, `${path}/${files[k]}`))
    for (let [key, promise] of promises) {
        result[key] = await promise
    }
    return result as T
}

function fetchTextFile<K extends string>(key: K, url: string): Pair<K, Promise<string>> {
    return [key, fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text())]
}
