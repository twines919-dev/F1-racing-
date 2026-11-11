package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.game.model.TyreCompound
import com.example.ui.theme.*

@Composable
fun RacingHud(
    speedKmh: Float,
    currentLap: Int,
    totalLaps: Int,
    position: Int,
    lapTimeMs: Long,
    bestLapTimeMs: Long,
    tireHealth: Float,
    tireCompound: TyreCompound,
    onPauseClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val rpmRatio = (speedKmh / 340f).coerceIn(0f, 1f)
    val gear = when {
        speedKmh < 5f -> "N"
        speedKmh < 60f -> "1"
        speedKmh < 110f -> "2"
        speedKmh < 165f -> "3"
        speedKmh < 215f -> "4"
        speedKmh < 260f -> "5"
        speedKmh < 295f -> "6"
        speedKmh < 325f -> "7"
        else -> "8"
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        // Top status bar: Position, Lap, Pause
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Position Badge
            Surface(
                color = F1Gold,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.testTag("position_badge")
            ) {
                Text(
                    text = "P$position",
                    color = Color.Black,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }

            // Lap info
            Surface(
                color = CarbonCard.copy(alpha = 0.85f),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, CarbonBorder)
            ) {
                Text(
                    text = "LAP $currentLap / $totalLaps",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }

            // Lap Timer
            Surface(
                color = CarbonCard.copy(alpha = 0.85f),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, CarbonBorder)
            ) {
                val sec = (lapTimeMs / 1000) % 60
                val min = (lapTimeMs / 1000) / 60
                val millis = (lapTimeMs % 1000) / 10
                Text(
                    text = String.format("%02d:%02d.%02d", min, sec, millis),
                    color = F1Green,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            // Pause
            IconButton(
                onClick = onPauseClick,
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(CarbonCard.copy(alpha = 0.85f))
                    .testTag("pause_button")
            ) {
                Text("⏸", color = Color.White, fontSize = 16.sp)
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // F1 Rev Light strip (Green -> Red -> Purple LED array)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color(0xFF1B1F24)),
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            val numLeds = 15
            val activeLeds = (rpmRatio * numLeds).toInt()
            for (idx in 0 until numLeds) {
                val ledColor = when {
                    idx < 5 -> F1Green
                    idx < 11 -> F1Red
                    else -> F1Purple
                }
                val isLit = idx < activeLeds
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .background(if (isLit) ledColor else Color(0xFF282E37))
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Telemetry readout: Speedometer & Gear + Tyre Info
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Speedometer & Gear
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "${speedKmh.toInt()}",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 32.sp,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "KM/H",
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                Text(
                    text = "GEAR $gear",
                    color = F1Gold,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(bottom = 5.dp, start = 8.dp)
                )
            }

            // Tyre Health
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(tireCompound.color)
                )
                Text(
                    text = "${(tireHealth * 100).toInt()}% TYRE",
                    color = if (tireHealth < 0.35f) F1Red else Color.LightGray,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
            }
        }
    }
}
