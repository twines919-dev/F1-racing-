package com.example.game.engine2d

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import com.example.game.model.Circuit
import com.example.game.model.RacingTeam
import com.example.game.model.TyreCompound
import kotlin.math.*

data class TrackWaypoint(
    val x: Float,
    val y: Float,
    val width: Float = 140f,
    val isDrsZone: Boolean = false,
    val isPitEntry: Boolean = false
)

class Car2D(
    var x: Float,
    var y: Float,
    var angle: Float, // in radians
    val isPlayer: Boolean,
    val team: RacingTeam,
    val name: String,
    var speedKmh: Float = 0f,
    var steerAngle: Float = 0f, // -1 (left) to +1 (right)
    var throttle: Float = 0f,
    var brake: Float = 0f,
    var ersActive: Boolean = false,
    var drsActive: Boolean = false,
    var tireCompound: TyreCompound = TyreCompound.SOFT,
    var tireHealth: Float = 1.0f, // 1.0 to 0.0
    var ersBattery: Float = 1.0f, // 1.0 to 0.0
    var currentLap: Int = 1,
    var currentWaypointIndex: Int = 0,
    var lapProgressFraction: Float = 0f,
    var currentLapTimeMs: Long = 0L,
    var bestLapTimeMs: Long = 0L,
    var totalTimeMs: Long = 0L,
    var finished: Boolean = false,
    var isDrifting: Boolean = false,
    var inGrass: Boolean = false,
    var inPitLane: Boolean = false
)

