package com.example.game.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.sin

/**
 * Procedural low-latency audio synthesizer and haptics for F1 Racing.
 * Synthesizes engine V6 turbo whine, gear changes, tire skids, and race beeps.
 */
class RacingAudio(private val context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        manager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    private val isEnginePlaying = AtomicBoolean(false)
    private var engineTrack: AudioTrack? = null
    private var engineThread: Thread? = null

    @Volatile
    var currentRpmRatio: Float = 0.2f // 0.0 (idle) to 1.0 (redline)

    @Volatile
    var isTireSkidding: Boolean = false

    @Volatile
    var isMuted: Boolean = false

    fun startEngineSound() {
        if (isEnginePlaying.get() || isMuted) return
        isEnginePlaying.set(true)

        val sampleRate = 22050
        val bufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(2048)

        try {
            engineTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_GAME)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            engineTrack?.play()

            engineThread = Thread({
                val buffer = ShortArray(bufferSize / 2)
                var phase1 = 0.0
                var phase2 = 0.0
                var skidPhase = 0.0
                var rng = 1234567L

                while (isEnginePlaying.get()) {
                    if (isMuted) {
                        Thread.sleep(50)
                        continue
                    }

                    val rpm = currentRpmRatio.coerceIn(0.1f, 1.0f)
                    val baseFreq = 95.0 + (rpm * 440.0) // 95Hz idle to 535Hz high rev
                    val harmonicFreq = baseFreq * 2.5   // V6 Turbo whine

                    val step1 = 2.0 * Math.PI * baseFreq / sampleRate
                    val step2 = 2.0 * Math.PI * harmonicFreq / sampleRate
                    val skidActive = isTireSkidding

                    for (i in buffer.indices) {
                        phase1 += step1
                        if (phase1 > 2.0 * Math.PI) phase1 -= 2.0 * Math.PI

                        phase2 += step2
                        if (phase2 > 2.0 * Math.PI) phase2 -= 2.0 * Math.PI

                        // V6 Turbo engine tone = fundamental + high-pitched turbo whine + slight rumble
                        val sample1 = sin(phase1) * 0.5
                        val sample2 = sin(phase2) * 0.25
                        val rumble = sin(phase1 * 0.5) * 0.25
                        var combined = (sample1 + sample2 + rumble) * 0.65

                        // Tire screech sound (band-limited noise)
                        if (skidActive) {
                            rng = (rng * 1103515245L + 12345L) and 0x7fffffffL
                            val noise = ((rng shr 16) and 0xFFFF).toDouble() / 32768.0 - 1.0
                            skidPhase += 2.0 * Math.PI * 1800.0 / sampleRate
                            val screech = noise * sin(skidPhase) * 0.4
                            combined = (combined * 0.6) + screech
                        }

                        val shortVal = (combined * 14000.0).toInt().coerceIn(-32767, 32767).toShort()
                        buffer[i] = shortVal
                    }

                    engineTrack?.write(buffer, 0, buffer.size)
                }
            }, "F1-Engine-Synth").apply {
                priority = Thread.NORM_PRIORITY
                start()
            }
        } catch (_: Exception) {
            // AudioTrack fallback
        }
    }

    fun stopEngineSound() {
        isEnginePlaying.set(false)
        try {
            engineTrack?.pause()
            engineTrack?.flush()
            engineTrack?.release()
        } catch (_: Exception) {}
        engineTrack = null
        engineThread = null
    }

    fun playBeep(highPitch: Boolean) {
        if (isMuted) return
        Thread({
            try {
                val sampleRate = 22050
                val freq = if (highPitch) 880.0 else 440.0
                val durationMs = if (highPitch) 220 else 110
                val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
                val buffer = ShortArray(numSamples)
                var phase = 0.0
                val step = 2.0 * Math.PI * freq / sampleRate

                for (i in buffer.indices) {
                    phase += step
                    val envelope = 1.0 - (i.toDouble() / numSamples)
                    buffer[i] = (sin(phase) * envelope * 24000.0).toInt().toShort()
                }

                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_GAME)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(buffer.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                track.write(buffer, 0, buffer.size)
                track.play()
                Thread.sleep(durationMs.toLong() + 50)
                track.release()
            } catch (_: Exception) {}
        }).start()
    }

    fun playGearShiftPop() {
        vibrate(30)
        if (isMuted) return
        Thread({
            try {
                val sampleRate = 22050
                val numSamples = (sampleRate * 0.08).toInt()
                val buffer = ShortArray(numSamples)
                var rng = 987654321L
                for (i in buffer.indices) {
                    rng = (rng * 1103515245L + 12345L) and 0x7fffffffL
                    val noise = ((rng shr 16) and 0xFFFF).toDouble() / 32768.0 - 1.0
                    val env = (1.0 - (i.toDouble() / numSamples))
                    buffer[i] = (noise * env * 22000.0).toInt().toShort()
                }
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_GAME)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(buffer.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                track.write(buffer, 0, buffer.size)
                track.play()
                Thread.sleep(120)
                track.release()
            } catch (_: Exception) {}
        }).start()
    }

    fun vibrate(durationMs: Long) {
        try {
            vibrator?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    it.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    it.vibrate(durationMs)
                }
            }
        } catch (_: Exception) {}
    }

    fun vibrateRumble() {
        try {
            vibrator?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    it.vibrate(VibrationEffect.createOneShot(20, 80))
                } else {
                    @Suppress("DEPRECATION")
                    it.vibrate(20)
                }
            }
        } catch (_: Exception) {}
    }
}
