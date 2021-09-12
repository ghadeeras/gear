import { expect } from "chai"
import { UnaryOperator } from "../prod/types.js"
import { intact } from "../prod/utils.js"

describe("utils", () => {

    describe("intact", () => {

        it("returns input intact", () => {
            const f: UnaryOperator<string> = intact()

            expect(f("some string")).to.equal("some string")
        })
    })

})