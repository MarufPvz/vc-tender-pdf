# Tender Package Builder (VC Tender PDF)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-vc--tender--pdf.vercel.app-indigo?style=for-the-badge&logo=vercel)](https://vc-tender-pdf.vercel.app/)

A privacy-focused, browser-based web application for compiling, verifying, and assembling official tender submission PDF packages.

🌐 **Live Application**: [https://vc-tender-pdf.vercel.app/](https://vc-tender-pdf.vercel.app/)

---

## Key Features

- **100% Local & Secure**: All PDF processing, text extraction, validation, and PDF compilation take place strictly inside your browser. No files or document data are uploaded to external servers.
- **Smart Requirement Matching**: Upload a `requirements.json` file (or load the sample tender data) and your supporting PDFs. The app automatically suggests document assignments using keyword matching and detected document years.
- **Validation & Expiry Checks**: Automatically identifies missing required documents, unreadable scanned files, duplicate uploads, and certificates expiring before the tender submission deadline.
- **Automated PDF Package Generation**: Assembles all assigned PDF documents in strict requirement order, generates an official cover page, and applies dynamic page numbering (`Page X of Y`) across the entire compiled package.
- **CSV Checklist Export**: Download a detailed verification checklist in CSV format for audit and compliance records.
- **Bilingual Support**: Toggle seamlessly between **English** and **Bangla** (`বাংলা`) interface modes.
- **Session Persistence**: Save and restore your current tender matching workspace state to local browser storage at any time.

---

## Screenshots & Output Samples

### Screenshots
Application screenshots are available in the [`screenshots/`](./screenshots) folder:
- **[screenshots/Screenshot Status 1.png](./screenshots/Screenshot%20Status%201.png)**: Workspace interface showing requirement checklist, document matching status, and upload panels.
- **[screenshots/Screenshot Status 2.png](./screenshots/Screenshot%20Status%202.png)**: Auto-match review modal and package readiness status panel.

### Output Files
Sample generated submission files are available in the [`output/`](./output) folder:
- **[output/T-2026-0417_Package.pdf](./output/T-2026-0417_Package.pdf)**: Sample finalized combined tender PDF package.
- **[output/T-2026-0417_Checklist.csv](./output/T-2026-0417_Checklist.csv)**: Sample exported checklist in CSV format.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **PDF Manipulation**: [`pdf-lib`](https://pdf-lib.js.org/) (Merging & page numbering), [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) (Browser-side text extraction & rendering)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MarufPvz/vc-tender-pdf.git
   cd vc-tender-pdf
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

MIT License. Processed locally in browser for maximum privacy and security.
