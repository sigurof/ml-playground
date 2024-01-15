package no.sigurof.ml.server.web.websockets

import io.ktor.serialization.kotlinx.KotlinxWebsocketSerializationConverter
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.routing.Route
import io.ktor.server.websocket.WebSocketServerSession
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.pingPeriod
import io.ktor.server.websocket.timeout
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import java.time.Duration
import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass
import no.sigurof.ml.datasets.MNIST
import no.sigurof.ml.neuralnetwork.NeuralNetworkBuilder
import no.sigurof.ml.server.NeuralNetworkServerClientSession
import no.sigurof.ml.server.nnSessions
import no.sigurof.ml.server.web.common.toDto
import no.sigurof.ml.server.web.rest.toDto

fun Application.webSocketsModule() {
    install(WebSockets) {
        contentConverter = KotlinxWebsocketSerializationConverter(Json)
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(15)
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }
}

fun Route.webSocketRoutes() {
    webSocket("/ml/network") {
        println("Connection opened!")
        var sessionId: String? = null
        try {
            while (true) {
                when (val frame = incoming.receive()) {
                    is Frame.Text -> {
                        deserializeEvent(frame.readText())
                            ?.let { event ->
                                sessionId = event.sessionId
                                when (event) {
                                    is ClientEvent.NewModel -> handleNewModel(event)
                                    is ClientEvent.Continue -> {
                                        nnSessions[sessionId]?.let { session ->
                                            receiveNeuralNetworkUpdates(session)
                                        } ?: run {
                                            sendServerEvent(ServerEvent.ClientError("No session with id $sessionId."))
                                        }
                                    }
                                }
                            }
                    }

                    else -> error("Unknown frame $frame")
                }
            }
        } catch (e: Exception) {
            println("Connection with session $sessionId lost:")
            println(e.stackTraceToString())
        } finally {
            println("Session $sessionId disconnected")
        }
    }
}

private suspend fun WebSocketServerSession.deserializeEvent(text: String): ClientEvent? {
    try {
        return json.decodeFromString(ClientEvent.serializer(), text)
    } catch (e: IllegalArgumentException) {
        sendServerEvent(ServerEvent.ClientError("Invalid session ID: ${e.message}"))
        return null
    }
}

private suspend fun WebSocketServerSession.sendServerEvent(data: ServerEvent) {
    val text = json.encodeToString(ServerEvent.serializer(), data)
    send(Frame.Text(text))
}

private suspend fun WebSocketServerSession.receiveNeuralNetworkUpdates(session: NeuralNetworkServerClientSession) {
    var i = 0
    NeuralNetworkBuilder(
        trainingData = MNIST.inputsVsOutputs(session.model.sizeDataSet),
        hiddenLayerDimensions = session.model.hiddenLayers
    ).trainBackProp()
//        .catch { e -> println("Error: ${e.message}") }
        .collect { neuralNetwork ->
            try {
                i++
                val message = "Update $i of 60"
                println("Sending '$message'")
                sendServerEvent(ServerEvent.Update(message, neuralNetwork.toDto()))
            } catch (e: Exception) {
                println("Error: ${e.message}")
                throw e
            }
        }
}

private suspend fun WebSocketServerSession.handleNewModel(event: ClientEvent.NewModel) {
    println("New model: $event")
    val sessions = nnSessions
    val sessionId = event.sessionId
    if (sessions[sessionId]?.model == null || event.override) {
        sessions[sessionId] =
            NeuralNetworkServerClientSession.new(model = event.model, baseState = null)
        sessions[sessionId]?.let { session ->
            receiveNeuralNetworkUpdates(session)
        } ?: run {
            sendServerEvent(ServerEvent.ClientError("No session with id $sessionId."))
        }
    } else {
        // ... if sessionId collides, ask user to confirm override
        println("Asking client to confirm")
        sendServerEvent(ServerEvent.AskSetModel)
    }
}

internal val webSocketsSerializersModule =
    SerializersModule {
        polymorphic(ClientEvent::class) {
            subclass(ClientEvent.NewModel::class)
            subclass(ClientEvent.Continue::class)
        }
        polymorphic(ServerEvent::class) {
            subclass(ServerEvent.Update::class)
            subclass(ServerEvent.AskSetModel::class)
            subclass(ServerEvent.Complete::class)
            subclass(ServerEvent.ClientError::class)
        }
    }

val json = Json { serializersModule = webSocketsSerializersModule }
