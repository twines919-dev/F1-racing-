package com.example.game.model

import androidx.compose.ui.graphics.Color
import kotlinx.serialization.Serializable

enum class GameMode(val title: String, val subtitle: String, val tag: String) {
    CIRCUIT_2D("2D Circuit Grand Prix", "Top-down precision racing with rival AI, pit stops & drift physics", "2D"),
    SPEED_3D("3D Cockpit Speed Run", "High-speed 3D perspective racing with slipstream drafting & curves", "3D")
}

enum class Circuit(
    val id: String,
    val displayName: String,
    val location: String,
    val lapLengthMeters: Int,
    val recommendedLaps: Int,
    val difficulty: String,
    val accentColor: Color
) {
    MONZA("monza", "Monza GP", "Italy - Temple of Speed", 5793, 3, "Fast Straights", Color(0xFFE10600)),
    MONACO("monaco", "Monaco GP", "Monte Carlo Street Circuit", 3337, 3, "Tight Corners", Color(0xFF00D2BE)),
    SILVERSTONE("silverstone", "Silverstone", "UK - High Speed Sweepers", 5891, 3, "Balanced Flow", Color(0xFFFF8700)),
    SPA("spa", "Spa-Francorchamps", "Belgium - Ardennes Rollercoaster", 7004, 3, "Elevation & Eau Rouge", Color(0xFFFFD700))
}

enum class RacingTeam(
    val teamName: String,
    val driverName: String,
    val primaryColor: Color,
    val accentColor: Color,
    val topSpeedKmh: Int,
    val accelerationRating: Int, // 1 - 100
    val handlingRating: Int      // 1 - 100
) {
    SCUDERIA("Scuderia Rosso", "Charles C.", Color(0xFFE10600), Color(0xFFFFFFFF), 345, 93, 88),
    SILVER_ARROWS("Silver Arrows", "George R.", Color(0xFF00D2BE), Color(0xFF1B1B1B), 338, 95, 94),
    PAPAYA("Papaya Speed", "Lando N.", Color(0xFFFF8700), Color(0xFF0090FF), 336, 94, 91),
    BULL_RACING("Bull Racing", "Max V.", Color(0xFF00205B), Color(0xFFFFCC00), 348, 92, 87)
}

enum class TyreCompound(val label: String, val gripFactor: Float, val wearRatePerSec: Float, val color: Color) {
    SOFT("Soft (Red)", 1.08f, 0.022f, Color(0xFFE10600)),
    MEDIUM("Medium (Yellow)", 1.00f, 0.012f, Color(0xFFFFD600)),
    HARD("Hard (White)", 0.94f, 0.006f, Color(0xFFFFFFFF))
}

enum class WeatherCondition(val label: String, val trackGripMultiplier: Float, val skyColor: Color) {
    SUNNY("Dry Sun", 1.0f, Color(0xFF1E88E5)),
    SUNSET("Golden Sunset", 0.98f, Color(0xFFFF7043)),
    WET("Monsoon Rain", 0.76f, Color(0xFF37474F))
}

enum class RaceStatus {
    COUNTDOWN,
    RACING,
    PIT_STOP,
    FINISHED,
    FALSE_START
}

data class RaceRecord(
    val circuitId: String,
    val circuitName: String,
    val mode: String,
    val bestLapMs: Long,
    val topSpeedKmh: Float,
    val teamName: String,
    val dateIso: String
)

data class DriverStandingsItem(
    val position: Int,
    val name: String,
    val team: RacingTeam,
    val gapSeconds: Float,
    val bestLapMs: Long,
    val currentLap: Int
)
