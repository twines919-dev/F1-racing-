package com.example

import androidx.compose.runtime.Composable
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.game.model.Circuit
import com.example.game.model.RacingTeam
import com.example.game.model.WeatherCondition
import com.example.ui.game2d.Game2DScreen
import com.example.ui.game3d.Game3DScreen
import com.example.ui.hub.HubScreen

@Composable
fun MainNavigation() {
    val backStack = rememberNavBackStack(HubRoute)

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = entryProvider {
            entry<HubRoute> {
                HubScreen(
                    onStart2DGame = { circuit, team ->
                        backStack.add(Game2DRoute(circuit.id, team.name))
                    },
                    onStart3DGame = { circuit, team, weather ->
                        backStack.add(Game3DRoute(circuit.id, team.name, weather.name))
                    }
                )
            }
            entry<Game2DRoute> { route ->
                val circuit = Circuit.entries.find { it.id == route.circuitId } ?: Circuit.MONZA
                val team = RacingTeam.entries.find { it.name == route.teamName } ?: RacingTeam.SCUDERIA
                Game2DScreen(
                    circuit = circuit,
                    team = team,
                    onNavigateBack = { backStack.removeLastOrNull() }
                )
            }
            entry<Game3DRoute> { route ->
                val circuit = Circuit.entries.find { it.id == route.circuitId } ?: Circuit.MONZA
                val team = RacingTeam.entries.find { it.name == route.teamName } ?: RacingTeam.SCUDERIA
                val weather = WeatherCondition.entries.find { it.name == route.weatherName } ?: WeatherCondition.SUNNY
                Game3DScreen(
                    circuit = circuit,
                    team = team,
                    weather = weather,
                    onNavigateBack = { backStack.removeLastOrNull() }
                )
            }
        }
    )
}
