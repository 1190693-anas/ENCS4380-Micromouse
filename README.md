# ENCS4380 Micromouse starter kit (HAL ENCS4380-2026/27-S1)

This kit is the only code you get. You write the maze solver (`solver.c`)
and the robot side of the HAL (`esp32/micromouse/hal_esp32.cpp`).

## What is in the kit

| File | What it is | Edit it? |
| --- | --- | --- |
| `mouse_hal.h` | The interface between your solver and the mouse. Read it fully. | No |
| `mm_internal.h`, `mm_common.c` | Logging and the map dump (shared by simulator and robot) | No |
| `hal_sim.c`, `main_sim.c` | The HAL for the mms simulator | No |
| `solver.c` | Your solver (empty template) | **Yes** |
| `example_wallfollow.c` | How to call the HAL. Not a solution. | No need |
| `esp32/micromouse/` | Arduino sketch; `hal_esp32.cpp` and `robot_config.h` are yours | **Yes** |
| `mazes/` | Practice mazes (`.txt`) with their goal (`.goal`) | Add your own |

The HAL files are replaced by the official copies when your code is graded,
so changing them never helps.

## Run your solver in the mms simulator

1. Install mms (https://github.com/mackorone/mms/releases) or use the
   course virtual machine on Moodle.
2. In mms, press **+** next to *Mouse* and fill in:
   - **Directory:** this folder
   - **Build command (Linux/VM):** `gcc -O2 -std=c99 -o solver main_sim.c hal_sim.c mm_common.c solver.c`
   - **Build command (Windows, MinGW):** same, but `-o solver.exe`
   - **Run command:** `./solver` (Windows: `solver.exe`)
3. Load a maze from `mazes/` with the *Maze* button and press **Run**.

Your `mm_log()` messages appear in the mms output panel. Never use
`printf()`: the simulator reads your standard output as commands.

If your mms version rejects `moveForward` with a number (old builds), add
`-DMM_SIM_SINGLE_STEPS` to the build command.

### Testing a different goal

mms always draws the goal in the centre, but hidden test mazes may put the
goal elsewhere. Copy the maze's `.goal` file to `mm_goal.txt` in this folder
(or set the environment variable `MM_GOAL=x0,y0,x1,y1`). `mm_maze()` then
returns that goal. Delete `mm_goal.txt` to go back to the centre.

## The rules of the HAL

- `solver.c` includes only `mouse_hal.h` and standard C headers.
- It calls only `mm_...` functions. No mms `API_...` calls, no Arduino calls.
- It reads the maze size and goal from `mm_maze()`. Never hard-code 8x8 or
  the centre.
- The HAL does not know where the mouse is. Your solver tracks x, y and
  heading after every `mm_forward()` and `mm_turn()`.
- `mm_sense()` is **relative** (left, front, right). Converting it into
  absolute walls (north, east, south, west) is your job.
- Store walls with `MM_WALL(dir)`. The bit values change every semester;
  code with hard-coded numbers gives a wrong map dump.
- After every run, report your map: `mm_map_begin()`, `mm_map_cell()` for
  every cell, `mm_map_end()`. The dump is checked against the real maze.
  A wall you report wrongly costs marks; a side you never saw should be
  reported as unknown (leave it out of `known`).

## Moving to the robot (Phase 3 onward)

1. Install the Arduino IDE and the ESP32 board package (Espressif).
2. Run `make sync` (or copy by hand) to put `mouse_hal.h`, `mm_internal.h`,
   `mm_common.c` and `solver.c` into `esp32/micromouse/`.
3. Open `esp32/micromouse/micromouse.ino`.
4. Fill in `robot_config.h` and write the TODOs in `hal_esp32.cpp`, one
   milestone at a time (M3 sensors and pins, M4 encoders, M5 straight line,
   M6 turns, M7 wall sensing and reset).
5. Your `solver.c` must build here **without any change**. If it needs one,
   the problem is in your HAL, not in the solver.

Keep `MM_RADIOS_ENABLED 0` in `robot_config.h` for every competition run:
the rules forbid outside signals during a run.
