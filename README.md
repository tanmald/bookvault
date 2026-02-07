# BookVault 📚

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com)
[![AI Powered](https://img.shields.io/badge/AI-Powered-FF6F61)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen)](https://github.com/tanmald/bookvault)

**Your personal digital library. Share your reading journey with friends.**

Tired of losing track of your digital books? BookVault is your new home for beautifully organized reading. Upload your EPUB and PDF files once, and watch AI extract book details automatically—no more manual data entry. Invite friends, track your progress, compare reading achievements, and never lose a book again.

<div align="center">

[🚀 **Try BookVault Live**](https://bookvault-kappa.vercel.app) · [📖 Documentation](#getting-started) · [💡 Features](#features) · [🔄 Latest Release](https://github.com/tanmald/bookvault/releases)

</div>

---

## Table of Contents

- [Why BookVault?](#why-bookvault)
- [✨ Features](#features)
- [🚀 Quick Start](#quick-start)
- [📱 Mobile-First Design](#mobile-first-design)
- [🛠️ Tech Stack](#tech-stack)
- [🎯 Target Users](#target-users)
- [🤝 Contributing](#contributing)
- [📄 License](#license)

---

## Why BookVault?

Your books deserve better than scattered folders and manual spreadsheets.

**The Problem:** Digital book collections are messy. You download EPUBs and PDFs, they end up in random folders, and you can't remember what you've read or where you saved it.

**The Solution:** BookVault uses AI to automatically organize your library. Upload your books, and we handle the rest—extracting titles, authors, genres, and cover images. Share collections with friends, track your reading progress, and access everything from any device.

**What makes it different:**
- 🤖 **AI-powered metadata extraction** — No manual data entry. Just upload and go
- 👥 **Social reading features** — See what friends are reading, compare progress, celebrate milestones
- 📱 **Beautiful on every device** — Fully responsive with zero horizontal scroll
- 🔒 **Privacy-first** — You control who sees your books and reading progress
- 🌍 **Multi-language** — Available in English and Portuguese
- 🎨 **Flexible layouts** — Grid, list, or Kanban view—pick your favorite way to browse

---

## ✨ Features

### 🤖 AI-Powered Organization
Watch your library organize itself automatically:
- **Smart Metadata Extraction** — AI extracts titles, authors, genres, and cover images from your EPUB/PDF files
- **Drag-and-Drop Upload** — Simply drag files in, and your library comes to life
- **Multiple Libraries** — Create separate collections for different purposes (personal, work, book clubs, research)

### 📖 Track Your Reading Journey
Never lose track again:
- **Reading Status** — Mark books as "Not Planned," "Want to Read," "Reading," or "Completed"
- **Progress Tracking** — Track your reading percentage (0-100%) as you read
- **Finish Dates** — Record and edit when you finished each book
- **Reading Stats** — See your reading history and completion dates at a glance

### 👥 Compare & Share
Your reading journey, with friends:
- **Friends Scoreboard** — See yourself ranked with friends who finished the same books (sorted by who finished first)
- **Book Reviews** — Rate books with 1-5 stars and leave reviews
- **Social Sharing** — Invite friends with secure, private links
- **Activity Feed** — Follow what friends are reading, finishing, and reviewing
- **Perfect for Book Clubs** — Share reading lists and track group progress

### 🎨 Beautiful & Responsive
Built for readers, by readers:
- **Three View Options** — Grid, list, or Kanban layouts—choose what works for you
- **Fully Mobile-Optimized** — Zero horizontal scroll on phones, tablets, or desktop
- **Light & Dark Themes** — Choose what's comfortable for your eyes
- **Collapsible Filters** — Smart filter UI that adapts to your screen size
- **Dark Mode Support** — System-aware theme detection

### 🔗 Kobo Integration
Connect your reading with your e-reader:
- **Send to Kobo** — Transfer books directly to your Kobo device with one click
- **URL Shortening** — Easy-to-type shortened links for transferring
- **Seamless Transfer** — Download starts automatically on your Kobo

---

## 🚀 Quick Start

Get your library organized in 3 minutes:

### 1️⃣ Create Your Account
Sign up with just your email—no credit card needed.

```
Visit https://bookvault-kappa.vercel.app → Sign up → Done ✅
```

### 2️⃣ Upload Your Books
Drag and drop your EPUB or PDF files. BookVault's AI will extract all details automatically.

```
Click "Add Book" → Drag files or select from device → AI extracts metadata → Library appears 📚
```

### 3️⃣ Invite Friends
Share your collection and start tracking reading progress together.

```
Go to Invites → Create invite link → Share with friends → See their progress in real-time 👥
```

---

## 📱 Mobile-First Design

BookVault is built mobile-first:
- ✅ **Zero horizontal scroll** — Optimized layout fits any screen size perfectly
- ✅ **Touch-optimized UI** — Drag-and-drop, long-press drag, swipe navigation
- ✅ **Smart filtering** — Filters collapse on small screens to maximize content
- ✅ **Offline support** — (Coming soon) Read your books offline
- ✅ **Fast load times** — Vite + lazy loading ensures snappy performance

---

## 🛠️ Tech Stack

**Frontend:**
- **[React 18](https://react.dev)** — Modern, declarative UI library
- **[TypeScript](https://www.typescriptlang.org)** — Type-safe development
- **[Vite](https://vitejs.dev)** — Lightning-fast build tool
- **[TanStack Query](https://tanstack.com/query)** — Server state management & caching
- **[Tailwind CSS](https://tailwindcss.com)** — Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com)** — Accessible React components
- **[@dnd-kit](https://docs.dndkit.com/)** — Drag-and-drop library for Kanban board

**Backend & Services:**
- **[Supabase](https://supabase.com)** — Backend as a Service (Auth, PostgreSQL, Real-time, Storage)
- **[OpenAI GPT-4](https://openai.com)** — AI for metadata extraction and genre detection
- **[Vercel](https://vercel.com)** — Deployment & hosting

**Architecture:**
- **PostgreSQL** — Relational database for books, users, reading progress, reviews
- **Real-time Subscriptions** — Live updates when friends add books or finish reading
- **Edge Functions** — Serverless functions for AI metadata extraction
- **Role-Based Access** — Library owners, admins, and members with different permissions

---

## 🎯 Target Users

BookVault is perfect for:

- **📚 Avid Readers** — Manage large digital collections with beautiful organization
- **👥 Book Clubs** — Share reading lists and track group progress in real-time
- **🌍 Digital Nomads** — Access your entire library from anywhere
- **🎓 Students & Researchers** — Organize academic PDFs and textbooks
- **💫 Social Readers** — Compare progress with friends and celebrate reading milestones
- **❓ Anyone** who has ever lost a book, forgotten where they saved it, or wanted to share reading recommendations

---

## 🤝 Contributing

We love contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is welcome.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/tanmald/bookvault.git
cd bookvault

# Install dependencies
npm install

# Create .env file with Supabase credentials
cp .env.example .env

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Available Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Before You Submit a PR

- Run `npm run lint` to check code style
- Run `npm run test` to ensure tests pass
- Update documentation if needed
- Write a clear commit message

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Found a Bug?

Please [open an issue on GitHub](https://github.com/tanmald/bookvault/issues) with:
- A clear description of the bug
- Steps to reproduce it
- Expected vs actual behavior
- Screenshots (if relevant)
- Your browser/device info

---

## 💡 Feature Requests

Have an idea? We'd love to hear it!

[Start a discussion](https://github.com/tanmald/bookvault/discussions) to share your thoughts and get feedback from the community.

---

## 📄 License

BookVault is open source and available under the [MIT License](LICENSE).

This means you're free to use, modify, and share BookVault for any purpose—personal or commercial.

---

## 🎉 Recent Updates

### v1.2.0 — Mobile Experience & Social Reading (Feb 7, 2026)
- ✅ **Zero horizontal scroll** — Fully responsive mobile design
- ✅ **See yourself in the scoreboard** — Compare your reading progress with friends
- ✅ **Edit finish dates** — Update when you finished a book
- ✅ **Better mobile filters** — Smart, collapsible filter UI
- ✅ **Library selector on mobile** — Switch libraries without scrolling

[View all releases](https://github.com/tanmald/bookvault/releases)

---

## 🙏 Credits

BookVault is built with ❤️ by book lovers, for book lovers.

Special thanks to:
- Our contributors and community members
- [Supabase](https://supabase.com) for the amazing backend
- [OpenAI](https://openai.com) for intelligent metadata extraction
- Everyone who reported bugs and requested features

---

<div align="center">

⭐ **If you like BookVault, please star this repository!** ⭐

It helps us reach more readers and shows your support for the project.

---

[🚀 Try BookVault](https://bookvault-kappa.vercel.app) · [📖 Docs](#documentation) · [🐛 Report Issue](https://github.com/tanmald/bookvault/issues) · [💡 Feature Request](https://github.com/tanmald/bookvault/discussions)

**Made with ❤️ for book lovers everywhere**

</div>
