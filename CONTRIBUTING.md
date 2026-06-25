# Contributing to Glowmint

## Where does new code go?

| Layer | Path | Responsibility |
| --- | --- | --- |
| UI pages | `src/pages/` | Route composition only |
| Feature UI | `src/features/` | Colocated hooks + components per feature |
| API calls | `src/lib/api.ts` | All `invoke()` calls (DRY) |
| IPC | `src-tauri/src/state.rs` | Thin Tauri command handlers |
| Services | `src-tauri/src/services/` | Workflows across drivers |
| Domain | `src-tauri/src/domain/` | Pure types, traits, errors — no Tauri/USB imports |
| Drivers | `src-tauri/src/drivers/` | OpenRGB, liquidctl, ckb-next, LCD HID |

## Dependency rule

`domain/` must not import from Tauri, React, `hidapi`, or `openrgb2`.

## Commands

```bash
npm run tauri dev      # dev app
npm run build          # frontend build
cargo test             # Rust unit tests (from src-tauri/)
npm run lint           # eslint + prettier check
```

## Adding a new backend

1. Add trait method in `domain/traits/` if needed
2. Implement adapter in `drivers/`
3. Expose via service in `services/`
4. Add Tauri command in `state.rs`
5. Add typed wrapper in `src/lib/api.ts`
