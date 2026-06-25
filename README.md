# Glowmint

Linux-native Corsair control — an iCUE alternative for Mint and other distros.

Glowmint unifies:

- **Elite AIO LCD** — native Rust HID driver (images + GIFs)
- **Pump/fans** — [liquidctl](https://github.com/liquidctl/liquidctl)
- **RGB lighting** — [OpenRGB](https://gitlab.com/CalcProgrammer1/OpenRGB)
- **Keyboards/mice** — [ckb-next](https://github.com/ckb-next/ckb-next)

## Quick start

### Prerequisites

- Node.js 20+
- Rust (via rustup)
- Linux desktop deps for Tauri (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

### Development

```bash
npm install
npm run tauri dev
```

### System setup (Linux Mint)

```bash
chmod +x scripts/setup-mint.sh
sudo ./scripts/setup-mint.sh
```

Then start backends:

```bash
sudo systemctl enable --now ckb-next-daemon
openrgb --server --noautoconnect
```

### Identify your hardware

```bash
lsusb -d 1b1c:
```

Look for `0c39`/`0c33` (Elite LCD), `0c1c`/`0c32` (Commander Core).

## Architecture

Layered Tauri app: React UI → services → drivers → hardware. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
