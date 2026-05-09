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

// Pre-procesa una imagen para mejorar la legibilidad del OCR:
// 1. Si detecta fondo oscuro (dark mode), invierte los colores.
// 2. Aumenta el contraste para diferenciar mejor los caracteres.
// Tesseract funciona de forma óptima con texto oscuro sobre fondo claro.
async function _preprocessImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Calcular luminancia media para detectar si el fondo es oscuro
            let sumLuma = 0;
            for (let i = 0; i < data.length; i += 4) {
                sumLuma += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            }
            const avgLuma = sumLuma / (data.length / 4);

            if (avgLuma < 128) {
                // Fondo oscuro → invertir colores para que Tesseract lea texto claro
                for (let i = 0; i < data.length; i += 4) {
                    data[i]     = 255 - data[i];
                    data[i + 1] = 255 - data[i + 1];
                    data[i + 2] = 255 - data[i + 2];
                    // Alpha intacto
                }
                ctx.putImageData(imageData, 0, 0);
            }

            // Paso de contraste: stretch del rango dinámico al máximo
            const processed = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const px = processed.data;
            let minV = 255, maxV = 0;
            for (let i = 0; i < px.length; i += 4) {
                const v = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
                if (v < minV) minV = v;
                if (v > maxV) maxV = v;
            }
            if (maxV > minV) {
                const range = maxV - minV;
                for (let i = 0; i < px.length; i += 4) {
                    px[i]     = Math.round(((px[i]     - minV) / range) * 255);
                    px[i + 1] = Math.round(((px[i + 1] - minV) / range) * 255);
                    px[i + 2] = Math.round(((px[i + 2] - minV) / range) * 255);
                }
                ctx.putImageData(processed, 0, 0);
            }

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = src;
    });
}

export async function runOCR(imageSrc) {
    const processedSrc = await _preprocessImage(imageSrc);
    const result = await Tesseract.recognize(processedSrc, 'eng', {
        logger: m => console.log(m),
        tessedit_char_whitelist: 'ABCDEFGabcdefg#bmmaj7913suid0123456789+-()|/ ',
    });
    return result.data.text;
}
