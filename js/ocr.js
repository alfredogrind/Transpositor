// Configuración de los procesos de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

export async function pdfToImages(file) {
    const images = [];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg'));
    }
    return images;
}

export async function runOCR(imageSrc) {
    const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: m => console.log(m),
        // AÑADIDO: '|' y '/' para detectar repeticiones
        tessedit_char_whitelist: 'ABCDEFGabcdefg#bmmaj7913suid0123456789+-()|/ ',
    });
    return result.data.text;
}