import { Pair } from "./types.js";

export async function fetchTextFile(url: string): Promise<string> {
    return fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text());
}

export async function fetchTextFiles<K extends string, T extends Record<K, string>>(files: T, path: string = "."): Promise<T> {
    const result: Partial<Record<K, string>> = {};
    const keys = Object.keys(files) as K[];
    const promises = keys.map(k => requestTextFile(k, `${path}/${files[k]}`))
    for (let [key, promise] of promises) {
        result[key] = await promise
    }
    return result as T
}

function requestTextFile<K extends string>(key: K, url: string): Pair<K, Promise<string>> {
    return [key, fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text())]
}

export function save(url: string, contentType: string, fileName: string) {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.type = contentType
    anchor.target = '_blank'
    anchor.download = fileName
    anchor.click()
}

export class FileSelector<M extends boolean> {

    private input: HTMLInputElement = document.createElement("input")

    private constructor(private multiple: M, private mimeTypes: string[]) {
        this.input.type = "file"
        this.input.multiple = multiple
        this.input.accept = mimeTypes.join(",")
    }

    static create(): FileSelector<false> {
        return new FileSelector(false, [])
    }

    allowMultipleFiles(): FileSelector<true> {
        return this.multiple ? this as FileSelector<true> : new FileSelector(true, this.mimeTypes)
    }

    disallowMultipleFiles(): FileSelector<false> {
        return this.multiple ? new FileSelector(false, this.mimeTypes) : this as FileSelector<false>
    }

    ofType(...mimeTypes: string[]): FileSelector<M> {
        return new FileSelector(this.multiple, mimeTypes)
    }

    public async select(): Promise<FileSelectorOutput<M>> {
        return new Promise(resolve => {
            this.input.onchange = () => resolve(this.files())
            this.input.click()
        })
    }

    private files(): FileSelectorOutput<M> {
        return this.input.files && this.input.files.length > 0 
            ? (this.multiple === true ? [...this.input.files] : [this.input.files[0]]) as FileSelectorOutput<M> 
            : [];
    }

}
export type FileSelectorOutput<M extends boolean> = M extends true ? File[] : [File] | []
