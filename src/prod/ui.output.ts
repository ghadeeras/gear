import { Target } from "./value.js";
import { htmlElement } from "./utils.js";

export function text(elementId: string): Target<string | null> {
    const element = htmlElement(elementId);
    return new Target(value => element.textContent = value);
}

export function writeableValue(elementId: string): Target<string> {
    const element = htmlElement(elementId) as HTMLInputElement;
    return new Target(value => element.value = value);
}
