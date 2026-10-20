# document-signer-app# Document Signer App 📄✍️

A lightweight, web-based document signer and viewer application built with HTML, Tailwind CSS, and JavaScript. It allows users to upload, view, zoom, sign, and export various document formats seamlessly while keeping the original format intact.

## 🚀 Features
* **Multi-format Support:** View and interact with PDF, MS Word (`.docx`), Excel (`.xlsx`), and Image files (`.png`, `.jpg`, `.jpeg`).
* **Document Info & Zooming:** Detects document type/size and provides smooth **Zoom In / Zoom Out** controls.
* **Interactive Signature & Text Tool:** 
  * Pop-up signature pad to draw your signature.
  * Optional Name and Date inputs (non-bold standard typography).
  * Ability to add custom text with adjustable pixel sizes.
* **Maintenance Mode:** Includes a dedicated maintenance toggle page with custom branding.
* **Export as PDF:** Save your signed document back into a structured PDF format.

## 🛠️ Tech Stack
* HTML5 / CSS3 / JavaScript (Vanilla)
* Tailwind CSS
* PDF.js, Mammoth.js, SheetJS (XLSX), jsPDF / html2canvas

## 📂 Project Structure
```text
document-signer-app/
├── index.html          # Main Application UI & Logic
├── maintenance.html    # System Maintenance Page
├── style.css           # Custom Styles & Scrollbar designs
└── script.js           # Core Document Parsing & Signature logic
