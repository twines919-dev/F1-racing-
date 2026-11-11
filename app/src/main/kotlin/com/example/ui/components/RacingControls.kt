package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.CarbonBorder
import com.example.ui.theme.CarbonCard
import com.example.ui.theme.F1Cyan
import com.example.ui.theme.F1Green
import com.example.ui.theme.F1Red

@Composable
fun RacingControls(
    onSteerChange: (Float) -> Unit,
    onThrottleChange: (Float) -> Unit,
    onBrakeChange: (Float) -> Unit,
    onErsBoostToggle: () -> Unit,
    ersBattery: Float,
    isErsActive: Boolean,
    isDrsAvailable: Boolean,
    modifier: Modifier = Modifier
) {
    var leftPressed by remember { mutableStateOf(false) }
    var rightPressed by remember { mutableStateOf(false) }
    var throttlePressed by remember { mutableStateOf(false) }
    var brakePressed by remember { mutableStateOf(false) }

    // Update steer whenever buttons change
    LaunchedEffect(leftPressed, rightPressed) {
        val steer = when {
            leftPressed && !rightPressed -> -1.0f
            rightPressed && !leftPressed -> 1.0f
            else -> 0.0f
        }
        onSteerChange(steer)
    }

    // Update throttle
    LaunchedEffect(throttlePressed) {
        onThrottleChange(if (throttlePressed) 1.0f else 0.0f)
    }

    // Update brake
    LaunchedEffect(brakePressed) {
        onBrakeChange(if (brakePressed) 1.0f else 0.0f)
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom
    ) {
        // Steering Controls (Left & Right paddles)
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left Steer
            Surface(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .testTag("steer_left_button")
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = {
                                leftPressed = true
                                tryAwaitRelease()
                                leftPressed = false
                            }
                        )
                    },
                shape = CircleShape,
                color = if (leftPressed) F1Cyan.copy(alpha = 0.8f) else CarbonCard.copy(alpha = 0.85f),
                border = androidx.compose.foundation.BorderStroke(2.dp, if (leftPressed) F1Cyan else CarbonBorder)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "◀",
                        color = if (leftPressed) Color.Black else Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // Right Steer
            Surface(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .testTag("steer_right_button")
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = {
                                rightPressed = true
                                tryAwaitRelease()
                                rightPressed = false
                            }
                        )
                    },
                shape = CircleShape,
                color = if (rightPressed) F1Cyan.copy(alpha = 0.8f) else CarbonCard.copy(alpha = 0.85f),
                border = androidx.compose.foundation.BorderStroke(2.dp, if (rightPressed) F1Cyan else CarbonBorder)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "▶",
                        color = if (rightPressed) Color.Black else Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }

        // Center Boost & DRS Button
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // ERS / DRS Deploy
            Surface(
                modifier = Modifier
                    .height(48.dp)
                    .widthIn(min = 100.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .testTag("ers_boost_button"),
                shape = RoundedCornerShape(24.dp),
                color = when {
                    isErsActive -> F1Cyan
                    ersBattery > 0.1f -> Color(0xFF005577)
                    else -> Color(0xFF333333)
                },
                onClick = onErsBoostToggle
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = if (isErsActive) "⚡ BOOST ON" else "⚡ ERS ${(ersBattery * 100).toInt()}%",
                        color = if (isErsActive) Color.Black else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
            if (isDrsAvailable) {
                Text(
                    text = "DRS OPEN",
                    color = F1Green,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 11.sp,
                    letterSpacing = 1.sp
                )
            }
        }

        // Pedals: Brake & Throttle
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            // Brake Pedal
            Surface(
                modifier = Modifier
                    .width(56.dp)
                    .height(68.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .testTag("brake_pedal")
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = {
                                brakePressed = true
                                tryAwaitRelease()
                                brakePressed = false
                            }
                        )
                    },
                shape = RoundedCornerShape(12.dp),
                color = if (brakePressed) F1Red else Color(0xFF4A1515).copy(alpha = 0.85f),
                border = androidx.compose.foundation.BorderStroke(2.dp, if (brakePressed) Color.White else F1Red.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("BRAKE", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
            }

            // Throttle Pedal
            Surface(
                modifier = Modifier
                    .width(62.dp)
                    .height(84.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .testTag("throttle_pedal")
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = {
                                throttlePressed = true
                                tryAwaitRelease()
                                throttlePressed = false
                            }
                        )
                    },
                shape = RoundedCornerShape(14.dp),
                color = if (throttlePressed) F1Green else Color(0xFF0F3D1F).copy(alpha = 0.85f),
                border = androidx.compose.foundation.BorderStroke(2.dp, if (throttlePressed) Color.White else F1Green.copy(alpha = 0.6f))
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("GAS", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                }
            }
        }
    }
}
