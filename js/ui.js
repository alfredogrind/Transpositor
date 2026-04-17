/* global Tonal */
console.log("%c>>> ARCHIVO UI.JS CARGADO", "color: cyan; font-weight: bold;");

export function renderResults(container, data, onUpdate, onDelete) {
    container.innerHTML = `<h3 style="margin-bottom:1rem; font-size: 0.9rem; color: var(--text2);">Revisión de secciones:</h3>`;
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'section-box';
        div.innerHTML = `
            <div class="section-header">
                <div class="section-title" contenteditable="true">${item.section}</div>
                <button class="btn-delete" style="background:none; border:none; color:var(--text3); cursor:pointer;">Eliminar</button>
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
 * Inicializador del Tema con logs de alta visibilidad
 */
export function initTheme() {
    console.log("Ejecutando initTheme()...");
    const toggle = document.getElementById('themeToggle');
    const body = document.body;

    if (!toggle) {
        console.error("CRÍTICO: No se encontró el elemento #themeToggle en el DOM.");
        return;
    }

    // Aplicar persistencia
    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
    }

    // Vinculación del evento
    toggle.addEventListener('click', () => {
        console.log("%cBOTÓN CLICKEADO: Cambiando tema...", "color: yellow; background: black;");
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
    
    console.log("Evento 'click' vinculado a #themeToggle con éxito.");
}