package com.example

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable
data object HubRoute : NavKey

@Serializable
data class Game2DRoute(
    val circuitId: String,
    val teamName: String
) : NavKey

@Serializable
data class Game3DRoute(
    val circuitId: String,
    val teamName: String,
    val weatherName: String
) : NavKey
