package com.example.ui.game2d

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.data.ScoreRepository
import com.example.game.audio.RacingAudio
import com.example.game.engine2d.Car2D
import com.example.game.engine2d.Simulation2D
import com.example.game.model.Circuit
import com.example.game.model.RacingTeam
import com.example.game.model.TyreCompound
import com.example.ui.components.*
import com.example.ui.theme.*
import kotlinx.coroutines.isActive
import kotlin.math.*

@Composable
fun Game2DScreen(
    circuit: Circuit,
    team: RacingTeam,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scoreRepo = remember { ScoreRepository(context) }
    val audio = remember { RacingAudio(context) }

    var simulation by remember { mutableStateOf(Simulation2D(circuit, team, totalLaps = 3)) }
    var isStarted by remember { mutableStateOf(false) }
    var isPaused by remember { mutableStateOf(false) }
    var showPitDialog by remember { mutableStateOf(false) }
    var showPodiumDialog by remember { mutableStateOf(false) }
    var isMuted by remember { mutableStateOf(false) }

    var frameTick by remember { mutableLongStateOf(0L) }

    BackHandler {
        if (!isPaused && !showPodiumDialog) {
            isPaused = true
        } else {
            onNavigateBack()
        }
    }

    // Audio lifecycle
    DisposableEffect(Unit) {
        audio.startEngineSound()
        onDispose {
            audio.stopEngineSound()
        }
    }

    // Main 60 FPS Game Loop
    LaunchedEffect(isStarted, isPaused, showPodiumDialog) {
        if (!isStarted || isPaused || showPodiumDialog) return@LaunchedEffect

        var lastNanos = System.nanoTime()
        while (isActive) {
            withFrameNanos { now ->
                val dt = ((now - lastNanos) / 1_000_000_000f).coerceIn(0.005f, 0.05f)
                lastNanos = now

                simulation.update(dt)
                frameTick = now

                // Audio updates
                val player = simulation.playerCar
                audio.currentRpmRatio = (player.speedKmh / player.team.topSpeedKmh).coerceIn(0.1f, 1.0f)
                audio.isTireSkidding = player.isDrifting

                // Vibrate on grass
                if (player.inGrass && player.speedKmh > 50f) {
                    audio.vibrateRumble()
                }

                // Check finish
                if (player.finished && !showPodiumDialog) {
                    showPodiumDialog = true
                    val standings = simulation.getStandings()
                    val playerPos = standings.indexOfFirst { it.isPlayer } + 1
                    scoreRepo.saveRaceResult(
                        circuit = circuit,
                        modeTag = "2D",
                        bestLapMs = player.bestLapTimeMs,
                        topSpeedKmh = player.speedKmh,
                        teamName = team.teamName,
                        wonRace = playerPos == 1
                    )
                }
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF192A1A)) // Lush Grass field base
            .testTag("game_2d_screen")
    ) {
        val player = simulation.playerCar

        // Render Canvas for 2D racetrack and cars
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasW = size.width
            val canvasH = size.height

            // Camera follows player car smoothly
            val camX = player.x - canvasW / 2f
            val camY = player.y - canvasH / 2f

            // Draw Track Asphalt & Kerbs
            drawTrack(simulation, camX, camY)

            // Draw Skid marks
            for (skid in simulation.skidMarks) {
                drawLine(
                    color = Color.Black.copy(alpha = skid.alpha * 0.6f),
                    start = Offset(skid.start.x - camX, skid.start.y - camY),
                    end = Offset(skid.end.x - camX, skid.end.y - camY),
                    strokeWidth = 6f,
                    cap = StrokeCap.Round
                )
            }

            // Draw All Cars (AI rivals + player)
            for (car in simulation.cars) {
                drawF1Car(car, camX, camY)
            }

            // Draw Mini-map Radar in top-right
            drawMiniMap(simulation, canvasW, canvasH)
        }

        // HUD Overlay (Speed, Lap, Position, Rev lights)
        val standings = remember(frameTick) { simulation.getStandings() }
        val playerPos = standings.indexOfFirst { it.isPlayer } + 1

        RacingHud(
            speedKmh = player.speedKmh,
            currentLap = player.currentLap.coerceAtMost(3),
            totalLaps = 3,
            position = if (playerPos > 0) playerPos else 1,
            lapTimeMs = player.currentLapTimeMs,
            bestLapTimeMs = player.bestLapTimeMs,
            tireHealth = player.tireHealth,
            tireCompound = player.tireCompound,
            onPauseClick = { isPaused = true },
            modifier = Modifier.align(Alignment.TopCenter)
        )

        // Starting Lights Countdown at beginning
        if (!isStarted) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f)),
                contentAlignment = Alignment.Center
            ) {
                StartLightsSequence(
                    audio = audio,
                    onLightsOut = { isStarted = true }
                )
            }
        }

        // On-screen Controls (Steering paddles, Throttle, Brake, ERS Boost)
        if (isStarted && !showPodiumDialog) {
            RacingControls(
                onSteerChange = { player.steerAngle = it },
                onThrottleChange = { player.throttle = it },
                onBrakeChange = { player.brake = it },
                onErsBoostToggle = {
                    player.ersActive = !player.ersActive
                    if (player.ersActive) audio.playGearShiftPop()
                },
                ersBattery = player.ersBattery,
                isErsActive = player.ersActive,
                isDrsAvailable = player.drsActive,
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }

        // Modals: Podium, Pit Stop, Pause
        if (showPodiumDialog) {
            val finalPos = standings.indexOfFirst { it.isPlayer } + 1
            PodiumDialog(
                position = if (finalPos > 0) finalPos else 1,
                totalTimeMs = player.totalTimeMs,
                bestLapMs = player.bestLapTimeMs,
                topSpeedKmh = player.speedKmh,
                circuitName = circuit.displayName,
                onRestart = {
                    simulation = Simulation2D(circuit, team, totalLaps = 3)
                    isStarted = false
                    showPodiumDialog = false
                },
                onReturnToHub = onNavigateBack
            )
        }

        if (isPaused) {
            PauseMenuDialog(
                onResume = { isPaused = false },
                onRestart = {
                    simulation = Simulation2D(circuit, team, totalLaps = 3)
                    isStarted = false
                    isPaused = false
                },
                onQuit = onNavigateBack,
                isMuted = isMuted,
                onToggleMute = {
                    isMuted = !isMuted
                    audio.isMuted = isMuted
                }
            )
        }

        if (showPitDialog) {
            PitStopDialog(
                currentCompound = player.tireCompound,
                onSelectCompound = {
                    player.tireCompound = it
                    player.tireHealth = 1.0f
                    showPitDialog = false
                },
                onClose = { showPitDialog = false }
            )
        }
    }
}

