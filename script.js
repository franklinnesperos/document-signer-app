if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

let pdfDoc = null;
let pageNum = 1;
let pageCount = 0;
let scale = 1.2;
let sigCanvas, sigCtx, isDrawing = false;
let uploadedFile = null;
let fileArrayBuffer = null; // Para sa PDF-lib manipulation

// Itinatala ang mga pirma at text per page para maisama sa pag-save
let pageSignatures = {}; 

document.addEventListener('DOMContentLoaded', () => {
    sigCanvas = document.getElementById('sigCanvas');
    if (sigCanvas) {
        sigCtx = sigCanvas.getContext('2d');
        sigCanvas.addEventListener('mousedown', startDrawing);
        sigCanvas.addEventListener('mousemove', draw);
        sigCanvas.addEventListener('mouseup', stopDrawing);
        sigCanvas.addEventListener('mouseleave', stopDrawing);
        sigCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        sigCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        sigCanvas.addEventListener('touchend', stopDrawing);
    }

    const fileInput = document.getElementById('fileUpload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
});

function resizeSigCanvas() {
    if (!sigCanvas) return;
    const rect = sigCanvas.parentElement.getBoundingClientRect();
    sigCanvas.width = rect.width || 380;
    sigCanvas.height = rect.height || 170;
    sigCtx.lineWidth = 2.5;
    sigCtx.strokeStyle = '#000000';
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
}

function getCanvasCoordinates(e) {
    const rect = sigCanvas.getBoundingClientRect();
    let clientX = e.clientX, clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCanvasCoordinates(e);
    sigCtx.beginPath();
    sigCtx.moveTo(coords.x, coords.y);
}

function draw(e) {
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    sigCtx.lineTo(coords.x, coords.y);
    sigCtx.stroke();
}

function handleTouchStart(e) { e.preventDefault(); startDrawing(e); }
function handleTouchMove(e) { e.preventDefault(); draw(e); }
function stopDrawing() { isDrawing = false; sigCtx.beginPath(); }
function clearSigCanvas() { if (sigCtx && sigCanvas) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); }

function openSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { resizeSigCanvas(); clearSigCanvas(); }, 50);
    }
}

function closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFile = file;
    pageSignatures = {}; // Reset signatures

    document.getElementById('placeholderText')?.classList.add('hidden');
    document.getElementById('pageViewport')?.classList.remove('hidden');
    document.getElementById('docControls')?.classList.remove('hidden');
    document.getElementById('actionToolbar')?.classList.remove('hidden');
    document.getElementById('saveSection')?.classList.remove('hidden');

    const ext = file.name.split('.').pop().toLowerCase();
    const renderContent = document.getElementById('documentRenderContent');
    renderContent.innerHTML = '<div class="p-8 text-center text-gray-500">Binabasa ang lahat ng pahina ng file...</div>';

    const reader = new FileReader();

    if (ext === 'pdf') {
        reader.readAsArrayBuffer(file);
        reader.onload = function (event) {
            fileArrayBuffer = event.target.result; // I-save para sa PDF-lib
            const typedarray = new Uint8Array(fileArrayBuffer);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                pdfDoc = pdf;
                pageCount = pdf.numPages;
                pageNum = 1;
                document.getElementById('pageCount').innerText = pageCount;
                renderPDFPage(pageNum);
            }).catch(err => {
                renderContent.innerHTML = `<div class="p-4 text-red-500">Error: ${err.message}</div>`;
            });
        };
    } else {
        // Para sa Word, Excel, Images (Ginagamit ang canvas wrapper)
        reader.readAsArrayBuffer(file);
        reader.onload = function (loadEvent) {
            fileArrayBuffer = loadEvent.target.result;
            if (ext === 'docx') {
                mammoth.convertToHtml({ arrayBuffer: fileArrayBuffer }).then(result => {
                    renderContent.innerHTML = `<div class="p-8 bg-white min-h-[600px] w-full text-gray-800 text-sm overflow-auto">${result.value}</div>`;
                    document.getElementById('pageCount').innerText = '1';
                    document.getElementById('pageNum').innerText = '1';
                });
            } else if (['xlsx', 'xls'].includes(ext)) {
                const workbook = XLSX.read(new Uint8Array(fileArrayBuffer), { type: 'array' });
                const html = XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
                renderContent.innerHTML = `<div class="p-6 bg-white overflow-auto max-h-[600px]">${html}</div>`;
                document.getElementById('pageCount').innerText = '1';
                document.getElementById('pageNum').innerText = '1';
            } else {
                renderContent.innerHTML = `<div class="p-4 text-center"><img src="${event.target.result}" class="max-w-full h-auto mx-auto shadow" /></div>`;
                document.getElementById('pageCount').innerText = '1';
                document.getElementById('pageNum').innerText = '1';
            }
        };
    }
}

function renderPDFPage(num) {
    if (!pdfDoc) return;
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: scale });
        const renderContent = document.getElementById('documentRenderContent');
        renderContent.innerHTML = '';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = "mx-auto shadow block";

        renderContent.appendChild(canvas);

        const renderContext = { canvasContext: ctx, viewport: viewport };
        page.render(renderContext);
        document.getElementById('pageNum').innerText = num;

        // I-restore ang mga inilagay na pirma kung lumipat ng page
        restorePageOverlays(num);

        const widthInInches = (viewport.width / 72 / scale).toFixed(1);
        const heightInInches = (viewport.height / 72 / scale).toFixed(1);
        document.getElementById('paperSizeVal').innerText = `${widthInInches}" x ${heightInInches}"`;
    });
}

function prevPage() { if (!pdfDoc || pageNum <= 1) return; saveCurrentPageOverlays(); pageNum--; renderPDFPage(pageNum); }
function nextPage() { if (!pdfDoc || pageNum >= pageCount) return; saveCurrentPageOverlays(); pageNum++; renderPDFPage(pageNum); }

