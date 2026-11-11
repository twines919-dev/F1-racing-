package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.game.model.TyreCompound
import com.example.ui.theme.*

@Composable
fun PodiumDialog(
    position: Int,
    totalTimeMs: Long,
    bestLapMs: Long,
    topSpeedKmh: Float,
    circuitName: String,
    onRestart: () -> Unit,
    onReturnToHub: () -> Unit
) {
    val isWin = position == 1
    val isPodium = position <= 3

    Dialog(onDismissRequest = onReturnToHub) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = CarbonCard,
            border = androidx.compose.foundation.BorderStroke(2.dp, if (isWin) F1Gold else F1Red),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .testTag("podium_dialog")
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (isWin) "🏆 VICTORY! P1" else if (isPodium) "🍾 PODIUM FINISH P$position" else "CHECKERED FLAG P$position",
                    color = if (isWin) F1Gold else Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = circuitName,
                    color = Color.LightGray,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 2.dp, bottom = 14.dp)
                )

                // Stats Card
                Surface(
                    color = Color(0xFF14171D),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, CarbonBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total Time:", color = Color.Gray, fontSize = 13.sp)
                            val totalSec = totalTimeMs / 1000
                            Text(
                                text = String.format("%02d:%02d", totalSec / 60, totalSec % 60),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Best Lap:", color = Color.Gray, fontSize = 13.sp)
                            val lapSec = (bestLapMs / 1000) % 60
                            val lapMin = (bestLapMs / 1000) / 60
                            val lapMillis = (bestLapMs % 1000) / 10
                            Text(
                                text = if (bestLapMs > 0) String.format("%02d:%02d.%02d", lapMin, lapSec, lapMillis) else "--:--",
                                color = F1Green,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Top Speed:", color = Color.Gray, fontSize = 13.sp)
                            Text(
                                text = "${topSpeedKmh.toInt()} KM/H",
                                color = F1Cyan,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                Button(
                    onClick = onRestart,
                    colors = ButtonDefaults.buttonColors(containerColor = F1Red),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("restart_race_button")
                ) {
                    Text("RACE AGAIN", fontWeight = FontWeight.Bold, color = Color.White)
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onReturnToHub,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("return_hub_button")
                ) {
                    Text("GRAND PRIX HUB", color = Color.LightGray)
                }
            }
        }
    }
}

@Composable
fun PitStopDialog(
    currentCompound: TyreCompound,
    onSelectCompound: (TyreCompound) -> Unit,
    onClose: () -> Unit
) {
    Dialog(onDismissRequest = onClose) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = CarbonCard,
            border = androidx.compose.foundation.BorderStroke(2.dp, F1Cyan),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .testTag("pit_stop_dialog")
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "BOX BOX BOX! PIT STOP",
                    color = F1Cyan,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
                Text(
                    text = "Select Fresh Tyre Compound",
                    color = Color.LightGray,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                TyreCompound.entries.forEach { compound ->
                    val isCurrent = compound == currentCompound
                    Surface(
                        onClick = {
                            onSelectCompound(compound)
                            onClose()
                        },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isCurrent) Color(0xFF22303C) else Color(0xFF14171D),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isCurrent) F1Cyan else CarbonBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .testTag("select_tyre_${compound.name}")
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(compound.color)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = compound.label,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                            Text(
                                text = "Grip x${compound.gripFactor}",
                                color = Color.Gray,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PauseMenuDialog(
    onResume: () -> Unit,
    onRestart: () -> Unit,
    onQuit: () -> Unit,
    isMuted: Boolean,
    onToggleMute: () -> Unit
) {
    Dialog(onDismissRequest = onResume) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = CarbonCard,
            border = androidx.compose.foundation.BorderStroke(1.5.dp, CarbonBorder),
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .testTag("pause_menu_dialog")
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "RACE PAUSED",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                Button(
                    onClick = onResume,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = F1Green),
                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("resume_button")
                ) {
                    Text("RESUME RACE", fontWeight = FontWeight.Bold, color = Color.Black)
                }

                Button(
                    onClick = onToggleMute,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF252B33)),
                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("toggle_sound_button")
                ) {
                    Text(if (isMuted) "SOUND: MUTED 🔇" else "SOUND: ON 🔊", color = Color.White)
                }

                Button(
                    onClick = onRestart,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF252B33)),
                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("pause_restart_button")
                ) {
                    Text("RESTART RACE", color = Color.White)
                }

                OutlinedButton(
                    onClick = onQuit,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("pause_quit_button")
                ) {
                    Text("EXIT TO HUB", color = F1Red)
                }
            }
        }
    }
}
