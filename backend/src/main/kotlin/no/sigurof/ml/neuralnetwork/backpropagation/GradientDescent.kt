package no.sigurof.ml.neuralnetwork.backpropagation

import kotlin.math.sqrt
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.yield

fun interface IterationCallback {
    fun invoke(
        step: Int,
        coordinate: DoubleArray,
        functionValue: Double,
    )
}

object GradientDescent {
    fun minimizeMock(
        startingCoordinate: DoubleArray,
        gradientFunction: (step: Int, coordinate: DoubleArray) -> DoubleArray,
    ) = flow {
        val coordinate = startingCoordinate.copyOf()
        var derivative = gradientFunction.invoke(0, coordinate)
        var steps = 0
        while (true) {
            emit(steps to coordinate)
            var derivative = gradientFunction.invoke(0, coordinate)
            delay(10)

            steps++
        }
    }

    fun minimizeCoroutine(
        learningRate: Double,
        startingCoordinate: DoubleArray,
        gradientFunction: suspend (step: Int, coordinate: DoubleArray) -> DoubleArray,
    ) = flow {
        var coordinate = startingCoordinate.copyOf()
        var derivative = gradientFunction.invoke(0, coordinate)
        var steps = 0
        while (true) {
            println("before yield: steps = $steps, derivative = ${derivative.length()}")
            yield()
            println("after yield: steps = $steps, derivative = ${derivative.length()}")
            emit(steps to coordinate)
            val newCoordinate = DoubleArray(size = coordinate.size)

            derivative = gradientFunction.invoke(steps, coordinate)
//            var derivative = gradientFunction.invoke(0, coordinate)

            for (index in coordinate.indices) {
                newCoordinate[index] = coordinate[index] - learningRate * derivative[index]
            }
            coordinate = newCoordinate
            steps++
        }
//        println("steps = $steps")
//        emit(steps to coordinate)
    }

    fun minimize(
        learningRate: Double,
        startingCoordinate: DoubleArray,
        gradientFunction: (step: Int, coordinate: DoubleArray) -> DoubleArray,
        iterationCallback: IterationCallback? = null,
    ): DoubleArray {
        var coordinate = startingCoordinate.copyOf()
        var derivative = gradientFunction.invoke(0, coordinate)
        var steps = 0
        val d = 0.000003
        while (derivative.length() > d && steps < 5000) {
            println("steps = $steps, derivative = ${derivative.length()}")
            iterationCallback?.invoke(steps, coordinate, 0.0)
            val newCoordinate = DoubleArray(size = coordinate.size)

            derivative = gradientFunction.invoke(steps, coordinate)

            for (index in coordinate.indices) {
                newCoordinate[index] = coordinate[index] - learningRate * derivative[index]
            }
            coordinate = newCoordinate
            steps++
        }
        println("steps = $steps")
        return coordinate
    }
}

fun DoubleArray.increment(
    index: Int,
    delta: Double,
): DoubleArray = DoubleArray(this.size) { i -> if (i == index) this[i] + delta else this[i] }

private fun DoubleArray.length(): Double {
    var sum = 0.0
    for (i in this.indices) {
        sum += this[i] * this[i]
    }
    return sqrt(sum)
}

val Pair<Double, Double>.x: Double
    get() {
        return first
    }

val Pair<Double, Double>.y: Double
    get() {
        return second
    }
