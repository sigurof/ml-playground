export function indexOfMax(outputActivations: number[]) {
    if (outputActivations.length === 0) {
        throw new Error("Cannot find max of empty array");
    }
    return outputActivations.reduce((iMax, x, i, arr) => (x > arr[iMax] ? i : iMax), 0);
}
