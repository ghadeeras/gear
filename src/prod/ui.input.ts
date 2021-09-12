import { Source, Value } from "./value.js";
import * as types from "./types.js";
import * as utils from "./utils.js";
import * as effects from "./effects.js";

export type PointerPosition = [number, number];
export type MouseButtons = [boolean, boolean, boolean];

export type Dragging = <T>(dragger: Dragger<T>) => T

export type DraggingPositionMapper<T> = types.Mapper<PointerPosition, T>

export interface DraggingHandler<T> {

    currentValue(): T

    mapper(value: T, from: PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): DraggingPositionMapper<T>

    finalize(value: T): T

}

export function drag<T>(handler: DraggingHandler<T>): types.Effect<Dragging, T> {
    const dragger = new Dragger(handler)
    return effects.mapping(dragging => dragging(dragger))
}

class Dragger<T> {

    private mapper: DraggingPositionMapper<T> = () => this.handler.currentValue()

    constructor(private handler: DraggingHandler<T>) {}

    start(position: PointerPosition, shift: boolean, ctrl: boolean, alt: boolean): T {
        const initialValue = this.handler.currentValue()
        this.mapper = this.handler.mapper(initialValue, position, shift, ctrl, alt)
        return initialValue
    }

    drag(position: PointerPosition): T {
        return this.mapper(position)
    }

    end(position: PointerPosition) {
        return this.handler.finalize(this.drag(position))
    }

}

export function posIn(e: HTMLElement): types.Mapper<MouseEvent, PointerPosition> {
    return p => [
        (2 * p.clientX - e.clientWidth) / e.clientWidth, 
        (e.clientHeight - 2 * p.clientY) / e.clientHeight
    ]
}

export function checkbox(elementId: string): Value<boolean> {
    const element = utils.htmlElement(elementId) as HTMLInputElement;
    return Source.fromEvent(element, "onchange").value.map(() => element.checked);
}

export function readableValue(elementId: string): Value<string> {
    const element = utils.htmlElement(elementId) as HTMLInputElement;
    return Source.fromEvent(element, "onchange").value.map(() => element.value);
}

export function elementEvents(elementId: string) {
    return ElementEvents.create(elementId);
}

export class ElementEvents {

    readonly positionNormalizer: types.Mapper<MouseEvent, PointerPosition> = posIn(this.element);

    readonly click: Source<MouseEvent> = Source.fromEvent(this.element, "onclick", trapping)
    readonly pointerDown: Source<PointerEvent> = primary(Source.fromEvent(this.element, "onpointerdown", trapping))
    readonly pointerUp: Source<PointerEvent> = primary(Source.fromEvent(this.element, "onpointerup", trapping))
    readonly pointerMove: Source<PointerEvent> = primary(Source.fromEvent(this.element, "onpointermove", trapping))

    readonly clickPos: Source<PointerPosition> = this.newClickPos()
    readonly pointerPos: Source<PointerPosition> = this.newPointerPos()
    readonly dragging: Source<Dragging> = this.newDragging()
    readonly pointerButtons: Source<MouseButtons> = this.newPointerButtons()

    constructor(readonly element: HTMLElement) {
    }

    parent() {
        return this.element.parentElement != null ? new ElementEvents(this.element.parentElement) : null;
    }

    private newClickPos(): Source<PointerPosition> {
        return this.click.map(value => value
            .map(this.positionNormalizer)
            .defaultsTo([0, 0])
        )
    }

    private newPointerPos(): Source<PointerPosition> {
        return this.pointerMove.map(value => value
            .map(this.positionNormalizer)
            .defaultsTo([0, 0])
        )
    }

    private newDragging(): Source<Dragging> {
        const isDragging: [boolean] = [false]
        return new Source(() => Value.from(
            this.pointerDown.value.map(e => this.startDragging(isDragging, e)),
            this.pointerMove.value.filter(e => (e.buttons & 1) != 0).map(e => this.drag(e)),
            Value.from(
                this.pointerMove.value.filter(e => (e.buttons & 1) == 0 && !isDragging[0]),
                this.pointerUp.value 
            ).map(e => this.endDragging(isDragging, e))
        ))
    }

    private startDragging(isDragging: [boolean], p: PointerEvent): Dragging {
        this.element.setPointerCapture(p.pointerId)
        isDragging[0] = true
        return dragger => dragger.start(this.positionNormalizer(p), p.shiftKey, p.ctrlKey, p.altKey)
    }

    private drag(p: PointerEvent): Dragging {
        return dragger => dragger.drag(this.positionNormalizer(p))
    }

    private endDragging(isDragging: [boolean], p: PointerEvent): Dragging {
        this.element.releasePointerCapture(p.pointerId)
        isDragging[0] = false
        return dragger => dragger.end(this.positionNormalizer(p))
    }

    private newPointerButtons(): Source<MouseButtons> {
        const initialValue: MouseButtons = [false, false, false];
        return new Source(() => Value.from(this.pointerDown.value, this.pointerUp.value)
            .map<MouseButtons>(e => [
                (e.buttons & 1) != 0, 
                (e.buttons & 4) != 0, 
                (e.buttons & 2) != 0
            ])
        )
    }

    static create(elementId: string) {
        return new ElementEvents(utils.htmlElement(elementId));
    }

}

function trapping<E extends UIEvent>(consumer: types.Consumer<E>): types.Consumer<E> {
    return e => {
        e.preventDefault()
        e.stopImmediatePropagation()
        e.stopPropagation()
        consumer(e)
    }
}

function primary(s: Source<PointerEvent>): Source<PointerEvent> {
    return s.map(value => value.filter(e => e.isPrimary))
}
