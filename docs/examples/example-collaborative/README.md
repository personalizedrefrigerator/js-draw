# example-collaborative

[script.ts](./script.ts) | [server.py](./server.py)

This example shows how to serialize `js-draw` commands (e.g. `AddElementCommand`), send them to a server, and deserialize them.

> [!NOTE]
>
> Serialization/deserialization of `Command`s is **not** as well tested as other parts of `js-draw`. If you encounter bugs, [please report them](https://github.com/personalizedrefrigerator/js-draw/issues).
