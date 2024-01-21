package no.sigurof.ml.neuralnetwork.backpropagation

import no.sigurof.ml.neuralnetwork.InputVsOutput
import no.sigurof.ml.neuralnetwork.NeuralNetwork
import no.sigurof.ml.neuralnetwork.mutablyAddElementwise

object BackPropagation {
    fun calculateGradient(
        neuralNetwork: NeuralNetwork,
        trainingData: List<InputVsOutput>,
    ): DoubleArray {
        val gradient = DoubleArray(neuralNetwork.data.size) { _ -> 0.0 }
        for ((index, inputOutput) in trainingData.withIndex()) {
            val partGradient: DoubleArray = neuralNetwork.calculateGradientForSample(inputOutput)
            gradient.mutablyAddElementwise(partGradient)
        }
        return gradient / trainingData.size.toDouble()
    }
}

operator fun Double.times(doubleArray: DoubleArray): DoubleArray = doubleArray.map { it * this }.toDoubleArray()

// operator fun Double.times(doubleArray: DoubleArraySlice): DoubleArray = doubleArray.map { it * this }.toDoubleArray()

private operator fun DoubleArray.div(size: Double): DoubleArray = DoubleArray(this.size) { i -> this[i] / size }
