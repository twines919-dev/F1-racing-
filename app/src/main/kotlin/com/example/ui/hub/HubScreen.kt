package com.example.ui.hub

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ScoreRepository
import com.example.game.audio.RacingAudio
import com.example.game.model.*
import com.example.ui.components.StartLightsSequence
import com.example.ui.theme.*

@Composable
fun HubScreen(
    onStart2DGame: (Circuit, RacingTeam) -> Unit,
    onStart3DGame: (Circuit, RacingTeam, WeatherCondition) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scoreRepo = remember { ScoreRepository(context) }
    val audio = remember { RacingAudio(context) }

    var selectedMode by remember { mutableStateOf(GameMode.CIRCUIT_2D) }
    var selectedCircuit by remember { mutableStateOf(Circuit.MONZA) }
    var selectedTeam by remember { mutableStateOf(RacingTeam.SCUDERIA) }
    var selectedWeather by remember { mutableStateOf(WeatherCondition.SUNNY) }

    var showReactionTest by remember { mutableStateOf(false) }
    var showLeaderboard by remember { mutableStateOf(false) }

    var reactionResultText by remember { mutableStateOf<String?>(null) }
    var reactionScoreMs by remember { mutableLongStateOf(0L) }

    DisposableEffect(Unit) {
        onDispose {
            audio.stopEngineSound()
        }
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("hub_screen"),
        containerColor = CarbonDark
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Title Banner
            item {
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    color = Color.Transparent,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(14.dp)
                                    .clip(CircleShape)
                                    .background(F1Red)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "FORMULA 1 RACING",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 26.sp,
                                letterSpacing = 2.sp
                            )
                        }
                        Text(
                            text = "CHAMPIONSHIP ARCADE SIMULATOR",
                            color = F1Gold,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            letterSpacing = 2.sp
                        )
                    }
                }
            }

            // Game Mode Switcher (2D vs 3D)
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(CarbonCard)
                        .padding(4.dp)
                        .testTag("game_mode_tabs"),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    GameMode.entries.forEach { mode ->
                        val isSelected = mode == selectedMode
                        Surface(
                            onClick = {
                                selectedMode = mode
                                audio.vibrate(20)
                            },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) F1Red else Color.Transparent,
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp)
                                .testTag("tab_${mode.name}")
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = mode.tag + " MODE",
                                    color = if (isSelected) Color.White else Color.Gray,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }
            }

            // Mode Description Card
            item {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = CarbonCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, CarbonBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(
                            text = selectedMode.title,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = selectedMode.subtitle,
                            color = Color.LightGray,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Circuit Selector
            item {
                Text(
                    text = "SELECT GRAND PRIX CIRCUIT",
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.testTag("circuit_selector")
                ) {
                    items(Circuit.entries.toList()) { circuit ->
                        val isSelected = circuit == selectedCircuit
                        Surface(
                            onClick = {
                                selectedCircuit = circuit
                                audio.vibrate(20)
                            },
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSelected) Color(0xFF222B38) else CarbonCard,
                            border = androidx.compose.foundation.BorderStroke(
                                2.dp,
                                if (isSelected) circuit.accentColor else CarbonBorder
                            ),
                            modifier = Modifier
                                .width(160.dp)
                                .testTag("circuit_card_${circuit.id}")
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(circuit.accentColor)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = circuit.displayName,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                                Text(
                                    text = circuit.location,
                                    color = Color.Gray,
                                    fontSize = 11.sp
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = circuit.difficulty,
                                    color = F1Gold,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )

                                val bestLap = scoreRepo.getBestLapTimeMs(circuit.id)
                                if (bestLap > 0) {
                                    val sec = (bestLap / 1000) % 60
                                    val min = (bestLap / 1000) / 60
                                    Text(
                                        text = "Best: ${min}m ${sec}s",
                                        color = F1Green,
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Team / Car Livery Selector
            item {
                Text(
                    text = "SELECT RACING TEAM & CAR",
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    RacingTeam.entries.forEach { team ->
                        val isSelected = team == selectedTeam
                        Surface(
                            onClick = {
                                selectedTeam = team
                                audio.vibrate(20)
                            },
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSelected) Color(0xFF21262F) else CarbonCard,
                            border = androidx.compose.foundation.BorderStroke(
                                2.dp,
                                if (isSelected) team.primaryColor else CarbonBorder
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("team_card_${team.name}")
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(team.primaryColor)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = team.teamName,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                        Text(
                                            text = "Driver: ${team.driverName}",
                                            color = Color.Gray,
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("TOP SPEED", color = Color.Gray, fontSize = 9.sp)
                                        Text("${team.topSpeedKmh} KM/H", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("HANDLING", color = Color.Gray, fontSize = 9.sp)
                                        Text("${team.handlingRating}/100", color = F1Cyan, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Weather Condition Selector (if 3D Mode)
            if (selectedMode == GameMode.SPEED_3D) {
                item {
                    Text(
                        text = "WEATHER CONDITIONS",
                        color = Color.Gray,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        WeatherCondition.entries.forEach { weather ->
                            val isSelected = weather == selectedWeather
                            Surface(
                                onClick = {
                                    selectedWeather = weather
                                    audio.vibrate(20)
                                },
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) Color(0xFF22303D) else CarbonCard,
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, if (isSelected) F1Cyan else CarbonBorder),
                                modifier = Modifier.weight(1f).height(42.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = weather.label,
                                        color = if (isSelected) Color.White else Color.Gray,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Main Launch Button!
            item {
                Spacer(modifier = Modifier.height(6.dp))
                Button(
                    onClick = {
                        audio.vibrate(40)
                        if (selectedMode == GameMode.CIRCUIT_2D) {
                            onStart2DGame(selectedCircuit, selectedTeam)
                        } else {
                            onStart3DGame(selectedCircuit, selectedTeam, selectedWeather)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = F1Red),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .testTag("start_race_button")
                ) {
                    Text(
                        text = "START ${selectedMode.tag} GRAND PRIX",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        letterSpacing = 1.5.sp,
                        color = Color.White
                    )
                }
            }

            // Mini-Games & Stats buttons: 5-Lights Reaction Reflex & Leaderboard
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = { showReactionTest = true },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("reaction_test_button")
                    ) {
                        Text("🚦 REACTION TEST", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = { showLeaderboard = true },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("leaderboard_button")
                    ) {
                        Text("📊 SCORES & STATS", color = F1Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }

        // Reaction Test Modal
        if (showReactionTest) {
            var lightsOutTimestamp by remember { mutableLongStateOf(0L) }
            var isLightsOut by remember { mutableStateOf(false) }

            AlertDialog(
                onDismissRequest = { showReactionTest = false },
                containerColor = CarbonCard,
                title = {
                    Text("F1 Reaction Lights Test", color = Color.White, fontWeight = FontWeight.Bold)
                },
                text = {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Watch the 5 lights turn red. When they extinguish, tap the button immediately!",
                            color = Color.LightGray,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        StartLightsSequence(
                            audio = audio,
                            onLightsOut = {
                                isLightsOut = true
                                lightsOutTimestamp = System.currentTimeMillis()
                            }
                        )

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = {
                                if (!isLightsOut) {
                                    reactionResultText = "FALSE START! +5s Penalty"
                                    audio.vibrate(80)
                                } else {
                                    val elapsed = System.currentTimeMillis() - lightsOutTimestamp
                                    reactionScoreMs = elapsed
                                    scoreRepo.saveReactionTimeMs(elapsed)
                                    audio.vibrate(30)
                                    reactionResultText = when {
                                        elapsed < 200 -> "$elapsed ms - WORLD CHAMPION REFLEX! 🔥"
                                        elapsed < 260 -> "$elapsed ms - Elite F1 Driver Tier ⚡"
                                        elapsed < 350 -> "$elapsed ms - Good Reaction Time 👍"
                                        else -> "$elapsed ms - Slower than safety car 🐢"
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = if (isLightsOut) F1Green else F1Red),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(54.dp)
                                .testTag("reaction_tap_button")
                        ) {
                            Text(
                                text = if (isLightsOut) "TAP NOW!" else "READY...",
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = if (isLightsOut) Color.Black else Color.White
                            )
                        }

                        reactionResultText?.let {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = it,
                                color = if (it.contains("FALSE")) F1Red else F1Gold,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showReactionTest = false }) {
                        Text("CLOSE", color = Color.Gray)
                    }
                }
            )
        }

        // Leaderboard Modal
        if (showLeaderboard) {
            AlertDialog(
                onDismissRequest = { showLeaderboard = false },
                containerColor = CarbonCard,
                title = {
                    Text("F1 Score Records & History", color = Color.White, fontWeight = FontWeight.Black)
                },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Quick Stats
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Races", color = Color.Gray, fontSize = 11.sp)
                                Text("${scoreRepo.getTotalRaces()}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Wins", color = Color.Gray, fontSize = 11.sp)
                                Text("${scoreRepo.getTotalWins()}", color = F1Gold, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Best Reaction", color = Color.Gray, fontSize = 11.sp)
                                val bestReaction = scoreRepo.getReactionTimeBestMs()
                                Text(
                                    text = if (bestReaction > 0) "${bestReaction}ms" else "--",
                                    color = F1Green,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                        }

                        Divider(color = CarbonBorder)

                        Text("Best Lap per Circuit:", color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)

                        Circuit.entries.forEach { circ ->
                            val bestLap = scoreRepo.getBestLapTimeMs(circ.id)
                            val topSpeed = scoreRepo.getTopSpeedKmh(circ.id)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(circ.displayName, color = Color.White, fontSize = 13.sp)
                                Text(
                                    text = if (bestLap > 0) {
                                        val s = (bestLap / 1000) % 60
                                        val m = (bestLap / 1000) / 60
                                        val ms = (bestLap % 1000) / 10
                                        String.format("%02d:%02d.%02d (%d km/h)", m, s, ms, topSpeed.toInt())
                                    } else "No time recorded",
                                    color = if (bestLap > 0) F1Green else Color.DarkGray,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Button(
                            onClick = {
                                scoreRepo.clearAllScores()
                                showLeaderboard = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B1515)),
                            modifier = Modifier.fillMaxWidth().height(38.dp)
                        ) {
                            Text("Reset Records", color = F1Red, fontSize = 12.sp)
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showLeaderboard = false }) {
                        Text("DONE", color = Color.White)
                    }
                }
            )
        }
    }
}
