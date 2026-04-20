/**
 * Renderiza los bloques de cada sección para revisión (Escaneo)
 */
export function renderResults(container, data, onUpdate, onDelete) {
    container.innerHTML = `<h3 class="revision-title">Revisión de secciones:</h3>`;
    
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'section-box';
        div.innerHTML = `
            <div class="section-header">
                <div class="section-title" contenteditable="true">${item.section}</div>
                <button class="btn-delete">Eliminar</button>
            </div>
            <div class="chord-grid">
                ${item.chords.map(c => `<span class="chord-pill">${c}</span>`).join('')}
            </div>
        `;
        
        div.querySelector('.section-title').onblur = (e) => onUpdate(index, e.target.textContent);
        div.querySelector('.btn-delete').onclick = () => onDelete(index);
        container.appendChild(div);
    });
}

/**
 * Renderiza el resultado final — cada sección en su propia tarjeta (igual que la revisión)
 */
export function renderFinalResults(container, data) {
    container.innerHTML = "";
    
    data.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'section-box';
        card.innerHTML = `
            <div class="section-header">
                <div class="section-title">${item.section}</div>
            </div>
            <div class="chord-grid">
                ${item.chords.map(c => `<span class="btn-tone chord-result">${c}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Pinta la tonalidad detectada en el badge flotante (Centro de Control)
 */
export function renderDetectedKey(container, keyInfo) {
    if (!container) return;
    
    if (!keyInfo) {
        container.classList.remove('visible');
        return;
    }
    
    container.innerHTML = `
        <span class="f-key-label">Tono Original</span>
        <span class="f-key-value">${keyInfo.root} ${keyInfo.quality}</span>
    `;

    // Activa la visibilidad del badge en el grupo de control
    container.classList.add('visible');
}

/**
 * Genera la cuadrícula de botones para elegir el tono
 */
export function renderToneGrid(container, onSelect) {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    container.innerHTML = "";
    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = 'btn-tone';
        btn.textContent = note;
        btn.onclick = () => {
            document.querySelectorAll('.btn-tone').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(note);
        };
        container.appendChild(btn);
    });
}

/**
 * Inicializa el tema Light/Dark con persistencia
 */
export function initTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    if (localStorage.getItem('theme') === 'light') body.classList.add('light-mode');
    if (themeToggle) {
        themeToggle.onclick = () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        };
    }
}