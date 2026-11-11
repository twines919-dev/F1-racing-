package com.example.game.engine3d

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import com.example.game.model.Circuit
import com.example.game.model.RacingTeam
import com.example.game.model.WeatherCondition
import kotlin.math.*

data class RoadSegment(
    val index: Int,
    var worldX: Float = 0f,
    var worldY: Float = 0f, // elevation/hills
    var worldZ: Float = 0f,
    var curve: Float = 0f,
    var sprite: RoadSpriteType? = null,
    var spriteOffset: Float = 0f // -1.5 (far left) to 1.5 (far right)
)

enum class RoadSpriteType {
    DISTANCE_BOARD_300,
    DISTANCE_BOARD_200,
    DISTANCE_BOARD_100,
    GRANDSTAND,
    PALM_TREE,
    PINE_TREE,
    SPONSOR_BANNER,
    PIT_WALL
}

class RivalCar3D(
    var z: Float,
    var x: Float, // -0.8 (left) to 0.8 (right)
    var speed: Float, // world units per sec
    val team: RacingTeam
)

class Engine3D(
    val circuit: Circuit,
    val playerTeam: RacingTeam,
    val weather: WeatherCondition = WeatherCondition.SUNNY
) {
    val segmentLength = 200f
    val trackLength: Float
    val segments: List<RoadSegment>

    var cameraHeight = 1100f
    var cameraDepth = 0.84f
    var roadWidth = 2200f

    var playerZ = 0f
    var playerX = 0f // -1.0 to 1.0 (0 is road center)
    var speed = 0f   // km/h (0 to 350)
    var steerInput = 0f // -1 to 1
    var throttleInput = 0f
    var brakeInput = 0f
    var drsActive = false
    var isDrafting = false
    var draftMultiplier = 1.0f

    var totalDistanceMeters = 0f
    var raceTimeMs = 0L
    var topSpeedReachedKmh = 0f
    var finished = false
    var raceFinishedTimeMs = 0L

    val rivals = mutableListOf<RivalCar3D>()
    val sparkParticles = mutableListOf<Spark>()
    val rainDroplets = mutableListOf<RainDrop>()

    data class Spark(var x: Float, var y: Float, var vx: Float, var vy: Float, var life: Float)
    data class RainDrop(var x: Float, var y: Float, var speed: Float, var length: Float)

    init {
        // Build road geometry with sweeping curves and undulating hills
        val segmentCount = 900
        trackLength = segmentCount * segmentLength
        val segList = mutableListOf<RoadSegment>()

        for (i in 0 until segmentCount) {
            val seg = RoadSegment(
                index = i,
                worldZ = i * segmentLength
            )

            // Curves based on circuit layout
            val t = i.toFloat() / segmentCount
            when (circuit) {
                Circuit.MONZA -> {
                    // Long straights with sharp chicanes
                    if (i in 120..160) seg.curve = 3.5f // Curva Grande
                    else if (i in 220..240) seg.curve = -5.0f // Roggia chicane
                    else if (i in 340..390) seg.curve = 2.8f // Lesmo
                    else if (i in 520..560) seg.curve = -4.5f // Ascari
                    else if (i in 750..820) seg.curve = 4.2f // Parabolica
                    else seg.curve = 0f
                }
                Circuit.MONACO -> {
                    // Many twisting corners
                    seg.curve = sin(t * Math.PI.toFloat() * 12f) * 4.5f
                    seg.worldY = sin(t * Math.PI.toFloat() * 6f) * 800f
                }
                Circuit.SPA -> {
                    // Famous Eau Rouge elevation climb and descent
                    seg.worldY = if (i in 100..250) {
                        sin((i - 100) / 150f * Math.PI.toFloat()) * 1800f // Eau Rouge hill
                    } else if (i in 500..650) {
                        -cos((i - 500) / 150f * Math.PI.toFloat()) * 900f
                    } else {
                        0f
                    }
                    seg.curve = sin(t * Math.PI.toFloat() * 8f) * 3.8f
                }
                Circuit.SILVERSTONE -> {
                    seg.curve = cos(t * Math.PI.toFloat() * 10f) * 3.6f
                    seg.worldY = sin(t * Math.PI.toFloat() * 4f) * 400f
                }
            }

            // Decorate roadside scenery
            if (i % 60 == 0) {
                seg.sprite = RoadSpriteType.SPONSOR_BANNER
                seg.spriteOffset = -1.4f
            } else if (i % 45 == 10) {
                seg.sprite = RoadSpriteType.GRANDSTAND
                seg.spriteOffset = 1.45f
            } else if (i % 30 == 5) {
                seg.sprite = if (circuit == Circuit.MONACO) RoadSpriteType.PALM_TREE else RoadSpriteType.PINE_TREE
                seg.spriteOffset = if (i % 2 == 0) -1.35f else 1.35f
            } else if (i in listOf(100, 200, 300, 500, 700)) {
                seg.sprite = RoadSpriteType.DISTANCE_BOARD_200
                seg.spriteOffset = 1.25f
            }

            segList.add(seg)
        }
        segments = segList

        // Spawn AI rival cars ahead
        val rivalTeams = RacingTeam.entries.toList()
        for (idx in 0 until 12) {
            val team = rivalTeams[idx % rivalTeams.size]
            rivals.add(
                RivalCar3D(
                    z = 2500f + idx * 1100f,
                    x = ((idx % 3) - 1) * 0.45f,
                    speed = (220f + (idx % 4) * 22f),
                    team = team
                )
            )
        }

        // Init rain drops if wet
        if (weather == WeatherCondition.WET) {
            for (i in 0..70) {
                rainDroplets.add(
                    RainDrop(
                        x = (Math.random() * 1080).toFloat(),
                        y = (Math.random() * 1920).toFloat(),
                        speed = (900f + Math.random() * 800f).toFloat(),
                        length = (24f + Math.random() * 32f).toFloat()
                    )
                )
            }
        }
    }

    fun update(dtSeconds: Float) {
        val dt = dtSeconds.coerceIn(0.001f, 0.05f)
        if (finished) return

        raceTimeMs += (dt * 1000f).toLong()

        // Current road segment under player
        val currentSegIndex = ((playerZ / segmentLength) % segments.size).toInt()
        val currentSeg = segments[currentSegIndex]

        // Centrifugal force pushing car outward on turns
        val centrifugalForce = (speed / 300f) * currentSeg.curve * 1.8f * dt
        playerX -= centrifugalForce

        // Player steering
        val grip = weather.trackGripMultiplier * (if (abs(playerX) > 1.0f) 0.5f else 1.0f)
        playerX += (steerInput * 2.2f * grip * dt)
        playerX = playerX.coerceIn(-1.8f, 1.8f) // allow driving on rumble/grass but bound

        // Slipstream drafting detection
        isDrafting = false
        for (rival in rivals) {
            val distZ = rival.z - playerZ
            if (distZ in 100f..1200f && abs(rival.x - playerX) < 0.35f) {
                isDrafting = true
                break
            }
        }
        draftMultiplier = if (isDrafting) 1.15f else 1.0f

        // Acceleration and braking
        val topSpeedLimit = (playerTeam.topSpeedKmh * draftMultiplier * (if (drsActive) 1.08f else 1.0f) * (if (abs(playerX) > 1.0f) 0.45f else 1.0f))
        val accelPower = (playerTeam.accelerationRating / 100f) * 75f

        if (throttleInput > 0f) {
            speed = (speed + accelPower * throttleInput * dt).coerceAtMost(topSpeedLimit)
        } else {
            // Coasting resistance
            speed = (speed - 22f * dt).coerceAtLeast(0f)
        }

        if (brakeInput > 0f) {
            speed = (speed - 130f * brakeInput * dt).coerceAtLeast(0f)
        }

        if (speed > topSpeedReachedKmh) {
            topSpeedReachedKmh = speed
        }

        // Advance along track
        val forwardMps = (speed / 3.6f) * 1.6f
        playerZ += forwardMps * dt * 60f
        totalDistanceMeters += (speed / 3.6f) * dt

        // Check if finished lap / speed run
        if (playerZ >= trackLength * 2) {
            finished = true
            raceFinishedTimeMs = raceTimeMs
        }

        // Update AI rival cars
        for (rival in rivals) {
            val rivalMps = (rival.speed / 3.6f) * 1.6f
            rival.z += rivalMps * dt * 60f
            // AI gently weaves to simulate racing line
            rival.x += sin(rival.z * 0.002f) * 0.25f * dt
            rival.x = rival.x.coerceIn(-0.85f, 0.85f)

            // Player car collision with rival
            val dz = abs(rival.z - playerZ)
            val dx = abs(rival.x - playerX)
            if (dz < 140f && dx < 0.42f) {
                // Bump collision!
                speed = (speed * 0.75f)
                if (playerX < rival.x) {
                    playerX -= 0.25f
                    rival.x += 0.15f
                } else {
                    playerX += 0.25f
                    rival.x -= 0.15f
                }
                // Spawn crash sparks
                for (k in 0..12) {
                    sparkParticles.add(
                        Spark(
                            x = 0f,
                            y = 0f,
                            vx = ((Math.random() - 0.5) * 400).toFloat(),
                            vy = ((Math.random() - 0.8) * 350).toFloat(),
                            life = 0.5f
                        )
                    )
                }
            }
        }

        // Titanium bottoming out sparks at high speed
        if (speed > 280f && Math.random() < 0.35) {
            sparkParticles.add(
                Spark(
                    x = (Math.random() * 40 - 20).toFloat(),
                    y = 10f,
                    vx = (Math.random() * 200 - 100).toFloat(),
                    vy = (Math.random() * 150 + 50).toFloat(),
                    life = 0.35f
                )
            )
        }

        // Update sparks
        val sparkIter = sparkParticles.iterator()
        while (sparkIter.hasNext()) {
            val sp = sparkIter.next()
            sp.x += sp.vx * dt
            sp.y += sp.vy * dt
            sp.life -= dt
            if (sp.life <= 0f) sparkIter.remove()
        }

        // Update rain
        if (weather == WeatherCondition.WET) {
            for (drop in rainDroplets) {
                drop.y += drop.speed * dt
                if (drop.y > 2000f) {
                    drop.y = -50f
                    drop.x = (Math.random() * 1200).toFloat()
                }
            }
        }
    }
}
