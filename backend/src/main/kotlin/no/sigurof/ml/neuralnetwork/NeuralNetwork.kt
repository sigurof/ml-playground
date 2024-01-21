package no.sigurof.ml.neuralnetwork

import kotlin.math.exp
import no.sigurof.ml.neuralnetwork.backpropagation.times
import no.sigurof.ml.utils.ArraySliceMatrix
import no.sigurof.ml.utils.DoubleArraySlice

fun elementwiseSigmoid(vector: DoubleArray) = DoubleArray(vector.size) { index -> 1.0 / (1.0 + exp(-vector[index])) }

private fun DoubleArray.concat(i: Int) = DoubleArray(this.size + i) { if (it < this.size) this[it] else 1.0 }

class PublicConnection(
    val inputs: Int,
    val outputs: Int,
    val weights: Int,
    val biases: Int,
    val matrix: ArraySliceMatrix,
)

class NeuralNetwork private constructor(
    private val connections: List<WeightsLayer>,
    val data: DoubleArray,
) {
    val layerSizes: List<Int> =
        connections.map { it.neuralNetworkConnectionSpec.inputs } +
            connections
                .last().neuralNetworkConnectionSpec.outputs
    val connectionsPublic: List<PublicConnection>
        get() =
            connections.map {
                PublicConnection(
                    inputs = it.neuralNetworkConnectionSpec.inputs,
                    outputs = it.neuralNetworkConnectionSpec.outputs,
                    weights = it.neuralNetworkConnectionSpec.weights,
                    biases = it.neuralNetworkConnectionSpec.biases,
                    matrix = it.matrix
                )
            }

    constructor(
        data: DoubleArray,
        networkConnectionsIn: List<NeuralNetworkConnectionSpec>,
    ) : this(
        data = data,
        connections = createLayers(networkConnectionsIn, data)
    )

    constructor(
        networkConnectionsIn: List<NeuralNetworkConnectionSpec>,
        initMethod: (Int) -> Double,
    ) : this(
        data = DoubleArray(networkConnectionsIn.sumOf { it.weights + it.biases }, initMethod),
        networkConnectionsIn = networkConnectionsIn
    )

    private class WeightsLayer(
        val index: Int,
        val matrix: ArraySliceMatrix,
        val startIndex: Int,
        val endIndex: Int,
        val neuralNetworkConnectionSpec: NeuralNetworkConnectionSpec,
    )

    companion object {
        private fun createLayers(
            networkConnectionsIn: List<NeuralNetworkConnectionSpec>,
            data: DoubleArray,
        ): List<WeightsLayer> {
            val weightsLayers = mutableListOf<WeightsLayer>()
            var lastEndIndex = 0
            for ((index, connection) in networkConnectionsIn.withIndex()) {
                val size = connection.weights + connection.biases
                val newEndIndex = lastEndIndex + size
                weightsLayers.add(
                    WeightsLayer(
                        index = index,
                        startIndex = lastEndIndex,
                        endIndex = newEndIndex,
                        neuralNetworkConnectionSpec = connection,
                        matrix =
                            ArraySliceMatrix(
                                rows = connection.matrixRows,
                                // TODO Don't copy the array here
//                            data = data.slice(lastEndIndex, newEndIndex)
                                data = data.toArraySlice(lastEndIndex until newEndIndex)
                            )
                    )
                )
                lastEndIndex = newEndIndex
            }
            return weightsLayers
        }
    }

    internal fun calculateCostFunction(trainingData: List<InputVsOutput>): Double {
        return trainingData.map { trainingDataPoint: InputVsOutput ->
            val outputActivations: DoubleArray = evaluateActivations(trainingDataPoint.input).last()
            var sumErrorsSquared = 0.0
            for (i in outputActivations.indices) {
                val activationMinusExpectation = outputActivations[i] - trainingDataPoint.output[i]
                sumErrorsSquared += activationMinusExpectation * activationMinusExpectation
            }
            sumErrorsSquared
        }.average()
    }

    fun evaluateActivations(input: DoubleArray): List<DoubleArray> {
        val activations: MutableList<DoubleArray> = mutableListOf(input)
        for (layer in connections) {
            val arrayProduct: DoubleArray = layer.matrix * activations[layer.index].concat(1)
            activations.add(elementwiseSigmoid(arrayProduct))
        }
        return activations
    }

    private fun calculateGradientOfZ(
        gradientCache: GradientCache,
        activations: List<DoubleArray>,
        activationIndex: Int,
        weightLayerIndex: Int,
    ): DoubleArray {
        val gradientOfZ = DoubleArray(data.size) { _ -> 0.0 }

        // Own Bias
        val currentConnections = connections[weightLayerIndex]
        val numCols = currentConnections.matrix.cols
        val currentWeightMatrixStartIndex = currentConnections.startIndex
        val currentWeightMatrixRowStartIndex = currentWeightMatrixStartIndex + activationIndex * numCols
        val biasIndex = currentWeightMatrixRowStartIndex + numCols - 1
        gradientOfZ[biasIndex] = 1.0

        // Own Weights
        for (j in 0 until activations.last().size) {
            val weightIndex = currentWeightMatrixRowStartIndex + j
            gradientOfZ[weightIndex] = activations.last()[j]
        }

        // Gradients of activations (recursion happens here)
        if (weightLayerIndex > 0) {
            for (j in 0 until activations.last().size) {
                val activationJ = activations.last()[j]
                val weightIndex = currentWeightMatrixRowStartIndex + j
                val weight = data[weightIndex]
                val gradientOfActivation: DoubleArray =
                    calculateActivationGradient(
                        gradientCache = gradientCache,
                        activations = activations.dropLast(1),
                        activationIndex = j,
                        activation = activationJ,
                        weightLayerIndex = weightLayerIndex - 1
                    )
                gradientOfZ.mutablyAddElementwise(weight * gradientOfActivation)
            }
        }

        return gradientOfZ
    }

    private class GradientCache() {
        fun get(
            layerIndex: Int,
            activationIndex: Int,
        ): DoubleArray? {
            return null
        }

        fun put(
            layerIndex: Int,
            activationIndex: Int,
            value: DoubleArray,
        ) {
            // Nothing
        }
    }

    internal fun calculateGradientForSample(inputOutput: InputVsOutput): DoubleArray {
        val gradientCache: GradientCache = GradientCache()
        val activations: List<DoubleArray> = evaluateActivations(inputOutput.input)
        val theSumOverI = DoubleArray(data.size) { _ -> 0.0 }
        for (activationIndex in 0 until connections.last().neuralNetworkConnectionSpec.outputs) {
            val activationI = activations.last()[activationIndex]
            val activationIMinusExpectedValue: Double = activationI - inputOutput.output[activationIndex]
            val gradientOfActivationI: DoubleArray =
                calculateActivationGradient(
                    gradientCache = gradientCache,
                    activations = activations.dropLast(1),
                    activationIndex = activationIndex,
                    activation = activationI,
                    weightLayerIndex = connections.lastIndex
                )

            theSumOverI.mutablyAddElementwise(activationIMinusExpectedValue * gradientOfActivationI)
        }
        return 2.0 * theSumOverI
    }

    private fun calculateActivationGradient(
        gradientCache: GradientCache,
        activations: List<DoubleArray>,
        activationIndex: Int,
        activation: Double,
        weightLayerIndex: Int,
    ): DoubleArray {
        val cachedValue: DoubleArray? =
            gradientCache.get(layerIndex = weightLayerIndex + 1, activationIndex = activationIndex)
        if (cachedValue != null) {
            return cachedValue
        }
        val activationFunctionDerivative: Double = activation * (1.0 - activation)
        val gradientOfZ: DoubleArray =
            calculateGradientOfZ(
                gradientCache = gradientCache,
                activations = activations,
                activationIndex = activationIndex,
                weightLayerIndex = weightLayerIndex
            )
        val activationGradient = activationFunctionDerivative * gradientOfZ
        gradientCache.put(
            layerIndex = weightLayerIndex + 1,
            activationIndex = activationIndex,
            value = activationGradient
        )
        return activationGradient
    }
}

private fun DoubleArray.toArraySlice(intRange: IntRange): DoubleArraySlice {
    return DoubleArraySlice(
        startIndex = intRange.first,
        endIndex = intRange.last + 1,
        backingData = this
    )
}

fun DoubleArray.mutablyAddElementwise(other: DoubleArray): DoubleArray {
    require(this.size == other.size) { "The two arrays must have the same size" }
    for (index in this.indices) {
        this[index] += other[index]
    }
    return this
}
