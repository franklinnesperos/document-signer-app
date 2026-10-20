let currentZoom = 100;
let uploadedFile = null;
let sigCanvas, sigCtx, isDrawing = false;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Signature Pad
    sigCanvas = document.getElementById('sigCanvas');
    if (sigCanvas) {
        sigCtx = sigCanvas.getContext('2d');
        sigCtx.lineWidth = 2;
        sigCtx.strokeStyle = '#000000'; // Hindi Bold

        sigCanvas.addEventListener('mousedown', startDrawing);
        sigCanvas.addEventListener('mousemove', draw);
        sigCanvas.addEventListener('mouseup', stopDrawing);
        sigCanvas.addEventListener('mouseleave', stopDrawing);
    }

    // File Upload Listener
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
});

function startDrawing(e) {
    isDrawing = true;
    sigCtx.beginPath();
    sigCtx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
    if (!isDrawing) return;
    sigCtx.lineTo(e.offsetX, e.offsetY);
    sigCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearSigCanvas() {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFile = file;

    document.getElementById('placeholderText').classList.add('hidden');
    document.getElementById('documentCanvasWrapper').classList.remove('hidden');
    document.getElementById('docInfo').classList.remove('hidden');
    document.getElementById('actionToolbar').classList.remove('hidden');
    document.getElementById('saveSection').classList.remove('hidden');

    document.getElementById('paperSizeVal').innerText = `${file.name.split('.').pop().toUpperCase()} Format`;
    
    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();
    const renderArea = document.getElementById('renderArea');
    renderArea.innerHTML = '';

    if (ext === 'pdf') {
        reader.readAsArrayBuffer(file);
        reader.onload = function () {
            // PDF.js implementation placeholder
            renderArea.innerHTML = `<p class="text-gray-700">PDF Loaded: ${file.name}. (Ready for signing)</p>`;
        };
    } else if (ext === 'docx') {
        reader.readAsArrayBuffer(file);
        reader.onload = function (loadEvent) {
            mammoth.convertToHtml({ arrayBuffer: loadEvent.target.result })
                .then(result => {
                    renderArea.innerHTML = result.value;
                });
        };
    } else if (ext === 'xlsx' || ext === 'xls') {
        reader.readAsArrayBuffer(file);
        reader.onload = function (loadEvent) {
            const data = new Uint8Array(loadEvent.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            renderArea.innerHTML = XLSX.utils.sheet_to_html(firstSheet);
        };
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
        reader.readAsDataURL(file);
        reader.onload = function (loadEvent) {
            renderArea.innerHTML = `<img src="${loadEvent.target.result}" class="max-w-full h-auto mx-auto" />`;
        };
    }
}

function zoomIn() {
    if (currentZoom < 200) {
        currentZoom += 10;
        updateZoom();
    }
}

function zoomOut() {
    if (currentZoom > 50) {
        currentZoom -= 10;
        updateZoom();
    }
}

function updateZoom() {
    document.getElementById('zoomLevel').innerText = `${currentZoom}%`;
    document.getElementById('renderArea').style.transform = `scale(${currentZoom / 100})`;
    document.getElementById('renderArea').style.transformOrigin = 'top center';
}

function openSignatureModal() {
    document.getElementById('signatureModal').classList.remove('hidden');
}

function closeSignatureModal() {
    document.getElementById('signatureModal').classList.add('hidden');
}

function applySignature() {
    const name = document.getElementById('signerName').value;
    const date = document.getElementById('signerDate').value;
    const sigDataUrl = sigCanvas.toDataURL();

    const renderArea = document.getElementById('renderArea');
    const signatureContainer = document.createElement('div');
    signatureContainer.className = 'mt-6 p-4 border-t border-gray-300 inline-block text-left font-normal';
    
    signatureContainer.innerHTML = `
        <div class="mb-2"><img src="${sigDataUrl}" alt="Signature" class="h-16 object-contain"></div>
        ${name ? `<div class="text-sm font-normal text-gray-800">${name}</div>` : ''}
        ${date ? `<div class="text-xs font-normal text-gray-600">${date}</div>` : ''}
    `;

    renderArea.appendChild(signatureContainer);
    closeSignatureModal();
}

function addCustomText() {
    const text = prompt("Ilagay ang iyong text:");
    if (!text) return;
    const pxSize = prompt("Ilagay ang font size sa px (halimbawa: 14):", "14");

    const renderArea = document.getElementById('renderArea');
    const textElement = document.createElement('div');
    textElement.className = 'my-2 text-gray-800 font-normal';
    textElement.style.fontSize = `${pxSize || 14}px`;
    textElement.innerText = text;

    renderArea.appendChild(textElement);
}

function saveAsPDF() {
    const element = document.getElementById('renderArea');
    const opt = {
        margin:       1,
        filename:     `signed_${uploadedFile ? uploadedFile.name : 'document'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Gamit ang html2pdf o jspdf para ma-download pabalik sa original format/PDF
    alert("I-download ang file bilang PDF...");
}
