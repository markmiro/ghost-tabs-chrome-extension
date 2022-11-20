To run, make sure `serve` is installed:

```sh
$ npm install -g serve
```

To run:

```sh
$ serve .
```

It should show multiple `.html` files and clicking on them should show the various favicon demos.

Notes from my testing:

- 64px icon is added to be exhaustive, but the browser shouldn't ever pick it.
- Chrome doesn't ever choose the 16px favicon unless it's a .ico file. Then, if the `window.devicePixelRatio === 1`, it uses the 16px variation.
- It doesn't always select the larger icon. If a 64px icon is available, it still picks the 32px icon.
- In `<link rel="alternate icon" href="foo.bar">`, the `alternate` does nothing.
- ICO + PNG, picks ICO at 16px. When adding `sizes="16x16"` to the ico link, the browser confusingly picks the 32px PNG icon instead.

Resources:

- [favicon-cheat-sheet — Chrome picks ico over png](https://github.com/audreyfeldroy/favicon-cheat-sheet#:~:text=Chrome%20and%20Safari%20may%20pick%20ico%20over%20png%2C%20sadly)
- [favicon-cheat-sheet — forcing favicon refresh](https://github.com/audreyfeldroy/favicon-cheat-sheet#forcing-a-favicon-refresh)
