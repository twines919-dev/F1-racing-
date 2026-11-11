package com.example.ui.game3d

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ScoreRepository
import com.example.game.audio.RacingAudio
import com.example.game.engine3d.Engine3D
import com.example.game.engine3d.RoadSegment
import com.example.game.engine3d.RoadSpriteType
import com.example.game.model.Circuit
import com.example.game.model.RacingTeam
import com.example.game.model.TyreCompound
import com.example.game.model.WeatherCondition
import com.example.ui.components.*
import com.example.ui.theme.*
import kotlinx.coroutines.isActive
import kotlin.math.*

@Composable
fun Game3DScreen(
    circuit: Circuit,
    team: RacingTeam,
    weather: WeatherCondition,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scoreRepo = remember { ScoreRepository(context) }
    val audio = remember { RacingAudio(context) }

    var engine by remember { mutableStateOf(Engine3D(circuit, team, weather)) }
    var isStarted by remember { mutableStateOf(false) }
    var isPaused by remember { mutableStateOf(false) }
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

    DisposableEffect(Unit) {
        audio.startEngineSound()
        onDispose {
            audio.stopEngineSound()
        }
    }

    // 60 FPS Game Loop
    LaunchedEffect(isStarted, isPaused, showPodiumDialog) {
        if (!isStarted || isPaused || showPodiumDialog) return@LaunchedEffect

        var lastNanos = System.nanoTime()
        while (isActive) {
            withFrameNanos { now ->
                val dt = ((now - lastNanos) / 1_000_000_000f).coerceIn(0.005f, 0.05f)
                lastNanos = now

                engine.update(dt)
                frameTick = now

                // Audio
                audio.currentRpmRatio = (engine.speed / engine.playerTeam.topSpeedKmh).coerceIn(0.1f, 1.0f)
                audio.isTireSkidding = abs(engine.steerInput) > 0.7f && engine.speed > 210f

                // Rumble on kerbs
                if (abs(engine.playerX) in 0.95f..1.4f && engine.speed > 60f) {
                    audio.vibrateRumble()
                }

                // Check finish
                if (engine.finished && !showPodiumDialog) {
                    showPodiumDialog = true
                    scoreRepo.saveRaceResult(
                        circuit = circuit,
                        modeTag = "3D",
                        bestLapMs = engine.raceFinishedTimeMs,
                        topSpeedKmh = engine.topSpeedReachedKmh,
                        teamName = team.teamName,
                        wonRace = true
                    )
                }
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .testTag("game_3d_screen")
    ) {
        // Pseudo-3D Perspective Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasW = size.width
            val canvasH = size.height

            // 1. Draw Horizon & Sky
            drawSkyAndMountains(weather, engine.playerX)

            // 2. Draw 3D Projected Road
            draw3DRoad(engine, canvasW, canvasH)

            // 3. Draw 3D AI Rival Cars
            draw3DRivals(engine, canvasW, canvasH)

            // 4. Draw Player 3D Cockpit / F1 Chase Car
            drawPlayerF1Car3D(engine, canvasW, canvasH)

            // 5. Draw Rain Effect if Wet Weather
            if (weather == WeatherCondition.WET) {
                drawRainStorm(engine)
            }
        }

        // HUD Overlay
        RacingHud(
            speedKmh = engine.speed,
            currentLap = if (engine.playerZ > engine.trackLength) 2 else 1,
            totalLaps = 2,
            position = 1,
            lapTimeMs = engine.raceTimeMs,
            bestLapTimeMs = scoreRepo.getBestLapTimeMs(circuit.id),
            tireHealth = (1.0f - (engine.totalDistanceMeters / 15000f)).coerceIn(0.2f, 1.0f),
            tireCompound = TyreCompound.SOFT,
            onPauseClick = { isPaused = true },
            modifier = Modifier.align(Alignment.TopCenter)
        )

        // Slipstream Drafting Notification Banner
        if (engine.isDrafting) {
            Surface(
                color = F1Cyan,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 96.dp)
                    .testTag("drafting_indicator")
            ) {
                Row(modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)) {
                    Text(
                        text = "⚡ SLIPSTREAM DRAFT! +25 KM/H",
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        letterSpacing = 1.sp
                    )
                }
            }
        }

        // Start Lights Sequence
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

        // Touch Controls
        if (isStarted && !showPodiumDialog) {
            RacingControls(
                onSteerChange = { engine.steerInput = it },
                onThrottleChange = { engine.throttleInput = it },
                onBrakeChange = { engine.brakeInput = it },
                onErsBoostToggle = {
                    engine.drsActive = !engine.drsActive
                    if (engine.drsActive) audio.playGearShiftPop()
                },
                ersBattery = 1.0f,
                isErsActive = engine.drsActive,
                isDrsAvailable = true,
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }

        // Dialogs
        if (showPodiumDialog) {
            PodiumDialog(
                position = 1,
                totalTimeMs = engine.raceFinishedTimeMs,
                bestLapMs = engine.raceFinishedTimeMs,
                topSpeedKmh = engine.topSpeedReachedKmh,
                circuitName = "${circuit.displayName} 3D Run",
                onRestart = {
                    engine = Engine3D(circuit, team, weather)
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
                    engine = Engine3D(circuit, team, weather)
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
    }
}

// 1. Draw Sky, Mountains, and Horizon
private fun DrawScope.drawSkyAndMountains(weather: WeatherCondition, playerX: Float) {
    val horizonY = size.height * 0.44f

    // Sky gradient
    val skyBrush = when (weather) {
        WeatherCondition.SUNNY -> Brush.verticalGradient(
            colors = listOf(Color(0xFF0D47A1), Color(0xFF42A5F5), Color(0xFFBBDEFB)),
            startY = 0f,
            endY = horizonY
        )
        WeatherCondition.SUNSET -> Brush.verticalGradient(
            colors = listOf(Color(0xFF4A148C), Color(0xFFD81B60), Color(0xFFFF9800)),
            startY = 0f,
            endY = horizonY
        )
        WeatherCondition.WET -> Brush.verticalGradient(
            colors = listOf(Color(0xFF212121), Color(0xFF424242), Color(0xFF616161)),
            startY = 0f,
            endY = horizonY
        )
    }
    drawRect(brush = skyBrush, topLeft = Offset(0f, 0f), size = Size(size.width, horizonY))

    // Parallax Mountain silhouettes
    val mountainOffsetX = (playerX * 120f)
    val mountainPath = Path().apply {
        moveTo(-100f, horizonY)
        val numPeaks = 8
        val peakWidth = size.width / (numPeaks - 1)
        for (i in 0..numPeaks) {
            val px = i * peakWidth - mountainOffsetX
            val py = horizonY - 40f - (sin(i.toDouble() * 1.5) * 50f).toFloat()
            lineTo(px, py)
        }
        lineTo(size.width + 100f, horizonY)
        close()
    }
    drawPath(mountainPath, color = Color(0xFF1B2430))
}

// 2. Draw 3D Projected Road Segments
private fun DrawScope.draw3DRoad(engine: Engine3D, screenW: Float, screenH: Float) {
    val horizonY = screenH * 0.44f
    val cameraY = engine.cameraHeight
    val cameraZ = engine.playerZ
    val cameraX = engine.playerX * engine.roadWidth
    val drawDistance = 240 // number of segments ahead to render

    val baseSegmentIndex = ((cameraZ / engine.segmentLength) % engine.segments.size).toInt()

    var maxScreenY = screenH // for depth culling

    // Projection cache
    class ProjectedPoint(var x: Float, var y: Float, var w: Float, var scale: Float)
    val points = mutableListOf<ProjectedPoint>()

    var curveAccum = 0f
    for (n in 0 until drawDistance) {
        val segIndex = (baseSegmentIndex + n) % engine.segments.size
        val seg = engine.segments[segIndex]

        val segmentZ = (baseSegmentIndex + n) * engine.segmentLength
        val relZ = segmentZ - cameraZ

        if (relZ <= 10f) {
            points.add(ProjectedPoint(0f, 0f, 0f, 0f))
            continue
        }

        curveAccum += seg.curve * 0.8f
        val scale = engine.cameraDepth / relZ
        val projX = (screenW / 2f) + (scale * (seg.worldX + curveAccum * 100f - cameraX) * (screenW / 2f))
        val projY = horizonY - (scale * (seg.worldY - cameraY) * (screenH / 2f))
        val projW = scale * engine.roadWidth * (screenW / 2f)

        points.add(ProjectedPoint(projX, projY, projW, scale))
    }

    // Render road trapezoids from near to far
    for (n in 1 until points.size) {
        val p1 = points[n - 1]
        val p2 = points[n]

        if (p1.scale <= 0f || p2.scale <= 0f) continue
        if (p2.y >= p1.y || p2.y > screenH || p1.y < horizonY) continue

        val segIndex = (baseSegmentIndex + n) % engine.segments.size
        val isEven = (segIndex / 4) % 2 == 0

        // Colors
        val grassColor = if (isEven) Color(0xFF1E5E22) else Color(0xFF184D1B)
        val rumbleColor = if (isEven) Color(0xFFD32F2F) else Color(0xFFFAFAFA)
        val roadColor = if (isEven) Color(0xFF282C34) else Color(0xFF21252B)
        val laneColor = Color(0x66FFFFFF)

        // Draw Grass Background for slice
        drawRect(
            color = grassColor,
            topLeft = Offset(0f, p2.y),
            size = Size(screenW, (p1.y - p2.y).coerceAtLeast(1f))
        )

        // Draw Kerb / Rumble strip trapezoid
        val kerbW1 = p1.w * 1.18f
        val kerbW2 = p2.w * 1.18f
        val rumblePath = Path().apply {
            moveTo(p1.x - kerbW1, p1.y)
            lineTo(p2.x - kerbW2, p2.y)
            lineTo(p2.x + kerbW2, p2.y)
            lineTo(p1.x + kerbW1, p1.y)
            close()
        }
        drawPath(rumblePath, color = rumbleColor)

        // Draw Asphalt road trapezoid
        val roadPath = Path().apply {
            moveTo(p1.x - p1.w, p1.y)
            lineTo(p2.x - p2.w, p2.y)
            lineTo(p2.x + p2.w, p2.y)
            lineTo(p1.x + p1.w, p1.y)
            close()
        }
        drawPath(roadPath, color = roadColor)

        // Center dashed lane line
        if (isEven) {
            val laneW1 = p1.w * 0.04f
            val laneW2 = p2.w * 0.04f
            val lanePath = Path().apply {
                moveTo(p1.x - laneW1, p1.y)
                lineTo(p2.x - laneW2, p2.y)
                lineTo(p2.x + laneW2, p2.y)
                lineTo(p1.x + laneW1, p1.y)
                close()
            }
            drawPath(lanePath, color = laneColor)
        }

        // Roadside sprite billboards & grandstands
        val seg = engine.segments[segIndex]
        if (seg.sprite != null && n > 8 && n < 180) {
            drawRoadSprite(seg.sprite!!, p2.x + p2.w * seg.spriteOffset, p2.y, p2.scale * 1200f)
        }
    }
}

// 3. Draw AI Rival Cars in 3D Perspective
private fun DrawScope.draw3DRivals(engine: Engine3D, screenW: Float, screenH: Float) {
    val horizonY = screenH * 0.44f
    val cameraZ = engine.playerZ
    val cameraX = engine.playerX * engine.roadWidth

    for (rival in engine.rivals) {
        val relZ = rival.z - cameraZ
        if (relZ in 80f..3800f) {
            val scale = engine.cameraDepth / relZ
            val rivalWorldX = rival.x * engine.roadWidth
            val rx = (screenW / 2f) + (scale * (rivalWorldX - cameraX) * (screenW / 2f))
            val ry = horizonY - (scale * (0f - engine.cameraHeight) * (screenH / 2f))

            val carW = scale * 1800f
            val carH = carW * 0.55f

            // Car body
            drawRoundRect(
                color = rival.team.primaryColor,
                topLeft = Offset(rx - carW / 2f, ry - carH),
                size = Size(carW, carH * 0.7f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
            )
            // Rear Wing
            drawRoundRect(
                color = rival.team.accentColor,
                topLeft = Offset(rx - carW * 0.55f, ry - carH * 1.15f),
                size = Size(carW * 1.1f, carH * 0.25f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
            )
            // Rear Tyres
            val tyreW = carW * 0.24f
            val tyreH = carH * 0.45f
            drawRoundRect(
                color = Color(0xFF111111),
                topLeft = Offset(rx - carW * 0.65f, ry - tyreH),
                size = Size(tyreW, tyreH),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f)
            )
            drawRoundRect(
                color = Color(0xFF111111),
                topLeft = Offset(rx + carW * 0.41f, ry - tyreH),
                size = Size(tyreW, tyreH),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f)
            )
            // Red FIA Rain/Safety LED blinking
            drawCircle(
                color = F1Red,
                radius = (carW * 0.08f).coerceAtLeast(2f),
                center = Offset(rx, ry - carH * 0.45f)
            )
        }
    }
}

// 4. Draw Player F1 Car in Cockpit / Chase Perspective
private fun DrawScope.drawPlayerF1Car3D(engine: Engine3D, screenW: Float, screenH: Float) {
    val carCenterX = screenW / 2f + (engine.steerInput * 16f)
    val carBottomY = screenH - 24.dp.toPx()
    val carWidth = 220f
    val carHeight = 110f

    val tilt = engine.steerInput * 12f // degrees tilt into turns

    // Titanium Sparks bottoming out
    for (spark in engine.sparkParticles) {
        drawCircle(
            color = Color(0xFFFFD54F).copy(alpha = (spark.life / 0.5f).coerceIn(0f, 1f)),
            radius = 3.5f,
            center = Offset(carCenterX + spark.x, carBottomY - 10f + spark.y)
        )
    }

    // Rear diffuser & floor
    drawRoundRect(
        color = Color(0xFF121212),
        topLeft = Offset(carCenterX - carWidth * 0.42f, carBottomY - carHeight * 0.35f),
        size = Size(carWidth * 0.84f, carHeight * 0.35f),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(8f, 8f)
    )

    // Wide Rear Pirelli Tyres (Left & Right)
    val tyreW = 54f
    val tyreH = 75f
    drawRoundRect(
        color = Color(0xFF1A1A1A),
        topLeft = Offset(carCenterX - carWidth * 0.58f, carBottomY - tyreH),
        size = Size(tyreW, tyreH),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f)
    )
    drawRoundRect(
        color = Color(0xFF1A1A1A),
        topLeft = Offset(carCenterX + carWidth * 0.58f - tyreW, carBottomY - tyreH),
        size = Size(tyreW, tyreH),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f)
    )

    // Main Engine Cover & Sidepods
    val bodyPath = Path().apply {
        moveTo(carCenterX, carBottomY - carHeight * 1.05f) // Camera intake pod
        lineTo(carCenterX - carWidth * 0.38f, carBottomY - carHeight * 0.35f)
        lineTo(carCenterX - carWidth * 0.38f, carBottomY)
        lineTo(carCenterX + carWidth * 0.38f, carBottomY)
        lineTo(carCenterX + carWidth * 0.38f, carBottomY - carHeight * 0.35f)
        close()
    }
    drawPath(bodyPath, color = engine.playerTeam.primaryColor)

    // Rear Wing & DRS Flap
    val wingW = carWidth * 1.08f
    val wingH = 22f
    val wingTopY = carBottomY - carHeight * 1.15f
    drawRoundRect(
        color = engine.playerTeam.accentColor,
        topLeft = Offset(carCenterX - wingW / 2f, wingTopY),
        size = Size(wingW, wingH),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
    )
    if (engine.drsActive) {
        // DRS Wing flap opened
        drawRoundRect(
            color = F1Green,
            topLeft = Offset(carCenterX - wingW * 0.45f, wingTopY - 14f),
            size = Size(wingW * 0.9f, 8f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )
    }

    // Driver Helmet & Halo
    drawCircle(
        color = Color(0xFF1A1A1A),
        radius = 24f,
        center = Offset(carCenterX, carBottomY - carHeight * 0.72f)
    )
    drawCircle(
        color = F1Gold,
        radius = 16f,
        center = Offset(carCenterX, carBottomY - carHeight * 0.72f)
    )
}

// 5. Draw Rain Drops
private fun DrawScope.drawRainStorm(engine: Engine3D) {
    for (drop in engine.rainDroplets) {
        drawLine(
            color = Color(0x88CFD8DC),
            start = Offset(drop.x, drop.y),
            end = Offset(drop.x - 4f, drop.y + drop.length),
            strokeWidth = 2f
        )
    }
}

// Helper: Roadside billboards, trees, grandstands
private fun DrawScope.drawRoadSprite(type: RoadSpriteType, x: Float, y: Float, scaleSize: Float) {
    val w = scaleSize.coerceIn(12f, 220f)
    val h = w * 0.75f

    when (type) {
        RoadSpriteType.GRANDSTAND -> {
            drawRoundRect(
                color = Color(0xFF455A64),
                topLeft = Offset(x - w / 2f, y - h),
                size = Size(w, h),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
            )
            // Cheering crowd tier lines
            drawLine(color = F1Red, start = Offset(x - w / 2f, y - h * 0.7f), end = Offset(x + w / 2f, y - h * 0.7f), strokeWidth = 3f)
            drawLine(color = F1Gold, start = Offset(x - w / 2f, y - h * 0.4f), end = Offset(x + w / 2f, y - h * 0.4f), strokeWidth = 3f)
        }
        RoadSpriteType.PALM_TREE, RoadSpriteType.PINE_TREE -> {
            // Trunk
            drawLine(color = Color(0xFF5D4037), start = Offset(x, y), end = Offset(x, y - h), strokeWidth = (w * 0.15f).coerceAtLeast(3f))
            // Foliage
            drawCircle(color = Color(0xFF2E7D32), radius = w * 0.45f, center = Offset(x, y - h))
        }
        RoadSpriteType.SPONSOR_BANNER, RoadSpriteType.DISTANCE_BOARD_200 -> {
            drawRoundRect(
                color = F1Red,
                topLeft = Offset(x - w / 2f, y - h * 0.6f),
                size = Size(w, h * 0.6f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f)
            )
            drawRoundRect(
                color = Color.White,
                topLeft = Offset(x - w * 0.45f, y - h * 0.5f),
                size = Size(w * 0.9f, h * 0.4f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
            )
        }
        else -> {}
    }
}
