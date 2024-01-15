import { range } from "../utils/utils.ts";
import { ConnectionDto, InputVsOutput, MatrixDto, NeuralNetworkDto } from "../../api/api.ts";
import { matrixMultiplication, matrixOf } from "../linalg/linalg.ts";
import { sigmoid } from "../maths/maths.ts";
import { Matrix3 } from "three";
import { indexOfMax } from "../algorithms/algorithms.ts";

function elementwiseSigmoid(numbers: number[]): number[] {
    return numbers.map((it) => sigmoid(it));
}

export function connectionOfData(matrix: number[][]): ConnectionDto {
    return connectionOfMatrix(matrixOf(matrix));
}

export function connectionOfMatrix(matrix: MatrixDto): ConnectionDto {
    return {
        matrix,
        weights: matrix.columns - 1,
        biases: matrix.rows,
        inputs: matrix.columns,
        outputs: matrix.rows,
    };
}

export class NeuralNetwork {
    constructor(private d: NeuralNetworkDto) {}

    evaluateActivations(inputActivations: number[]): number[][] {
        const activations = [inputActivations];
        for (let i = 0; i < this.d.connections.length; i++) {
            const layer = this.d.connections[i];
            const activationsOfLastLayer: number[] = activations[i];
            const arrayProduct = matrixMultiplication(layer.matrix.data, [...activationsOfLastLayer, 1]);
            activations.push(elementwiseSigmoid(arrayProduct));
        }
        return activations;
    }

    evaluateOutput(inputActivations: number[]): number[] {
        return this.evaluateActivations(inputActivations)[this.d.connections.length];
    }

    evaluateCost(testingData: InputVsOutput[]) {
        const squaredErrors = testingData.map((testExample) => {
            const activations = this.evaluateActivations(testExample.input);
            const outputActivations = activations[activations.length - 1];
            const squaredError = testExample.output.map((expectedOutput, i) => {
                const actualOutput = outputActivations[i];
                return (expectedOutput - actualOutput) ** 2;
            });
            return squaredError.reduce((a, b) => a + b, 0);
        });
        const sum = squaredErrors.reduce((a, b) => a + b, 0);
        const number = sum / testingData.length;
        if (Number.isNaN(number)) {
            console.log("NaN");
            throw new Error("NaN");
        }
        return number;
    }

    evaluateAccuracy(testingData: InputVsOutput[]) {
        const various = testingData.map((testExample) => {
            const activations = this.evaluateActivations(testExample.input);
            const outputActivations = activations[activations.length - 1];
            // classification
            const maxIndex = indexOfMax(outputActivations);
            const correctIndex = indexOfMax(testExample.output);
            const classificationCorrectness = maxIndex === correctIndex ? 1 : 0;

            // squared error for cost
            const squaredErrorPerCoordinate: number[] = testExample.output.map((expectedOutput, i) => {
                const actualOutput = outputActivations[i];
                return (expectedOutput - actualOutput) ** 2;
            });
            return {
                squaredError: squaredErrorPerCoordinate.reduce((a, b) => a + b, 0),
                classificationCorrectness,
            };
        });
        const sum = various.reduce((partialSum, sample) => partialSum + sample.squaredError, 0);
        const cost = sum / testingData.length;
        if (Number.isNaN(cost)) {
            console.log("NaN");
            throw new Error("NaN");
        }
        const averageCorrectness =
            various.reduce((partialSum, sample) => partialSum + sample.classificationCorrectness, 0) /
            testingData.length;
        return {
            cost,
            averageCorrectness,
        };
    }
}
