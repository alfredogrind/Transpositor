/**
 * Renderiza los bloques de cada sección detectada tras el escaneo
 */
export function renderResults(container, data, onUpdate, onDelete) {
    container.innerHTML = `<h3 style="margin-bottom:1rem; font-size: 0.9rem; color: var(--text2);">Revisión de secciones:</h3>`;
    
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'section-box';
        div.innerHTML = `
            <div class="section-header">
                <div class="section-title" contenteditable="true">${item.section}</div>
                <button class="btn-delete" style="background:none; border:none; color:var(--text3); cursor:pointer; font-size:0.7rem;">Eliminar</button>
            </div>
            <div class="chord-grid">
                ${item.chords.map(c => `<span class="chord-pill">${c}</span>`).join('')}
            </div>
        `;
        
        // Sincronización de edición y eliminación
        div.querySelector('.section-title').onblur = (e) => onUpdate(index, e.target.textContent);
        div.querySelector('.btn-delete').onclick = () => onDelete(index);
        
        container.appendChild(div);
    });
}

/**
 * Pinta la tonalidad detectada en el componente flotante (HUD) en la esquina inferior izquierda
 */
export function renderDetectedKey(container, keyInfo) {
    if (!container) return;
    if (!keyInfo) {
        container.style.display = "none";
        return;
    }
    
    // Muestra el contenedor flotante con el tono y modo
    container.style.display = "flex";
    container.innerHTML = `
        <div class="floating-key-content">
            <span class="f-key-label">Tono Original</span>
            <span class="f-key-value">${keyInfo.root} ${keyInfo.quality}</span>
        </div>
    `;
}

/**
 * Genera la cuadrícula de 12 botones para elegir el tono de destino
 */
export function renderToneGrid(container, onSelect) {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    container.innerHTML = ""; // Limpiar antes de regenerar
    
    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = 'btn-tone';
        btn.textContent = note;
        btn.onclick = () => {
            // Manejo visual de selección única
            document.querySelectorAll('.btn-tone').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(note);
        };
        container.appendChild(btn);
    });
}

/**
 * Inicializa la gestión del tema (Light/Dark) y recupera la preferencia del usuario
 */
export function initTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    // Aplicar tema persistente desde localStorage
    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
    }

    if (themeToggle) {
        themeToggle.onclick = () => {
            body.classList.toggle('light-mode');
            const currentTheme = body.classList.contains('light-mode') ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme); // Guardar preferencia
        };
    }
}