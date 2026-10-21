/* tslint:disable */
/* eslint-disable */

/**
 * Entry point invoked from JS once the player has selected their game
 * folder. `files` is a plain object mapping each file's basename to a
 * `Uint8Array` of its bytes. Returns a Promise (async).
 */
export function start_game(files: object): Promise<void>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly start_game: (a: any) => any;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_3c7b597d41f30e96___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___js_sys_c1649d7935d9af8a___Array__web_sys_e13a289a7986b74b___features__gen_ResizeObserver__ResizeObserver______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___js_sys_c1649d7935d9af8a___Function_fn_wasm_bindgen_3c7b597d41f30e96___JsValue_____wasm_bindgen_3c7b597d41f30e96___sys__Undefined___js_sys_c1649d7935d9af8a___Function_fn_wasm_bindgen_3c7b597d41f30e96___JsValue_____wasm_bindgen_3c7b597d41f30e96___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__4: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__5: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__6: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__7: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__8: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__9: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke___wasm_bindgen_3c7b597d41f30e96___JsValue______true__1__10: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_3c7b597d41f30e96___convert__closures_____invoke_______true_: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
