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

export function initTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
    }

    if (themeToggle) {
        themeToggle.onclick = () => {
            body.classList.toggle('light-mode');
            const currentTheme = body.classList.contains('light-mode') ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
        };
    }
}