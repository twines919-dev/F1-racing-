package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.game.model.Circuit
import com.example.game.model.RaceRecord
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ScoreRepository(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("f1_racing_scores", Context.MODE_PRIVATE)

    fun getBestLapTimeMs(circuitId: String): Long {
        return prefs.getLong("best_lap_$circuitId", 0L)
    }

    fun getTopSpeedKmh(circuitId: String): Float {
        return prefs.getFloat("top_speed_$circuitId", 0f)
    }

    fun getReactionTimeBestMs(): Long {
        return prefs.getLong("reaction_time_best", 0L)
    }

    fun saveReactionTimeMs(ms: Long) {
        val currentBest = getReactionTimeBestMs()
        if (currentBest == 0L || ms < currentBest) {
            prefs.edit().putLong("reaction_time_best", ms).apply()
        }
    }

    fun saveRaceResult(
        circuit: Circuit,
        modeTag: String,
        bestLapMs: Long,
        topSpeedKmh: Float,
        teamName: String,
        wonRace: Boolean
    ) {
        val editor = prefs.edit()

        // Update circuit best lap
        val currentBest = getBestLapTimeMs(circuit.id)
        if (bestLapMs > 0 && (currentBest == 0L || bestLapMs < currentBest)) {
            editor.putLong("best_lap_${circuit.id}", bestLapMs)
        }

        // Update top speed
        val currentTop = getTopSpeedKmh(circuit.id)
        if (topSpeedKmh > currentTop) {
            editor.putFloat("top_speed_${circuit.id}", topSpeedKmh)
        }

        // Global stats
        val totalRaces = prefs.getInt("total_races", 0) + 1
        val wins = prefs.getInt("total_wins", 0) + (if (wonRace) 1 else 0)
        editor.putInt("total_races", totalRaces)
        editor.putInt("total_wins", wins)

        // Save history entry
        val historyJson = prefs.getString("race_history_json", "[]") ?: "[]"
        try {
            val jsonArray = JSONArray(historyJson)
            val newEntry = JSONObject().apply {
                put("circuitId", circuit.id)
                put("circuitName", circuit.displayName)
                put("mode", modeTag)
                put("bestLapMs", bestLapMs)
                put("topSpeedKmh", topSpeedKmh.toDouble())
                put("teamName", teamName)
                put("dateIso", SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()).format(Date()))
            }
            jsonArray.put(newEntry)
            // Keep last 25 records
            while (jsonArray.length() > 25) {
                jsonArray.remove(0)
            }
            editor.putString("race_history_json", jsonArray.toString())
        } catch (_: Exception) {}

        editor.apply()
    }

    fun getRaceHistory(): List<RaceRecord> {
        val list = mutableListOf<RaceRecord>()
        val historyJson = prefs.getString("race_history_json", "[]") ?: "[]"
        try {
            val jsonArray = JSONArray(historyJson)
            for (i in (jsonArray.length() - 1) downTo 0) {
                val obj = jsonArray.getJSONObject(i)
                list.add(
                    RaceRecord(
                        circuitId = obj.optString("circuitId", "monza"),
                        circuitName = obj.optString("circuitName", "Monza GP"),
                        mode = obj.optString("mode", "2D"),
                        bestLapMs = obj.optLong("bestLapMs", 0L),
                        topSpeedKmh = obj.optDouble("topSpeedKmh", 0.0).toFloat(),
                        teamName = obj.optString("teamName", "Scuderia Rosso"),
                        dateIso = obj.optString("dateIso", "")
                    )
                )
            }
        } catch (_: Exception) {}
        return list
    }

    fun getTotalRaces(): Int = prefs.getInt("total_races", 0)
    fun getTotalWins(): Int = prefs.getInt("total_wins", 0)

    fun clearAllScores() {
        prefs.edit().clear().apply()
    }
}
