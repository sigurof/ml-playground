package no.sigurof.ml.utils

import kotlinx.serialization.Serializable

@Serializable
class DoubleArraySlice(
    val startIndex: Int,
    val endIndex: Int,
    private val backingData: DoubleArray,
) {
    val size = endIndex - startIndex

    constructor(size: Int, function: (integer: Int) -> Double) : this(
        0,
        size,
        DoubleArray(size) { i -> function.invoke(i) }
    )

    constructor(size: Int) : this(size, { 0.0 })

    fun copyOfRange(
        fromIndex: Int,
        toIndex: Int,
    ): DoubleArraySlice {
        return DoubleArraySlice(
            index(fromIndex),
            index(toIndex),
            backingData
        )
    }

    operator fun get(i: Int): Double {
        return backingData[index(i)]
    }

    private fun index(i: Int): Int {
        require(i in 0 until size) { "Index $i out of bounds [0, $size)" }
        return startIndex + i
    }

    operator fun set(
        i: Int,
        value: Double,
    ) {
        backingData[index(i)] = value
    }

    fun copyOf(i: Int): DoubleArraySlice {
        TODO("Not yet implemented")
    }

    fun forEachIndexed(function: (index: Int, value: Double) -> Unit) {
        for (i in 0 until size) {
            function.invoke(i, this[i])
        }
    }

    fun toList(): List<Double> {
        return backingData.toList()
    }
}

@Serializable
class ArraySliceMatrix(val rows: Int, val data: DoubleArraySlice) {
    init {
        require(
            data.size % rows == 0
        ) {
            """
            Failed to initialize matrix. The number of elements per row must be an
            integer but was ${data.size}/$rows = ${data.size.toDouble() / rows}.
            """.trimIndent()
        }
    }

    val cols = data.size / rows

    constructor(rows: Int, cols: Int, function: (row: Int, col: Int) -> Double) : this(
        rows,
        DoubleArraySlice(rows * cols) { i -> function.invoke(i / rows, i % cols) }
    )

    constructor(rows: Int, cols: Int) : this(rows, cols, { _, _ -> 0.0 })

    operator fun get(row: Int): DoubleArraySlice {
        return data.copyOfRange(row * cols, (row + 1) * cols)
    }

    operator fun get(
        row: Int,
        col: Int,
    ): Double = data[row * cols + col]

    operator fun set(
        row: Int,
        col: Int,
        value: Double,
    ) {
        data[row * cols + col] = value
    }

    operator fun times(other: DoubleArraySlice): DoubleArraySlice {
        require(
            other.size == cols
        ) { "Attempted to multiply a ${rows}x$cols matrix by a ${other.size}x1 column matrix." }
        val result = DoubleArraySlice(rows)
        for (row in 0 until rows) {
            var sum = 0.0
            for (col in 0 until cols) {
                sum += this[row, col] * other[col]
            }
            result[row] = sum
        }
        return result
    }

    operator fun times(other: ArraySliceMatrix): ArraySliceMatrix {
        val result = ArraySliceMatrix(rows, other.cols)
        for (row in 0 until rows) {
            for (col in 0 until other.cols) {
                var sum = 0.0
                for (i in 0 until cols) {
                    sum += this[row, i] * other[i, col]
                }
                result[row, col] = sum
            }
        }
        return result
    }

    fun plusRow(matrixRow: DoubleArraySlice): ArraySliceMatrix {
        require(
            matrixRow.size == cols
        ) {
            "Failed to add row. The number of elements in the row must be " +
                "equal to the number of columns in the matrix. ${matrixRow.size} != $cols"
        }
        val newNumRows = this.rows + 1
        val newData = data.copyOf(cols * newNumRows)
        matrixRow.forEachIndexed { index, value ->
            newData[(newNumRows - 1) * cols + index] = value
        }
        return ArraySliceMatrix(
            rows = newNumRows,
            data = newData
        )
    }

    operator fun times(other: DoubleArray): DoubleArray {
        require(
            other.size == cols
        ) { "Attempted to multiply a ${rows}x$cols matrix by a ${other.size}x1 column matrix." }
        val result = DoubleArray(rows)
        for (row in 0 until rows) {
            var sum = 0.0
            for (col in 0 until cols) {
                sum += this[row, col] * other[col]
            }
            result[row] = sum
        }
        return result
    }
}
