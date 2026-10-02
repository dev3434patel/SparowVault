import { register } from "node:module";

register(new URL("./mysql2-spy-hooks.mjs", import.meta.url).href, import.meta.url);
