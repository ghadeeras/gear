import { expect } from "chai"
import { Value, BasicValue, value, record, tuple, from } from "../../prod/values/value.js"

describe("values", () => {

    describe("basic value", () => {

        it("allows mutating the value", async () => {
            const v = value("Some Value")
            expect(await v.get()).to.equal("Some Value")
            expect(v.set("New Value")).to.equal("Some Value")
            expect(await v.get()).to.equal("New Value")
        })

        it("notifies of new value", async () => {
            const v = value("Some Value")
            const sensor = new Sensor(v)
            expect(await sensor.sensesSetting(v, "New Value")).to.be.true
        })

        it("does not notify when new value is equal to old value", async () => {
            const v = value("Some Value")
            const sensor = new Sensor(v)
            expect(await sensor.sensesSetting(v, "Some Value")).to.be.false
        })

        it("does not notify when listener is deleted", async () => {
            const v = value("Some Value")
            const sensor = new Sensor(v)
            sensor.disconnect()
            expect(await sensor.sensesSetting(v, "New Value")).to.be.false
        })

    })

    describe("mapped value", () => {

        it("maps a value to another using the provided function", async () => {
            const someValue = "Some Value"
            const v = value(someValue)
            const mapped = v.map(s => s.length)
            expect(await v.get()).to.equal(someValue)
            expect(await mapped.get()).to.equal(someValue.length)
        })

        it("follows changes made to the mapped value", async () => {
            const someValue = "Some Value"
            const someOtherValue = "Some Other Value"
            const v = value(someValue)
            const mapped = v.map(s => s.length)
            expect(v.set(someOtherValue)).to.equal(someValue)
            expect(await mapped.get()).to.equal(someOtherValue.length)
        })

    });

    describe("flat-mapped value", () => {

        it("maps a value to another using the provided function", async () => {
            const someValue = "Some Value"
            const mappedFrom = value(someValue)
            const mapped = mappedFrom.flatMap(s => value(s.length))
            expect(await mappedFrom.get()).to.equal(someValue)
            expect(await mapped.get()).to.equal(someValue.length)
        })

        it("follows changes made to the mapped-from value", async () => {
            const someValue = "Some Value"
            const someOtherValue = "Some Other Value"
            const mappedFrom = value(someValue)
            const mapped = mappedFrom.flatMap(s => value(s.length))
            expect(mappedFrom.set(someOtherValue)).to.equal(someValue)
            expect(await mapped.get()).to.equal(someOtherValue.length)
        })

        it("follows changes made to the mapped-to value", async () => {
            const someValue = "Some Value"
            const someOtherValue = "Some Other Value"
            const mappedFrom = value(0)
            const mappedTo = value(someValue)
            const mapped = mappedFrom.flatMap(() => mappedTo)
            expect(await mapped.get()).to.equal(someValue)
            expect(mappedTo.set(someOtherValue)).to.equal(someValue)
            expect(await mapped.get()).to.equal(someOtherValue)
        })

        it("stops following changes made to previous mapped-to value", async () => {
            const values = [value("value 0"), value("value 1"), value("value 2")]
            const mappedFrom = value(0)
            const mapped = mappedFrom.flatMap(i => values[Math.abs(i) % values.length])
            const sensor = new Sensor(mapped)
            expect(await sensor.sensesSetting(values[0], "new value 0")).to.be.true
            expect(await sensor.sensesSetting(mappedFrom, 1)).to.be.true            
            expect(await sensor.sensesSetting(values[0], "newer value 0")).to.be.false
        })

    });

    describe("cached value", () => {

        it("avoids recomputing the value when it is not needed", async () => {
            const counter = [0]
            const someValue = value(5)
            const mappedValue = someValue.map(v => {
                counter[0]++
                return v
            })
            const cachedValue = mappedValue.cached()
            expect(await cachedValue.get()).to.equal(5)
            const counterBefore = counter[0]
            expect(await cachedValue.get()).to.equal(5)
            expect(counter[0]).to.equal(counterBefore)
        })

        it("recomputes the value when it is needed", async () => {
            const counter = [0]
            const someValue = value(5)
            const mappedValue = someValue.map(v => {
                counter[0]++
                return v
            })
            const cachedValue = mappedValue.cached()
            expect(await cachedValue.get()).to.equal(5)
            const counterBefore = counter[0]
            someValue.set(7)
            expect(await cachedValue.get()).to.equal(7)
            expect(counter[0]).to.equal(counterBefore + 1)
        })

    })

    describe("record value", () => {

        it("allows composing values into a record", async () => {
            const r = {
                a: value(1),
                b: "Some Value",
                c: value(true),
            }
            const recValue = record(r)
            expect(await recValue.get()).to.deep.equal({ a: 1, b: "Some Value", c: true })
            r.a.set(2)
            r.c.set(false)
            expect(await recValue.get()).to.deep.equal({ a: 2, b: "Some Value", c: false })
        })

    })

    describe("tuple value", () => {

        it("allows composing values into a tuple", async () => {
            const t: [BasicValue<number>, string, BasicValue<boolean>] = [value(1), "Some Value", value(true)]
            const tplValue = tuple(t)
            expect(await tplValue.get()).to.deep.equal([1, "Some Value", true])
            t[0].set(2)
            t[2].set(false)
            expect(await tplValue.get()).to.deep.equal([2, "Some Value", false])
        })

    })

    describe("from", () => {

        it("deeply traverses an object to create a value", async () => {
            const obj = from({
                a: value(1),
                b: {
                    c: value("Some Value"),
                    d: true,
                },
                e: [value(2), "Three"],
            })
            const v = await obj.get()            
            expect(v).to.deep.equal({
                a: 1,
                b: {
                    c: "Some Value",
                    d: true,
                },
                e: [2, "Three"],
            })
        })

    })

})

class Sensor<T> {

    private touched = false
    
    readonly listener: () => void = () => this.touched = true

    constructor(private value: Value<T>) {
        this.value.addListener(this.listener)
    }

    disconnect(): void {
        this.value.removeListener(this.listener)
    }

    async senses<R>(mutation: () => R): Promise<boolean> {
        await this.value.get()
        this.touched = false
        mutation()
        await this.value.get()
        return this.touched
    }

    async sensesSetting<V>(value: BasicValue<V>, newValue: V): Promise<boolean> {
        return await this.senses(() => value.set(newValue))
    } 

}