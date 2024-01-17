package no.sigurof.ml.server

import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.routing.routing
import java.util.concurrent.ConcurrentHashMap
import kotlinx.serialization.Serializable
import no.sigurof.ml.neuralnetwork.NeuralNetwork
import no.sigurof.ml.server.web.rest.restModule
import no.sigurof.ml.server.web.rest.restRoutes
import no.sigurof.ml.server.web.websockets.webSocketRoutes
import no.sigurof.ml.server.web.websockets.webSocketsModule
import no.sigurof.ml.server.web.websockets.webSocketsSerializersModule

fun startKtorServer() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        restModule()
        webSocketsSerializersModule
        webSocketsModule()
        routing {
            restRoutes()
            webSocketRoutes()
        }
    }
        .start(wait = true)
}

internal val nnSessions = ConcurrentHashMap<String, NeuralNetworkServerClientSession>()

@Serializable
class Model(
    val hiddenLayers: List<Int>,
    val sizeDataSet: Int,
    var learningRate: Double,
)

data class IterativeServerClientSession(
    var progress: Int,
    var result: String,
    var model: Model,
) {
    companion object {
        fun new(model: Model) = IterativeServerClientSession(progress = 0, result = "", model = model)
    }
}

class NeuralNetworkServerClientSession(
    var result: NeuralNetwork?,
    var model: Model,
) {
    companion object {
        fun new(
            model: Model,
            baseState: NeuralNetwork?,
        ): NeuralNetworkServerClientSession {
            return NeuralNetworkServerClientSession(
                model = model,
                result = baseState
            )
        }
    }
}
