/**
 * Renderiza los bloques de cada sección detectada
 */
export function renderResults(container, data, onUpdate, onDelete) {
    container.innerHTML = `<h3 style="margin-bottom:1rem; font-size: 0.9rem; color: #9a9590;">Revisión de secciones:</h3>`;
    
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
        
        // Eventos
        div.querySelector('.section-title').onblur = (e) => onUpdate(index, e.target.textContent);
        div.querySelector('.btn-delete').onclick = () => onDelete(index);
        
        container.appendChild(div);
    });
}

/**
 * Genera la cuadrícula de botones para elegir el tono
 */
export function renderToneGrid(container, onSelect) {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    container.innerHTML = ""; // Limpiar
    
    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = 'btn-tone';
        btn.textContent = note;
        btn.onclick = () => {
            // Quitar clase seleccionada de otros
            document.querySelectorAll('.btn-tone').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(note);
        };
        container.appendChild(btn);
    });
}