# PDFTools4U

![PDFTools4U Banner](public/og-card.png)

**PDFTools4U** is a comprehensive, privacy-first web application offering a suite of 40+ advanced PDF, image, and document manipulation tools. Built entirely on client-side web technologies, it ensures that your files never leave your device. All processing happens locally in your browser, guaranteeing 100% data privacy and security.

🔗 **Live Application:** [pdftools4u.in](https://www.pdftools4u.in/)

---

## 🌟 Key Features

- **🛡️ 100% Privacy-First:** No servers, no uploads. Every operation is executed natively in your browser using modern WebAssembly (WASM) and JavaScript engines.
- **⚡ High Performance:** Engineered with intelligent code-splitting, dynamic module loading, and optimized Web Workers to ensure blazing-fast Time to Interactive (TTI) and seamless processing, targeting a 90+ Google PageSpeed Insights score.
- **🎨 Modern UI/UX:** A beautiful, responsive, and intuitive interface built with React, Tailwind CSS, and Lucide Icons.
- **🛠️ 40+ Powerful Tools:** Ranging from basic PDF merging to advanced OCR, interactive PDF annotation, and document format conversions.

---

## 🧰 Tool Categories

### 📄 PDF Manipulation
- **Merge PDF:** Combine multiple PDFs into a single document.
- **Split & Extract:** Separate a PDF into individual pages or extract specific ranges.
- **Compress PDF:** Reduce file size while maintaining visual quality.
- **Annotate & Edit:** Add text, shapes, redactions, and freehand drawings natively to PDFs.
- **Protect & Unlock:** Encrypt PDFs with passwords or remove restrictions.
- **Watermark:** Overlay custom text or image watermarks onto documents.
- **Sign PDF:** Add digital signatures or draw your signature on the fly.
- **Organize & Rotate:** Reorder, rotate, or delete specific pages easily.

### 🔄 Document Converters
- **PDF to Word / Word to PDF:** Convert between PDF and editable DOCX formats.
- **PDF to Excel / Excel to PDF:** Extract tabular data into spreadsheets or vice versa.
- **PDF to PPT:** Convert presentations smoothly.
- **PDF to Image (JPG/PNG):** Render PDF pages as high-quality images.
- **Image to PDF:** Compile JPEGs, PNGs, and HEICs into a single PDF document.

### 🔍 Advanced Utilities
- **PDF OCR:** Optical Character Recognition powered by `tesseract.js` to extract text and make scanned documents fully searchable.
- **Image Editor:** Crop, resize, compress, and remove backgrounds from images natively.
- **Data Converters:** Format JSON, XML, CSV, and more.

---

## 🏗️ Technology Stack

This project leverages modern frontend architecture to achieve heavy data processing without backend dependencies.

* **Core Framework:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **PDF Processing:** 
  * [`pdf-lib`](https://pdf-lib.js.org/) (Creation, modification, merging)
  * [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) (Rendering, text extraction, visual layout)
* **Document Parsing/Creation:** `docx`, `xlsx`, `pptxgenjs`
* **Optical Character Recognition (OCR):** [`tesseract.js`](https://tesseract.projectnaptha.com/)
* **Analytics & Performance:** Google Analytics (GA4), Microsoft Clarity, custom client-side Micro-Feedback tracking.

---

## 🚀 Getting Started (Development)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `npm` installed.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/quickToolBox.git
   cd quickToolBox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

### Building for Production

To create an optimized production build:
```bash
npm run build
```
This command leverages Rolldown to heavily optimize the bundle, generating distinct asynchronous chunks for massive libraries like `pdfjs-dist` and `tesseract.js` to ensure ultra-fast initial page loads.

You can preview the built files locally:
```bash
npm run preview
```

---

## 🔒 Privacy & Security Architecture

Unlike traditional PDF manipulation websites that upload your highly sensitive documents (invoices, legal contracts, personal IDs) to a remote server, **PDFTools4U** utilizes modern browser APIs (`FileReader`, `ArrayBuffer`, and Web Workers) to process files strictly in-memory on the client's device. 

- **No Uploads:** Files are read directly from your local file system.
- **No Storage:** Once you close the tab, the data is completely wiped from memory.
- **No Tracking of Document Data:** While anonymous usage analytics are collected (to track tool popularity and UX errors), the contents of your documents are never read, transmitted, or logged.

---

## 📄 License

This project is open-source. Feel free to fork, modify, and contribute to the project on GitHub!

---

*Built with passion for digital privacy and seamless user experiences.*
