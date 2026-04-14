# Snake Game

A modern, responsive Snake game built with pure HTML, CSS, and modular JavaScript. Features a dark neon design with a glassmorphism interface, entirely self-contained without needing external assets.

## Features

* **Canvas Rendering:** Uses HTML5 Canvas (`<canvas>`) and `requestAnimationFrame` for a smooth game loop.
* **Responsive Design:** Automatically scales to fit different screen sizes while maintaining a strict logical grid. Works on both mobile and desktop.
* **Cross-Platform Controls:** Supports keyboard inputs (Arrow keys, WASD, Spacebar) as well as touch swipe gestures for mobile devices.
* **Modern UI:** Built with CSS Variables, drop shadows, and `backdrop-filter` for a premium glass and neon aesthetic.
* **Self-Contained Audio:** Utilizes the Web Audio API to synthesize bite and game-over sounds on the fly.
* **State Management:** Fully handles Play, Pause, Game Over menus and persists your High Score locally using `localStorage`.

## Setup

Since the app uses no frameworks or build tools, simply running an HTTP server is enough.

1. Clone or download the source code files.
2. Serve the directory with a local HTTP server. For example, using Python:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your web browser.

## Controls

* **Desktop:**
  * Move: Arrow Keys or W/A/S/D
  * Pause/Resume: Spacebar

* **Mobile/Touch:**
  * Move: Swipe Up, Down, Left, or Right on the game area
  * Pause/Resume: Tap on the game area

## Structure

* `index.html`: The markup structure containing the UI and the Canvas element.
* `style.css`: The styling definitions including responsive layouts, neon colors, and glassmorphism.
* `script.js`: The central game logic handling loops, rendering, storage, input, and audio synthesis.
