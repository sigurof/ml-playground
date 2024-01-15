package no.sigurof.ml.neuralnetwork

import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import no.sigurof.ml.neuralnetwork.backpropagation.BackPropagation
import no.sigurof.ml.neuralnetwork.backpropagation.GradientDescent
import no.sigurof.ml.neuralnetwork.backpropagation.increment

@Serializable
data class InputVsOutput(
    val input: DoubleArray,
    val output: DoubleArray,
)

class NeuralNetworkConnectionSpec(
    val inputs: Int,
    val outputs: Int,
) {
    val weights: Int
        get() = inputs * outputs
    val biases: Int
        get() = outputs
    val matrixRows: Int
        get() = outputs
    val matrixCols: Int
        get() = inputs + 1 // +1 for the bias
}

@Serializable
class CostUpdate(
    val step: Int,
    val cost: Double,
)

class NeuralNetworkBuilder(
    hiddenLayerDimensions: List<Int>,
    trainingData: List<InputVsOutput>,
) {
    private val inputLayer = trainingData.first().input.size
    private val outputLayer = trainingData.first().output.size
    private val layerSizes =
        listOf(
            listOf(inputLayer),
            hiddenLayerDimensions,
            listOf(outputLayer)
        )
    private var connections: List<NeuralNetworkConnectionSpec> =
        layerSizes.flatten()
            .zipWithNext { nThis, nNext -> NeuralNetworkConnectionSpec(inputs = nThis, outputs = nNext) }
    private val dimensionality = connections.sumOf { it.weights + it.biases }
    private val trainingDataChunks: List<List<InputVsOutput>> = trainingData.chunked(100)

    fun populateWeightsAndBiasesRaw(initMethod: (Int) -> Double) =
        NeuralNetwork(
            networkConnectionsIn = connections,
            initMethod = initMethod
        )

    class TrainingResult(
        val neuralNetwork: NeuralNetwork,
        val costUpdate: List<CostUpdate>,
    )

    // coroutine function that returns 1

    fun trainBackProp(): Flow<NeuralNetwork> =
        trainCoroutine()
            .filter { (step, coordinate) -> step % 30 == 0 }
            .map { (step, coordinate) ->
                val trainingDataChunk = trainingDataChunks[step % trainingDataChunks.size]
                neuralNetworkOf(coordinate)
            }

    fun trainBackPropMock(): Flow<NeuralNetwork> =
        trainMock2()
            .filter { (step, neural) -> step % 30 == 0 }
            .map { (step, neural) -> neuralNetworkOf(neural) }

    fun calculateSimpleGradient(
        neuralNetwork: NeuralNetwork,
        trainingDataChunk: List<InputVsOutput>,
    ): DoubleArray {
        val functionValue = neuralNetwork.calculateCostFunction(trainingDataChunk)
        val delta = 0.0001
        val derivative = DoubleArray(dimensionality) { 10.0 }
        for (index in 0 until dimensionality) {
            val pointIncr = neuralNetwork.data.increment(index, delta)
            val functionValueIncr = neuralNetworkOf(pointIncr).calculateCostFunction(trainingDataChunk)
            derivative[index] = (functionValueIncr - functionValue) / delta
        }
        return derivative
    }

    private fun trainMock2(): Flow<Pair<Int, DoubleArray>> =
        GradientDescent.minimizeMock(
            startingCoordinate = DoubleArray(dimensionality) { Random.nextDouble(-1.0, 1.0) },
            gradientFunction = { step, coordinate ->
                DoubleArray(dimensionality) { Random.nextDouble(-1.0, 1.0) }
            }
        )

    private fun trainCoroutine(): Flow<Pair<Int, DoubleArray>> =
        GradientDescent.minimizeCoroutine(
            learningRate = 10.0,
            startingCoordinate = DoubleArray(dimensionality) { Random.nextDouble(-1.0, 1.0) },
            gradientFunction = { step, weightsVector ->
                val trainingDataChunk = trainingDataChunks[step % trainingDataChunks.size]
                BackPropagation.calculateGradient(neuralNetworkOf(weightsVector), trainingDataChunk)
            }
        )

    fun train(iterationCallback: (step: Int, network: NeuralNetwork) -> Unit): NeuralNetwork {
        val costFunctionMin =
            GradientDescent.minimize(
                learningRate = 30.0,
                startingCoordinate = DoubleArray(dimensionality) { Random.nextDouble(-1.0, 1.0) },
                gradientFunction = { step, weightsVector ->
                    val trainingDataChunk = trainingDataChunks[step % trainingDataChunks.size]
                    BackPropagation.calculateGradient(neuralNetworkOf(weightsVector), trainingDataChunk)
                },
                iterationCallback = { step, coordinate, _ ->
                    val trainingDataChunk = trainingDataChunks[step % trainingDataChunks.size]
                    val weightsAndBiases = neuralNetworkOf(coordinate)
                    iterationCallback.invoke(step, weightsAndBiases)
                }
            )
        return neuralNetworkOf(costFunctionMin)
    }

    fun neuralNetworkOf(data: DoubleArray) =
        NeuralNetwork(
            data = data,
            networkConnectionsIn = connections
        )
}

fun trainNetworkMock(startI: Int): Flow<Pair<Int, Double>> =
    flow {
        var i = startI
        while (true) {
            val sinT = sin(i.toDouble() / 5.0)
            emit(i to sinT)
            delay(300)
            i++
        }
    }
