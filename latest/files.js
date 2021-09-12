var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export function fetchTextFile(url) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text());
    });
}
export function fetchTextFiles(files, path = ".") {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        const keys = Object.keys(files);
        const promises = keys.map(k => requestTextFile(k, `${path}/${files[k]}`));
        for (let [key, promise] of promises) {
            result[key] = yield promise;
        }
        return result;
    });
}
function requestTextFile(key, url) {
    return [key, fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text())];
}
export function save(url, contentType, fileName) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.type = contentType;
    anchor.target = '_blank';
    anchor.download = fileName;
    anchor.click();
}
