import { required, trap } from "../utils.js"

import { ButtonInterface, PointerButton } from './button.js'
import { Consumer, FilteredKeyOf, Property } from "../types.js"

export type PointerPosition = [number, number];

export interface PointerInterface {

    readonly primary: ButtonInterface
    readonly secondary: ButtonInterface
    readonly auxiliary: ButtonInterface

    readonly x: number 
    readonly y: number
    readonly position: PointerPosition
    readonly pixelViewPosition: PointerPosition
    readonly innerViewPosition: PointerPosition
    readonly outerViewPosition: PointerPosition

    draggingTarget: DraggingTarget | null

}

export class Pointer implements PointerInterface {

    readonly element: HTMLElement

    private _position: PointerPosition = [0, 0]
    private _pixelViewPosition: PointerPosition = [0, 0]
    private _innerViewPosition: PointerPosition = [0, 0]
    private _outerViewPosition: PointerPosition = [0, 0]

    readonly primary: PointerButton = new PointerButton("primary")
    readonly secondary: PointerButton = new PointerButton("secondary")
    readonly auxiliary: PointerButton = new PointerButton("auxiliary")

    private onpointerdown: typeof this.element.onpointerdown = e => this.buttonUsed(e, b => this.buttonPressed(e, b))
    private onpointerup: typeof this.element.onpointerup = e => this.buttonUsed(e, b => this.buttonReleased(e, b))
    private onpointermove: typeof this.element.onpointermove = e => this.pointerMoved(e)

    private _draggingTarget: DraggingTarget | null = null
    
    private observers: Consumer<this>[] = []

    constructor(element: HTMLElement | string) {
        this.element = element instanceof HTMLElement ? element : required(document.getElementById(element))
        this.primary.register(b => {
            if (this._draggingTarget !== null) {
                b.pressed
                    ? this._draggingTarget.startDragging(this)
                    : this._draggingTarget.stopDragging()
            }
        })
        this.register(() => {
            if (this._draggingTarget !== null) {
                this._draggingTarget.keepDragging(this)
            }    
        })
    }

    register(observer: Consumer<this>) {
        this.observers.push(observer)
    }

    get draggingTarget() {
        return this._draggingTarget
    }

    set draggingTarget(draggingTarget: DraggingTarget | null) {
        this.removeDraggingTarget()
        this._draggingTarget = draggingTarget
    }

    removeDraggingTarget() {
        if (this._draggingTarget !== null) {
            this._draggingTarget.stopDragging()
            this._draggingTarget = null
        }
    }

    use() {
        this.element.onpointerdown = this.onpointerdown
        this.element.onpointerup = this.onpointerup
        this.element.onpointermove = this.onpointermove
        this.element.ontouchstart = trap
        this.element.ontouchend = trap
        this.element.ontouchmove = trap
    }

    get x() {
        return this._position[0]
    }

    get y() {
        return this._position[1]
    }

    get position(): PointerPosition {
        return this._position
    }

    get pixelViewPosition(): PointerPosition {
        return this._pixelViewPosition
    }

    get innerViewPosition(): PointerPosition {
        return this._innerViewPosition
    }

    get outerViewPosition(): PointerPosition {
        return this._outerViewPosition
    }

    private pointerMoved(e: PointerEvent) {
        trap(e)
        this.updatePositionFrom(e)
        this.observers.forEach(observer => observer(this))
    }

    private buttonPressed(e: PointerEvent, b: PointerButton) {
        this.element.setPointerCapture(e.pointerId)
        b.pressed = true
    }

    private buttonReleased(e: PointerEvent, b: PointerButton) {
        b.pressed = false
        this.element.releasePointerCapture(e.pointerId)
    }

    private buttonUsed(e: PointerEvent, action: (b: PointerButton) => void) {
        const button = this.button(e.button)
        if (button !== null) {
            trap(e)
            this.updatePositionFrom(e)
            action(button)
        }
    }

    private button(buttonId: number): PointerButton | null {
        switch (buttonId) {
            case 0: return this.primary
            case 1: return this.auxiliary
            case 2: return this.secondary
            default: return null
        }
    }

    private updatePositionFrom(e: PointerEvent) {
        const invW = 1 / this.element.clientWidth
        const invH = 1 / this.element.clientHeight
        const invMin = Math.max(invW, invH)
        const invMax = Math.min(invW, invH)
        const x = 2 * e.offsetX - this.element.clientWidth
        const y = this.element.clientHeight - 2 * e.offsetY

        this._position          = [x * invW  , y * invH  ]
        this._innerViewPosition = [x * invMin, y * invMin]
        this._outerViewPosition = [x * invMax, y * invMax]
        this._pixelViewPosition = [e.offsetX , e.offsetY ]
    }

}

export interface DraggingTarget {
    startDragging(pointer: Pointer): void
    keepDragging(pointer: Pointer): void
    stopDragging(): void
    abortDragging(): void
}

export function draggingTarget<V>(property: Property<V>, dragger: Dragger<V>, positionType: FilteredKeyOf<PointerInterface, PointerPosition> = "position"): DraggingTarget {
    return new GenericDraggingTarget(property, dragger, positionType)
}

export interface Dragger<T> {
    begin(object: T, position: PointerPosition): DraggingFunction<T>
    end(object: T): T
}

export type DraggingFunction<T> = (position: PointerPosition) => T

class GenericDraggingTarget<T> implements DraggingTarget {
    
    private drag: (pointer: Pointer) => void = () => {}
    private done: () => void = () => {}
    private abort: () => void = () => {}

    constructor(private property: Property<T>, private dragger: Dragger<T>, private positionType: FilteredKeyOf<PointerInterface, PointerPosition>) {
    }

    startDragging(pointer: Pointer) {
        const initial = this.property.getter()
        let latest = initial
        const draggingFunction = this.dragger.begin(initial, pointer[this.positionType])
        this.drag = pointer => this.property.setter(latest = draggingFunction(pointer[this.positionType]))
        this.drag(pointer)
        this.done = () => this.property.setter(this.dragger.end(latest))
        this.abort = () => this.property.setter(initial)
    }

    keepDragging(pointer: Pointer) {
        this.drag(pointer)
    }
    
    stopDragging() {
        this.done()
        this.reset()
    }

    abortDragging(): void {
        this.abort()
        this.reset()
    }

    private reset() {
        this.drag = () => {};
        this.done = () => {};
        this.abort = () => {};
    }

}