// Drawing helper for 2D racetrack
private fun DrawScope.drawTrack(simulation: Simulation2D, camX: Float, camY: Float) {
    val waypoints = simulation.waypoints
    if (waypoints.size < 2) return

    val asphaltPaint = Path()
    val startWp = waypoints.first()
    asphaltPaint.moveTo(startWp.x - camX, startWp.y - camY)

    for (i in 1 until waypoints.size) {
        val wp = waypoints[i]
        asphaltPaint.lineTo(wp.x - camX, wp.y - camY)
    }
    asphaltPaint.close()

    // Kerbs (red and white alternating border)
    drawPath(
        path = asphaltPaint,
        color = Color(0xFFD32F2F),
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 170f, cap = StrokeCap.Round, join = StrokeJoin.Round)
    )
    drawPath(
        path = asphaltPaint,
        color = Color(0xFFFFFFFF),
        style = androidx.compose.ui.graphics.drawscope.Stroke(
            width = 170f,
            cap = StrokeCap.Round,
            join = StrokeJoin.Round,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(30f, 30f), 0f)
        )
    )

    // Main Asphalt surface
    drawPath(
        path = asphaltPaint,
        color = Color(0xFF262A30),
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 140f, cap = StrokeCap.Round, join = StrokeJoin.Round)
    )

    // Track centerline dashed guide
    drawPath(
        path = asphaltPaint,
        color = Color(0x33FFFFFF),
        style = androidx.compose.ui.graphics.drawscope.Stroke(
            width = 3f,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(25f, 25f), 0f)
        )
    )

    // Checkered Start/Finish line
    val p1 = waypoints.first()
    val p2 = waypoints[1]
    val angle = atan2(p2.y - p1.y, p2.x - p1.x)
    val normAngle = angle + (Math.PI / 2.0).toFloat()
    val halfW = 70f
    val sx1 = p1.x - camX + cos(normAngle) * halfW
    val sy1 = p1.y - camY + sin(normAngle) * halfW
    val sx2 = p1.x - camX - cos(normAngle) * halfW
    val sy2 = p1.y - camY - sin(normAngle) * halfW

    drawLine(
        color = Color.White,
        start = Offset(sx1, sy1),
        end = Offset(sx2, sy2),
        strokeWidth = 14f,
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 14f), 0f)
    )
}

