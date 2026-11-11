package com.example.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.game.audio.RacingAudio
import com.example.ui.theme.CarbonCard
import com.example.ui.theme.F1Green
import com.example.ui.theme.F1Red
import kotlinx.coroutines.delay

@Composable
fun StartLightsSequence(
    audio: RacingAudio?,
    onLightsOut: () -> Unit,
    onFalseStart: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var illuminatedLights by remember { mutableIntStateOf(0) }
    var lightsOut by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        // Step through 5 lights sequentially
        for (i in 1..5) {
            delay(1000L)
            illuminatedLights = i
            audio?.playBeep(highPitch = false)
            audio?.vibrate(25)
        }

        // Random delay between 1.2s and 3.2s before lights out!
        val randomWait = (1200L + (Math.random() * 2000L).toLong())
        delay(randomWait)

        // Lights out!
        illuminatedLights = 0
        lightsOut = true
        audio?.playBeep(highPitch = true)
        audio?.vibrate(60)
        onLightsOut()
    }

    Surface(
        color = CarbonCard.copy(alpha = 0.92f),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF333A44)),
        modifier = modifier.testTag("start_lights_gantry")
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = if (lightsOut) "LIGHTS OUT & AWAY WE GO!" else "STARTING SEQUENCE",
                color = if (lightsOut) F1Green else Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            // 5 Light Pods
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (lightIndex in 1..5) {
                    val isOn = illuminatedLights >= lightIndex
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(if (isOn) F1Red else Color(0xFF221111))
                            .border(
                                width = 3.dp,
                                color = if (isOn) Color(0xFFFF8888) else Color(0xFF442222),
                                shape = CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isOn) {
                            Box(
                                modifier = Modifier
                                    .size(14.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.8f))
                            )
                        }
                    }
                }
            }
        }
    }
}
