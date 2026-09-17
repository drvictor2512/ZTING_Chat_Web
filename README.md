# Zting Chat Web

> React web client for **Zting Chat**, a real-time AI chat application.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

## Overview

Zting Chat Web is the browser client for the Zting Chat platform. It connects to the Node.js backend through REST APIs and Socket.io to provide fast, responsive messaging for individual and group conversations.

## 🔗 Related Repositories

- [ChatApp-Backend](https://github.com/drvictor2512/ChatApp-Backend) - REST API and Socket.io server
- [ZTING_Chat_APP](https://github.com/drvictor2512/ZTING_Chat_APP) - React Native and Expo mobile client

## ✨ Key Features

- 💬 Real-time one-to-one and group messaging
- 🤖 Gemini-powered AI chat experience
- 📎 Media and file sharing through AWS S3-backed APIs
- 🔐 Secure login and account flows
- 🔔 Live conversation updates through Socket.io
- 🖥️ Responsive browser-based interface

## Tech Stack

- ReactJS 18
- Vite
- TailwindCSS
- Axios
- Socket.io Client
- React Router
- React Icons and React Hot Toast


## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- A running instance of the [Zting Chat Backend](https://github.com/drvictor2512/ChatApp-Backend)

### Installation

```bash
git clone https://github.com/drvictor2512/ZTING_Chat_Web.git
cd ZTING_Chat_Web
npm install
```

Configure the API and Socket.io base URLs using the environment variable names expected by the client configuration.

### Run in Development

```bash
npm run dev
```

Open the local Vite URL displayed in the terminal.

### Build for Production

```bash
npm run build
npm run preview
```

## License

A license has not been specified yet. Add a license file before distributing this software publicly.