// Drawing helper for Formula 1 Car (top-down 2D)
private fun DrawScope.drawF1Car(car: Car2D, camX: Float, camY: Float) {
    val screenX = car.x - camX
    val screenY = car.y - camY

    val degrees = Math.toDegrees(car.angle.toDouble()).toFloat()

    rotate(degrees = degrees, pivot = Offset(screenX, screenY)) {
        // Car chassis dimensions
        val length = 46f
        val width = 24f

        // Front Wing (Wide aerodynamic profile)
        drawRoundRect(
            color = car.team.primaryColor,
            topLeft = Offset(screenX + length * 0.35f, screenY - width * 0.58f),
            size = Size(8f, width * 1.16f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )

        // Rear Wing
        drawRoundRect(
            color = if (car.drsActive) F1Green else car.team.primaryColor,
            topLeft = Offset(screenX - length * 0.48f, screenY - width * 0.52f),
            size = Size(7f, width * 1.04f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )

        // 4 Wide Racing Tyres (Pirelli style)
        val tyreW = 12f
        val tyreH = 6f
        val tyreColor = Color(0xFF151515)
        // Front Left & Right
        drawRoundRect(
            color = tyreColor,
            topLeft = Offset(screenX + length * 0.22f, screenY - width * 0.62f),
            size = Size(tyreW, tyreH),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )
        drawRoundRect(
            color = tyreColor,
            topLeft = Offset(screenX + length * 0.22f, screenY + width * 0.62f - tyreH),
            size = Size(tyreW, tyreH),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )
        // Rear Left & Right
        drawRoundRect(
            color = tyreColor,
            topLeft = Offset(screenX - length * 0.36f, screenY - width * 0.64f),
            size = Size(tyreW + 2f, tyreH + 1f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )
        drawRoundRect(
            color = tyreColor,
            topLeft = Offset(screenX - length * 0.36f, screenY + width * 0.64f - tyreH - 1f),
            size = Size(tyreW + 2f, tyreH + 1f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )

        // Main Sleek Body (Tapered nosecone and sidepods)
        val bodyPath = Path().apply {
            moveTo(screenX + length * 0.44f, screenY) // Nose tip
            lineTo(screenX + length * 0.15f, screenY - width * 0.22f)
            lineTo(screenX - length * 0.12f, screenY - width * 0.38f) // Sidepod left
            lineTo(screenX - length * 0.42f, screenY - width * 0.30f)
            lineTo(screenX - length * 0.42f, screenY + width * 0.30f)
            lineTo(screenX - length * 0.12f, screenY + width * 0.38f) // Sidepod right
            lineTo(screenX + length * 0.15f, screenY + width * 0.22f)
            close()
        }
        drawPath(bodyPath, color = car.team.primaryColor)

        // Secondary livery accent stripe
        drawRoundRect(
            color = car.team.accentColor,
            topLeft = Offset(screenX - length * 0.15f, screenY - 2.5f),
            size = Size(length * 0.45f, 5f)
        )

        // Cockpit & Halo
        drawCircle(
            color = Color(0xFF101010),
            radius = 5.5f,
            center = Offset(screenX - 2f, screenY)
        )
        // Driver Helmet
        drawCircle(
            color = if (car.isPlayer) F1Gold else Color.White,
            radius = 3.5f,
            center = Offset(screenX - 2f, screenY)
        )

        // ERS Flame / Exhaust Particle Glow
        if (car.ersActive) {
            drawCircle(
                color = F1Cyan.copy(alpha = 0.8f),
                radius = 7f,
                center = Offset(screenX - length * 0.52f, screenY)
            )
        }
    }
}

// Mini-map radar component on top-right
private fun DrawScope.drawMiniMap(simulation: Simulation2D, screenW: Float, screenH: Float) {
    val mapSize = 130f
    val padding = 16f
    val mapLeft = screenW - mapSize - padding
    val mapTop = 64f

    // Radar background panel
    drawRoundRect(
        color = Color(0xCC101418),
        topLeft = Offset(mapLeft, mapTop),
        size = Size(mapSize, mapSize),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(10f, 10f)
    )

    // Calculate bounds of circuit waypoints
    val wps = simulation.waypoints
    var minX = Float.MAX_VALUE; var maxX = Float.MIN_VALUE
    var minY = Float.MAX_VALUE; var maxY = Float.MIN_VALUE
    for (wp in wps) {
        if (wp.x < minX) minX = wp.x
        if (wp.x > maxX) maxX = wp.x
        if (wp.y < minY) minY = wp.y
        if (wp.y > maxY) maxY = wp.y
    }
    val spanX = (maxX - minX).coerceAtLeast(1f)
    val spanY = (maxY - minY).coerceAtLeast(1f)

    // Draw track path on mini-map
    val miniPath = Path()
    for (i in wps.indices) {
        val wp = wps[i]
        val mx = mapLeft + 12f + ((wp.x - minX) / spanX) * (mapSize - 24f)
        val my = mapTop + 12f + ((wp.y - minY) / spanY) * (mapSize - 24f)
        if (i == 0) miniPath.moveTo(mx, my) else miniPath.lineTo(mx, my)
    }
    miniPath.close()

    drawPath(
        path = miniPath,
        color = Color(0x66FFFFFF),
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f)
    )

    // Draw cars as radar blips
    for (car in simulation.cars) {
        val cx = mapLeft + 12f + ((car.x - minX) / spanX) * (mapSize - 24f)
        val cy = mapTop + 12f + ((car.y - minY) / spanY) * (mapSize - 24f)
        drawCircle(
            color = if (car.isPlayer) F1Cyan else F1Red,
            radius = if (car.isPlayer) 4f else 2.5f,
            center = Offset(cx, cy)
        )
    }
}
