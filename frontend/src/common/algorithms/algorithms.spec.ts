import { indexOfMax } from "./algorithms.ts";

describe("algorithms", () => {
    it("should work", () => {
        expect(indexOfMax([0.1, 0.2, 0.3, 0.4])).toBe(3);
        expect(indexOfMax([0.4, 0.3, 0.2, 0.1])).toBe(0);
        expect(indexOfMax([0.1, 0.4, 0.3, 0.2])).toBe(1);
        expect(indexOfMax([0.1, 0.2, 0.4, 0.3])).toBe(2);
        // if all same
        expect(indexOfMax([0.1, 0.1, 0.1, 0.1])).toBe(0);
        // if no elements throw
        expect(() => indexOfMax([])).toThrow();

    });
});
