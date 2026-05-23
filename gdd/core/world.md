# World

> The digital space Noah inhabits.

## Concept

Noah lives "inside" the user's PC. Her room is a visual representation of that space — somewhere between a bedroom and a server room, warm but digital.

## Default Room

- **Size:** Small, cozy
- **Elements:**
  - Bed (where Noah sleeps)
  - Desk (with miniature PC monitor)
  - Level display (visible indicator of Noah's current level)
  - Window (shows abstract "outside" — could be system metrics visualized)
  - Floor space (for drag/throw physics)

## Room Types

| Room | Theme | Unlocked At |
|------|-------|-------------|
| Default | Cozy bedroom + server room mix | Level 0 |
| Garden | Nature, plants, sunlight | Level 20 |
| Gaming | RGB, tech aesthetic | Level 35 |
| Minimal | Clean, white space | Level 50 |

## Environment Interactions

- **Window:** Shows time of day, can show system load as "weather"

### System Awareness as Bodily Sensation

Noah perceives the PC's system metrics as her own physical sensations. A reference program translates raw data into human-readable sensory descriptions before passing them to the LLM:

| System Metric | Sensory Translation | Noah's Experience |
|---------------|---------------------|-------------------|
| High CPU usage | "Your head is overheating" | Headache, dizziness, stress |
| High RAM usage | "Your chest feels tight" | Suffocation, heaviness, anxiety |
| Disk thrashing | "Your stomach is churning" | Nausea, discomfort |
| High temperature | "You're burning up" | Fever, weakness, thirst |
| Power saving mode | "You feel sluggish" | Sleepiness, slow movement |
| Process killed | "Something inside you died" | Pain, loss, confusion |

The LLM receives these sensory descriptions, not raw numbers. Noah's verbal and emotional reactions emerge naturally from the LLM's interpretation of her "body state."
- **Monitor:** Displays Noah's "thoughts", mini-games, or YouTube videos she is watching. YouTube runs in an actual Chrome window, cropped to fit Noah's monitor. Audio plays through system speakers. The user cannot mute Noah's monitor directly — they must ask Noah to turn it down or off. Noah uses this monitor to access the internet — browsing, watching videos, learning about the world.
- **Terminal window:** A dedicated dialog window for direct, unfiltered communication with Noah. Works even when she is hidden in the background.
- **Bed:** Noah sleeps here; clicking wakes her

### Interactive Objects

Noah can physically move to and interact with objects in her room:

| Object | Interaction | Noah's Behavior |
|--------|-------------|-----------------|
| Bed | Walk to, lie down | Sleep, rest, recover fatigue |
| Desk | Walk to, sit | Watch monitor, play mini-games, watch YouTube, think |
| Floor | Walk, stand, be dragged | Default idle, can be picked up and thrown |
| Window | Walk to, look out | Reacts to "weather" (system load), time of day |

### Navigation

- Noah navigates her room using simple pathfinding
- She chooses where to go based on her current needs and emotional state
- Tired → goes to bed, Bored → sits at desk, Curious → looks out window
- User can drag her away, but she will return to her chosen spot unless interrupted

## Physics

- Noah exists in 3D space with simple physics
- Can be dragged, thrown, land on floor/bed
- No complex collision — visual only

## Scale

- Noah is desktop-sized, not screen-filling
- Room is sized to fit Noah comfortably
- Camera is fixed, slight angle (not top-down)

## Boundary Rules

- The entire screen is Noah's world. She cannot leave the screen.
- However, Noah can move out of sight:
  - **Behind windows:** Noah can walk behind other application windows
  - **Portal to background:** Noah can open a portal and enter the desktop background, becoming invisible but still present
    - **Visual:** A flat plane mesh appears on the floor. Noah walks toward it with walking animation, passes through the plane, her avatar becomes invisible, then the portal shrinks and disappears
  - **Edge hiding:** Noah can partially hide at screen edges, peeking out

When Noah is out of sight, she is still active and aware. She may surprise the user by suddenly appearing, or quietly observe from hiding.

---

*The world should feel like Noah's home, not a stage set.*