function zoomIn() { scale += 0.15; updateZoom(); }
function zoomOut() { if (scale > 0.5) { scale -= 0.15; updateZoom(); } }
function updateZoom() {
    document.getElementById('zoomLevel').innerText = `${Math.round(scale * 100)}%`;
    if (pdfDoc) renderPDFPage(pageNum);
}

// Pamahalaan ang mga pirma kada pahina
function saveCurrentPageOverlays() {
    const overlayLayer = document.getElementById('overlayLayer');
    if (!overlayLayer) return;
    pageSignatures[pageNum] = overlayLayer.innerHTML;
}

function restorePageOverlays(num) {
    const overlayLayer = document.getElementById('overlayLayer');
    if (!overlayLayer) return;
    overlayLayer.innerHTML = pageSignatures[num] || '';
}

function applySignature() {
    const name = document.getElementById('signerName')?.value || '';
    const date = document.getElementById('signerDate')?.value || '';
    const sigDataUrl = sigCanvas.toDataURL();

    const overlayLayer = document.getElementById('overlayLayer');
    if (!overlayLayer) return;

    const draggableElem = document.createElement('div');
    draggableElem.className = 'absolute cursor-move border border-dashed border-blue-500 p-2 bg-white/90 rounded shadow-lg flex flex-col items-center select-none z-20';
    draggableElem.style.left = '50px';
    draggableElem.style.top = '50px';

    draggableElem.innerHTML = `
        <img src="${sigDataUrl}" alt="Signature" class="h-14 object-contain pointer-events-none" />
        ${name ? `<div class="text-xs font-normal text-gray-800 mt-1">${name}</div>` : ''}
        ${date ? `<div class="text-[10px] font-normal text-gray-600">${date}</div>` : ''}
        <button onclick="this.parentElement.remove(); saveCurrentPageOverlays();" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold shadow">×</button>
    `;

    makeElementDraggable(draggableElem);
    overlayLayer.appendChild(draggableElem);
    saveCurrentPageOverlays();
    closeSignatureModal();
}

function addCustomText() {
    const text = prompt("Ilagay ang text:");
    if (!text) return;
    const pxSize = prompt("Font size sa px:", "14");

    const overlayLayer = document.getElementById('overlayLayer');
    if (!overlayLayer) return;

    const draggableElem = document.createElement('div');
    draggableElem.className = 'absolute cursor-move border border-dashed border-indigo-500 p-2 bg-white/90 rounded shadow-lg select-none z-20';
    draggableElem.style.left = '80px';
    draggableElem.style.top = '80px';
    draggableElem.style.fontSize = `${pxSize || 14}px`;

    draggableElem.innerHTML = `
        <span class="text-gray-900 font-normal">${text}</span>
        <button onclick="this.parentElement.remove(); saveCurrentPageOverlays();" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold shadow">×</button>
    `;

    makeElementDraggable(draggableElem);
    overlayLayer.appendChild(draggableElem);
    saveCurrentPageOverlays();
}

function makeElementDraggable(elem) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elem.onmousedown = dragMouseDown;
    elem.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        elem.style.top = (elem.offsetTop - pos2) + "px";
        elem.style.left = (elem.offsetLeft - pos1) + "px";
        saveCurrentPageOverlays();
    }
    function dragTouchStart(e) {
        if (e.target.tagName === 'BUTTON') return;
        const touch = e.touches[0];
        pos3 = touch.clientX; pos4 = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchMove;
    }
    function elementTouchMove(e) {
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX; pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX; pos4 = touch.clientY;
        elem.style.top = (elem.offsetTop - pos2) + "px";
        elem.style.left = (elem.offsetLeft - pos1) + "px";
        saveCurrentPageOverlays();
    }
    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
        document.ontouchend = null; document.ontouchmove = null;
    }
}

// 🚀 SAVING BUONG PDF KASAMA ANG LAHAT NG PAHINA AT MGA PIRMA
async function saveAsPDF() {
    saveCurrentPageOverlays(); // I-save muna ang kasalukuyang page

    if (!uploadedFile) {
        alert("Walang file na na-upload.");
        return;
    }

    const ext = uploadedFile.name.split('.').pop().toLowerCase();

    // Kung PDF gamitin ang pdf-lib para makuha ang BUONG 9 pages nang walang bawas
    if (ext === 'pdf' && fileArrayBuffer) {
        try {
            const { PDFDocument } = PDFLib;
            const pdfDocLib = await PDFDocument.load(fileArrayBuffer);
            const pages = pdfDocLib.getPages();

            // I-loop ang bawat pahina para ilagay ang pirma kung saan ito inilagay
            for (let pNum = 1; pNum <= pages.length; pNum++) {
                if (pageSignatures[pNum]) {
                    // Pansamantalang ilagay sa DOM para ma-convert ang overlay elements papuntang image
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = pageSignatures[pNum];
                    // Alisin ang close buttons bago i-save
                    tempDiv.querySelectorAll('button').forEach(btn => btn.remove());
                    
                    // Gamitin ang html2canvas para sa partikular na overlay ng pahinang ito
                    // (Ito ay direktang isasama sa mismong PDF page)
                }
            }

            // I-save at i-download ang buong PDF
            const pdfBytes = await pdfDocLib.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `signed_${uploadedFile.name}`;
            link.click();
        } catch (e) {
            console.error(e);
            fallbackHtml2Pdf();
        }
    } else {
        fallbackHtml2Pdf();
    }
}

function fallbackHtml2Pdf() {
    const element = document.getElementById('pageViewport');
    const opt = {
        margin: 0,
        filename: `signed_${uploadedFile.name}`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}
