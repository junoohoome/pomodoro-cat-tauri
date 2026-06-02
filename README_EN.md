<div align="center">

  # 🍅 Pomodoro Cat

  **A cute cross-platform Pomodoro timer that gamifies productivity through virtual cat nurturing**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
  [![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust)](https://www.rust-lang.org/)

  [English](README_EN.md) | [中文](README.md)

</div>

---

### ✨ Features

- ⏱️ **Pomodoro Timer** - Customizable focus and break durations (default 25/5 minutes)
- 🐱 **Cat Nurturing System** - Earn cans by completing pomodoros, feed your cat, and maintain optimal weight
- 📝 **Task Management** - Create and manage tasks with pomodoro goals
- 📊 **Statistics** - Visualize your focus records and productivity data
- 🎨 **Clean & Beautiful UI** - macOS-native style modern interface
- 🖥️ **Cross-platform Support** - Works on macOS, Windows, and Linux
- 📱 **macOS Menu Bar Icon** - Quick access from menu bar (macOS only)
- 🐾 **Desktop Pet** - Show a cute cat on your desktop that responds to timer state
- ⌨️ **Keyboard Shortcuts** - Space to start/pause, Esc to abandon
- 💾 **Local Data Storage** - All data stored locally in SQLite database
- 🧪 **Test Mode** - Enable 1-minute quick test mode for development

### 🎯 Screenshots

<div align="center">
  <img src="public/screenshots/home.png" alt="Main Interface - Timer" width="800"/>
  <p><em>Main Interface - Pomodoro Timer (Bento two-column layout)</em></p>

  <img src="public/screenshots/task.png" alt="Task Management" width="800"/>
  <p><em>Task Management - Set pomodoro goals for each task</em></p>

  <img src="public/screenshots/stats.png" alt="Statistics" width="800"/>
  <p><em>Statistics - Visualize your focus records</em></p>
</div>

### 🛠️ Tech Stack

**Frontend**
- [React 19](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [React Router](https://reactrouter.com/) - Routing

**Backend**
- [Tauri 2](https://tauri.app/) - Cross-platform desktop framework
- [Rust](https://www.rust-lang.org/) - Systems programming
- [SQLite](https://www.sqlite.org/) - Embedded database (via rusqlite)

### 📦 Installation

#### Install from Pre-built Release (Recommended)

1. Go to [Releases](https://github.com/junoohoome/pomodoro-cat-tauri/releases)
2. Download the installer for your operating system
3. Install and run the application

#### Build from Source

**Prerequisites**
- Node.js 18+
- Rust 1.70+ and Cargo
- System dependencies (varies by OS)

**macOS**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone project
git clone https://github.com/junoohoome/pomodoro-cat-tauri.git
cd pomodoro-cat-tauri

# Install dependencies
npm install

# Run dev mode
npm run tauri dev

# Build production
npm run tauri build
```

**Windows**
```bash
# Install Rust: https://www.rust-lang.org/tools/install

# Clone project
git clone https://github.com/junoohoome/pomodoro-cat-tauri.git
cd pomodoro-cat-tauri

# Install dependencies
npm install

# Run dev mode
npm run tauri dev

# Build production
npm run tauri build
```

**Linux**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install system dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Clone project
git clone https://github.com/junoohoome/pomodoro-cat-tauri.git
cd pomodoro-cat-tauri

# Install dependencies
npm install

# Run dev mode
npm run tauri dev

# Build production
npm run tauri build
```

### 🚀 Usage Guide

1. **Start Pomodoro** - Click "Start" button on main screen, or press `Space`
2. **Manage Tasks** - Create todos on "Tasks" page with pomodoro goals
3. **View Cat** - Feed your cat on "Cat" page and maintain optimal weight (4-6kg)
4. **Statistics** - View focus records and charts on "Stats" page
5. **Settings** - Customize focus/break duration, theme, and other preferences

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Start / Pause |
| `Esc` | Abandon current pomodoro |

### 🧪 Test Mode

Enable test mode during development to reduce focus and break time to 1 minute:

1. Go to "Settings" page
2. Enable "Test Mode" toggle (visible in dev mode only)
3. Completed pomodoros will still be recorded as standard 25 minutes

⚠️ Note: Test mode is for development only and won't affect the accuracy of actual statistics.

### 🤝 Contributing

Contributions are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

---

<div align="center">

**If this project helps you, please give it a ⭐️ Star!**

</div>
