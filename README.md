# Formula 1 Racing Android Game

A high-performance Formula 1 arcade racing simulator for Android built with Kotlin and Jetpack Compose.

## Features

### 🏎️ Playable 2D Circuit Grand Prix
- **Precision 2D Physics**: Realistic acceleration, top speed, braking friction, grass/gravel deceleration, and drift skid physics.
- **Rival AI Competitors**: Dynamic AI drivers (Scuderia, Silver Arrows, Papaya Speed, Bull Racing) racing for position, overtaking, and defending lines.
- **Circuit Layouts**: Monza (Temple of Speed), Monaco (Street Circuit), Silverstone (Flowing curves), and Spa-Francorchamps (Ardennes rollercoaster).
- **Tactical Mechanics**: ERS Energy Boost, DRS overtaking zones, tire wear degradation across Soft, Medium, and Hard compounds, and interactive Pit Stops.
- **Telemetry & Mini-Map**: Real-time radar mini-map tracking all cars, digital speedometer, gear indicator, LED rev lights, and lap timing.

### 🏁 Playable 3D Cockpit Speed Run
- **Pseudo-3D Perspective Engine**: High-speed road projection with undulating hills, banked turns, rumble kerbs, and distance-scaled scenery.
- **Slipstream Drafting**: Tucking directly behind rival cars provides aerodynamic drafting and a +25 km/h boost.
- **Titanium Sparks & Bottoming Out**: High-speed spark particles and camera lean into turns.
- **Dynamic Weather System**: Dry Sun, Golden Sunset, and Monsoon Rain with wet reflective roads and rain streaks.

### 🚦 Interactive Starting Lights & Mini-Game
- Authentic 5-Red-Lights sequence with random extinguishment ("Lights out and away we go!").
- Jump-start / False Start detection.
- Reaction Time Challenge testing driver reflexes down to the millisecond.

### 📊 Score Tracking & Leaderboards
- Persistent storage of best lap times per circuit.
- Top speed records and total race victories.
- Detailed race history log and reaction time records with reset support.

### 🔊 Procedural Audio & Haptics
- Pure low-latency `AudioTrack` PCM synthesis of screaming V6 turbo-hybrid engine whine, rev changes, tire screech, and starting beeps.
- Tactile haptic feedback on gear shifts, rumble strips, and collisions.
