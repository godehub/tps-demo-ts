# Gode TPS Demo

Third person shooter demo made using [Godot Engine](https://godotengine.org) and TypeScript([Gode](https://github.com/godothub/gode)).

![Screenshot of TPS demo](screenshots/screenshot.webp)


## Running

You need [Godot Engine](https://godotengine.org) to run this demo project.

This project uses TypeScript scripts through [Gode](https://github.com/godothub/gode).
Install Gode 2.1.0 or later into `addons/gode` before opening the project. The demo uses explicit named imports from the `godot` module and does not rely on global Godot API names.

TypeScript source files are attached in scenes as `res://*.ts`. Gode compiles them automatically with the TypeScript compiler bundled in the plugin, so this demo does not require `package.json`, `node_modules`, `npm install`, or a separate build step.
Local TypeScript modules use extensionless relative imports such as `../scripts/godot_math`; Gode maps them to the compiled ESM output at runtime.

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
