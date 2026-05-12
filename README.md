# Gode TPS Demo

Third person shooter demo made using [Godot Engine](https://godotengine.org) and TypeScript([Gode](https://github.com/godothub/gode)).

![Screenshot of TPS demo](screenshots/screenshot.webp)


## Running

You need [Godot Engine](https://godotengine.org) to run this demo project.

This project uses TypeScript scripts through [Gode](https://github.com/godothub/gode).
Install Gode 1.7 or newer into `addons/gode` before opening the project.

TypeScript source files are attached in scenes as `res://*.ts`. Gode loads their compiled JavaScript from `res://dist`, so build once before running or keep the watcher open while editing:

```bash
npm install
npm run build
```

## Controls

- Mouse or <kbd>Gamepad Right Stick</kbd>: Look around
- <kbd>W</kbd>/<kbd>A</kbd>/<kbd>S</kbd>/<kbd>D</kbd>, <kbd>Arrow keys</kbd>, <kbd>Gamepad Left Analog Stick</kbd> or <kbd>Gamepad D-Pad</kbd>: Move
- <kbd>Space</kbd>, <kbd>Gamepad A/Cross</kbd>: Jump
- <kbd>Right Mouse Button</kbd>, <kbd>Gamepad Left Trigger (L2)</kbd> (press to toggle, or hold and release): Aim
- <kbd>Left Mouse Button</kbd>, <kbd>Gamepad Right Trigger (R2)</kbd>: Shoot (only while aiming)
- <kbd>Escape</kbd>, <kbd>Gamepad Start</kbd>: Go to main menu/quit
- <kbd>F11</kbd> or <kbd>Alt + Enter</kbd>: Toggle fullscreen
- <kbd>F3</kbd>: Toggle debugging information (such as FPS counter)

## Useful links

- [Main website](https://godothub.com)
- [Godot website](https://godotengine.org)
- [Documentation](http://docs.godotengine.org)
- [Gode Project](https://github.com/godothub/gode)
- [Original Code](https://github.com/godotengine/tps-demo)
> git checkout e3bfd239fd53479eb6b7ea565f6f0732937c1c1f

## License

See [LICENSE.md](LICENSE.md) for details.