class Simulation2D(
    val circuit: Circuit,
    val playerTeam: RacingTeam,
    val totalLaps: Int = 3
) {
    val waypoints: List<TrackWaypoint> = generateTrackWaypoints(circuit)
    val cars: MutableList<Car2D> = mutableListOf()
    val skidMarks: MutableList<SkidMark> = mutableListOf()

    data class SkidMark(val start: Offset, val end: Offset, var alpha: Float = 0.8f)

    val playerCar: Car2D

    init {
        // Place cars on grid in staggered formation
        val startWp = waypoints.first()
        val nextWp = waypoints[1]
        val trackAngle = atan2(nextWp.y - startWp.y, nextWp.x - startWp.x)

        // Player starts in P2 or P3
        val playerOffset = Offset(-cos(trackAngle + Math.PI.toFloat() / 2f) * 26f, -sin(trackAngle + Math.PI.toFloat() / 2f) * 26f)
        playerCar = Car2D(
            x = startWp.x + playerOffset.x - cos(trackAngle) * 30f,
            y = startWp.y + playerOffset.y - sin(trackAngle) * 30f,
            angle = trackAngle,
            isPlayer = true,
            team = playerTeam,
            name = "Player"
        )
        cars.add(playerCar)

        // Spawn 4 AI rivals
        val aiTeams = RacingTeam.entries.filter { it != playerTeam }.take(4)
        var gridSlot = 0
        for (team in aiTeams) {
            gridSlot++
            val isEven = gridSlot % 2 == 0
            val sideSign = if (isEven) 1f else -1f
            val lateralOffset = Offset(
                cos(trackAngle + Math.PI.toFloat() / 2f) * (26f * sideSign),
                sin(trackAngle + Math.PI.toFloat() / 2f) * (26f * sideSign)
            )
            val longitudinalBack = (gridSlot * 42f)
            val aiCar = Car2D(
                x = startWp.x + lateralOffset.x - cos(trackAngle) * longitudinalBack,
                y = startWp.y + lateralOffset.y - sin(trackAngle) * longitudinalBack,
                angle = trackAngle,
                isPlayer = false,
                team = team,
                name = team.driverName
            )
            cars.add(aiCar)
        }
    }

    fun update(dtSeconds: Float) {
        val dt = dtSeconds.coerceIn(0.001f, 0.05f)

        // Update each car
        for (car in cars) {
            if (car.finished) {
                car.speedKmh = (car.speedKmh * 0.95f)
                continue
            }

            car.currentLapTimeMs += (dt * 1000f).toLong()
            car.totalTimeMs += (dt * 1000f).toLong()

            // AI control logic
            if (!car.isPlayer) {
                updateAiCar(car, dt)
            }

            // Physics calculation
            val prevX = car.x
            val prevY = car.y

            // Check if car is in grass/gravel
            val (distToTrack, closestWp) = getDistanceToTrack(car.x, car.y)
            val trackHalfWidth = (closestWp?.width ?: 140f) / 2f
            car.inGrass = distToTrack > trackHalfWidth

            val maxSpeed = (car.team.topSpeedKmh * (if (car.ersActive) 1.08f else 1.0f) * (if (car.drsActive && closestWp?.isDrsZone == true) 1.06f else 1.0f))
            val baseAccel = (car.team.accelerationRating / 100f) * 65f // km/h per sec
            val gripFactor = car.tireCompound.gripFactor * (0.5f + 0.5f * car.tireHealth) * (if (car.inGrass) 0.45f else 1.0f)

            // Acceleration & braking
            if (car.throttle > 0f) {
                val accel = baseAccel * car.throttle * (if (car.ersActive) 1.25f else 1.0f)
                car.speedKmh = (car.speedKmh + accel * dt).coerceAtMost(if (car.inGrass) 110f else maxSpeed)
            } else {
                // Natural drag/engine braking
                car.speedKmh = (car.speedKmh - 18f * dt).coerceAtLeast(0f)
            }

            if (car.brake > 0f) {
                val brakePower = 110f * car.brake
                car.speedKmh = (car.speedKmh - brakePower * dt).coerceAtLeast(0f)
                // Kinetic Energy Recovery (ERS recharge under braking)
                car.ersBattery = (car.ersBattery + 0.08f * dt).coerceAtMost(1.0f)
            }

            // ERS battery drain
            if (car.ersActive && car.ersBattery > 0f) {
                car.ersBattery = (car.ersBattery - 0.12f * dt).coerceAtLeast(0f)
                if (car.ersBattery <= 0f) car.ersActive = false
            }

            // Tire wear from speed and steering
            val wearRate = car.tireCompound.wearRatePerSec * (1.0f + abs(car.steerAngle) * 1.5f) * (car.speedKmh / 200f)
            car.tireHealth = (car.tireHealth - wearRate * dt).coerceAtLeast(0.1f)

            // Steering & rotation
            val turnSpeedFactor = (car.speedKmh / 160f).coerceIn(0.15f, 1.0f)
            val turnRate = (car.team.handlingRating / 100f) * 2.8f * gripFactor * turnSpeedFactor
            val steerDelta = car.steerAngle * turnRate * dt
            car.angle += steerDelta

            // Detect drift/skid
            val isHighLateralLoad = abs(car.steerAngle) > 0.65f && car.speedKmh > 170f
            car.isDrifting = isHighLateralLoad || (car.inGrass && car.speedKmh > 80f)

            // Forward translation
            val speedMps = (car.speedKmh / 3.6f) * 0.85f // scale to canvas coords
            car.x += cos(car.angle) * speedMps * dt * 14f
            car.y += sin(car.angle) * speedMps * dt * 14f

            // Add skid mark when drifting
            if (car.isDrifting && skidMarks.size < 120) {
                val markOffset = Offset(car.x, car.y)
                val prevOffset = Offset(prevX, prevY)
                skidMarks.add(SkidMark(prevOffset, markOffset, 0.7f))
            }

            // Waypoint tracking & lap detection
            updateLapProgress(car)
        }

        // Fade skid marks
        val iter = skidMarks.iterator()
        while (iter.hasNext()) {
            val mark = iter.next()
            mark.alpha -= 0.12f * dt
            if (mark.alpha <= 0f) iter.remove()
        }

        // Car-to-car collision resolution
        handleCarCollisions()
    }

    private fun updateAiCar(ai: Car2D, dt: Float) {
        val targetWpIndex = (ai.currentWaypointIndex + 2) % waypoints.size
        val targetWp = waypoints[targetWpIndex]

        val targetAngle = atan2(targetWp.y - ai.y, targetWp.x - ai.x)
        var angleDiff = targetAngle - ai.angle
        while (angleDiff > Math.PI) angleDiff -= (2 * Math.PI).toFloat()
        while (angleDiff < -Math.PI) angleDiff += (2 * Math.PI).toFloat()

        // Steer towards next waypoint
        ai.steerAngle = (angleDiff * 2.2f).coerceIn(-1.0f, 1.0f)

        // Throttle and brake based on upcoming corner sharpness
        val cornerSharpness = abs(angleDiff)
        if (cornerSharpness > 0.7f && ai.speedKmh > 180f) {
            ai.throttle = 0.2f
            ai.brake = 0.8f
        } else if (cornerSharpness > 0.4f && ai.speedKmh > 240f) {
            ai.throttle = 0.5f
            ai.brake = 0.3f
        } else {
            ai.throttle = 1.0f
            ai.brake = 0.0f
        }

        // DRS activation on straight
        ai.drsActive = targetWp.isDrsZone && cornerSharpness < 0.2f
        ai.ersActive = targetWp.isDrsZone && ai.ersBattery > 0.4f
    }

    private fun updateLapProgress(car: Car2D) {
        val currentWp = waypoints[car.currentWaypointIndex]
        val distToCurrent = hypot(car.x - currentWp.x, car.y - currentWp.y)

        if (distToCurrent < 160f) {
            val nextIndex = (car.currentWaypointIndex + 1) % waypoints.size
            if (nextIndex == 0 && car.currentWaypointIndex == waypoints.size - 1) {
                // Completed a lap!
                if (car.bestLapTimeMs == 0L || car.currentLapTimeMs < car.bestLapTimeMs) {
                    car.bestLapTimeMs = car.currentLapTimeMs
                }
                car.currentLapTimeMs = 0L
                car.currentLap++

                if (car.currentLap > totalLaps) {
                    car.finished = true
                }
            }
            car.currentWaypointIndex = nextIndex
        }

        car.lapProgressFraction = ((car.currentLap - 1) * waypoints.size + car.currentWaypointIndex).toFloat() / (totalLaps * waypoints.size)
    }

    private fun handleCarCollisions() {
        for (i in 0 until cars.size) {
            for (j in (i + 1) until cars.size) {
                val c1 = cars[i]
                val c2 = cars[j]
                val dx = c2.x - c1.x
                val dy = c2.y - c1.y
                val dist = hypot(dx, dy)
                val minDist = 36f // collision radius sum

                if (dist < minDist && dist > 0.01f) {
                    val overlap = minDist - dist
                    val nx = dx / dist
                    val ny = dy / dist

                    c1.x -= nx * overlap * 0.5f
                    c1.y -= ny * overlap * 0.5f
                    c2.x += nx * overlap * 0.5f
                    c2.y += ny * overlap * 0.5f

                    // Scrub some speed on contact
                    c1.speedKmh *= 0.92f
                    c2.speedKmh *= 0.92f
                }
            }
        }
    }

    fun getStandings(): List<Car2D> {
        return cars.sortedWith(
            compareByDescending<Car2D> { it.currentLap }
                .thenByDescending { it.currentWaypointIndex }
                .thenBy { it.totalTimeMs }
        )
    }

    fun getDistanceToTrack(x: Float, y: Float): Pair<Float, TrackWaypoint?> {
        var minDist = Float.MAX_VALUE
        var closestWp: TrackWaypoint? = null
        for (wp in waypoints) {
            val d = hypot(x - wp.x, y - wp.y)
            if (d < minDist) {
                minDist = d
                closestWp = wp
            }
        }
        return Pair(minDist, closestWp)
    }

    companion object {
        fun generateTrackWaypoints(circuit: Circuit): List<TrackWaypoint> {
            val list = mutableListOf<TrackWaypoint>()
            when (circuit) {
                Circuit.MONZA -> {
                    // Monza layout: Long main straight, Curva Grande, Roggia Chicane, Lesmo 1 & 2, Ascari Chicane, Parabolica
                    val cx = 1200f
                    val cy = 1000f
                    // Pit straight (DRS zone)
                    for (i in 0..12) list.add(TrackWaypoint(cx - 500f + i * 85f, cy + 600f, 150f, isDrsZone = true))
                    // Prima Variante chicane
                    list.add(TrackWaypoint(cx + 560f, cy + 540f, 130f))
                    list.add(TrackWaypoint(cx + 620f, cy + 460f, 130f))
                    // Curva Grande sweeping right
                    for (i in 0..6) {
                        val angle = (Math.PI / 2.0 - i * 0.18).toFloat()
                        list.add(TrackWaypoint(cx + 700f + cos(angle) * 320f, cy + 240f + sin(angle) * 320f, 150f))
                    }
                    // Variante della Roggia
                    list.add(TrackWaypoint(cx + 760f, cy - 200f, 130f))
                    list.add(TrackWaypoint(cx + 710f, cy - 320f, 130f))
                    // Lesmo 1 & 2
                    list.add(TrackWaypoint(cx + 580f, cy - 480f, 130f))
                    list.add(TrackWaypoint(cx + 420f, cy - 580f, 130f))
                    // Serraglio straight (DRS zone)
                    for (i in 0..7) list.add(TrackWaypoint(cx + 300f - i * 90f, cy - 600f, 150f, isDrsZone = true))
                    // Variante Ascari
                    list.add(TrackWaypoint(cx - 400f, cy - 530f, 130f))
                    list.add(TrackWaypoint(cx - 520f, cy - 420f, 130f))
                    list.add(TrackWaypoint(cx - 480f, cy - 280f, 130f))
                    // Back straight to Parabolica
                    list.add(TrackWaypoint(cx - 450f, cy - 100f, 150f))
                    list.add(TrackWaypoint(cx - 450f, cy + 150f, 150f))
                    // Curva Parabolica (Alboreto)
                    for (i in 0..7) {
                        val angle = (-Math.PI / 2.0 + i * 0.22).toFloat()
                        list.add(TrackWaypoint(cx - 450f + cos(angle) * 320f, cy + 380f + sin(angle) * 320f, 150f))
                    }
                }
                Circuit.MONACO -> {
                    // Monte Carlo: Sainte Devote, Beau Rivage, Massenet, Casino Square, Mirabeau, Fairplay Hairpin, Portier, Tunnel, Chicane, Tabac, Rascasse
                    val cx = 1000f
                    val cy = 1000f
                    for (i in 0..8) list.add(TrackWaypoint(cx - 400f + i * 75f, cy + 500f, 120f, isDrsZone = true))
                    // Sainte Devote right turn
                    list.add(TrackWaypoint(cx + 250f, cy + 440f, 110f))
                    list.add(TrackWaypoint(cx + 340f, cy + 320f, 110f))
                    // Beau Rivage climb
                    list.add(TrackWaypoint(cx + 440f, cy + 180f, 120f))
                    list.add(TrackWaypoint(cx + 520f, cy + 20f, 120f))
                    // Casino Square
                    list.add(TrackWaypoint(cx + 480f, cy - 160f, 110f))
                    list.add(TrackWaypoint(cx + 360f, cy - 280f, 110f))
                    // Mirabeau & Grand Hotel Hairpin (Tight!)
                    list.add(TrackWaypoint(cx + 220f, cy - 360f, 100f))
                    list.add(TrackWaypoint(cx + 120f, cy - 300f, 95f))
                    list.add(TrackWaypoint(cx + 180f, cy - 200f, 100f))
                    // Portier into Tunnel
                    list.add(TrackWaypoint(cx + 300f, cy - 120f, 120f))
                    for (i in 0..5) list.add(TrackWaypoint(cx + 380f - i * 80f, cy - 40f + i * 40f, 130f, isDrsZone = true))
                    // Nouvelle Chicane & Tabac
                    list.add(TrackWaypoint(cx - 100f, cy + 220f, 110f))
                    list.add(TrackWaypoint(cx - 200f, cy + 280f, 115f))
                    // Swimming Pool sections
                    list.add(TrackWaypoint(cx - 320f, cy + 320f, 110f))
                    list.add(TrackWaypoint(cx - 440f, cy + 360f, 110f))
                    // La Rascasse & Antony Noghes
                    list.add(TrackWaypoint(cx - 520f, cy + 420f, 100f))
                    list.add(TrackWaypoint(cx - 480f, cy + 490f, 110f))
                }
                Circuit.SPA, Circuit.SILVERSTONE -> {
                    // Sweeping Grand Prix circuit layout
                    val cx = 1100f
                    val cy = 1100f
                    val numPoints = 28
                    for (i in 0 until numPoints) {
                        val theta = (i.toFloat() / numPoints) * 2f * Math.PI.toFloat()
                        // Organic curved racetrack with long straights and chicanes
                        val r = 520f + 140f * sin(theta * 2f) + 80f * cos(theta * 3f)
                        val wx = cx + cos(theta) * r
                        val wy = cy + sin(theta) * r
                        val isDrs = (i in 2..7) || (i in 16..21)
                        list.add(TrackWaypoint(wx, wy, 145f, isDrsZone = isDrs))
                    }
                }
            }
            return list
        }
    }
}
