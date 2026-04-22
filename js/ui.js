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
                ${item.chords.map(c => `<span class="chord-result">${c}</span>`).join('')}
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

const PALETTES = [
    { name: 'Starlight',     swatch: '#c8a96e' },
    { name: 'Artic', swatch: 'rgb(96, 165, 250)' },
    { name: 'Ambar Solar',      swatch: 'rgb(251, 146, 60)' },
    { name: 'Menta Zen',      swatch: 'rgb(74, 222, 128)' },
];

function applyPalette(index) {
    document.body.setAttribute('data-palette', String(index));
    document.querySelectorAll('.palette-option').forEach((opt, i) => {
        opt.classList.toggle('active', i === index);
    });
}

const SIZES = [
    { value: 'xs', fontSize: '0.7rem'  },
    { value: 'sm', fontSize: '0.85rem' },
    { value: 'md', fontSize: '1rem'    },
    { value: 'lg', fontSize: '1.25rem' },
    { value: 'xl', fontSize: '1.55rem' },
];

function applyChordSize(value) {
    document.body.setAttribute('data-chord-size', value);
    document.querySelectorAll('.a11y-size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === value);
    });
}

export function initTheme() {
    const body = document.body;
    const themeToggle  = document.getElementById('themeToggle');
    const paletteToggle = document.getElementById('paletteToggle');
    const palettePicker = document.getElementById('palettePicker');
    const a11yToggle   = document.getElementById('a11yToggle');
    const a11yPicker   = document.getElementById('a11yPicker');

    if (localStorage.getItem('theme') === 'light') body.classList.add('light-mode');

    // Mover pickers al <body> para que position:fixed sea relativo al viewport
    // (el control-panel usa transform en su animación, lo que atrapa a los fixed children)
    if (palettePicker) document.body.appendChild(palettePicker);
    if (a11yPicker)    document.body.appendChild(a11yPicker);

    // Paleta
    if (palettePicker) {
        PALETTES.forEach((pal, i) => {
            const opt = document.createElement('div');
            opt.className = 'palette-option';
            opt.innerHTML = `
                <span class="pal-swatch" style="background:${pal.swatch}"></span>
                <span class="pal-name">${pal.name}</span>
            `;
            opt.onclick = () => {
                applyPalette(i);
                localStorage.setItem('palette', String(i));
                palettePicker.classList.remove('open');
            };
            palettePicker.appendChild(opt);
        });
    }
    applyPalette(parseInt(localStorage.getItem('palette') || '0', 10));

    // Accesibilidad: tamaño de acordes
    if (a11yPicker) {
        SIZES.forEach(({ value, fontSize }) => {
            const btn = document.createElement('button');
            btn.className = 'a11y-size-btn';
            btn.textContent = 'A';
            btn.style.fontSize = fontSize;
            btn.dataset.size = value;
            btn.onclick = () => {
                applyChordSize(value);
                localStorage.setItem('chordSize', value);
                a11yPicker.classList.remove('open');
            };
            a11yPicker.appendChild(btn);
        });
    }
    applyChordSize(localStorage.getItem('chordSize') || 'md');

    // Tema
    if (themeToggle) {
        themeToggle.onclick = () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        };
    }

    // — ESTADO COMPARTIDO —
    const floatingGroup = document.getElementById('floatingControlGroup');
    const controlFab    = document.getElementById('controlFab');
    const dragState = { active: false, hasMoved: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

    // Cerrar panel y burbujas al clicar fuera
    document.addEventListener('click', (e) => {
        palettePicker?.classList.remove('open');
        a11yPicker?.classList.remove('open');
        if (floatingGroup && !floatingGroup.contains(e.target)) {
            floatingGroup.classList.remove('open');
        }
    });

    // FAB: abrir / cerrar panel
    if (controlFab) {
        controlFab.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dragState.hasMoved) return;
            const isOpen = floatingGroup.classList.toggle('open');
            if (!isOpen) {
                palettePicker?.classList.remove('open');
                a11yPicker?.classList.remove('open');
            }
        });
    }

    // — DRAG (siempre bottom/right para que el panel siempre se abra hacia arriba) —
    const PAD = 16;

    function dragStart(clientX, clientY) {
        const rect = floatingGroup.getBoundingClientRect();
        dragState.startBottom = window.innerHeight - rect.bottom;
        dragState.startRight  = window.innerWidth  - rect.right;
        dragState.active   = true;
        dragState.hasMoved = false;
        dragState.startX   = clientX;
        dragState.startY   = clientY;
        floatingGroup.classList.add('dragging');
    }

    function dragMove(clientX, clientY) {
        if (!dragState.active) return;
        const dx = clientX - dragState.startX;
        const dy = clientY - dragState.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.hasMoved = true;
        const w = floatingGroup.offsetWidth;
        const h = floatingGroup.offsetHeight;
        const newBottom = dragState.startBottom - dy;
        const newRight  = dragState.startRight  - dx;
        floatingGroup.style.bottom = Math.max(PAD, Math.min(newBottom, window.innerHeight - h - PAD)) + 'px';
        floatingGroup.style.right  = Math.max(PAD, Math.min(newRight,  window.innerWidth  - w - PAD)) + 'px';
    }

    function dragEnd() {
        if (!dragState.active) return;
        dragState.active = false;
        floatingGroup.classList.remove('dragging');
        if (dragState.hasMoved) {
            localStorage.setItem('controlPos', JSON.stringify({
                bottom: floatingGroup.style.bottom,
                right:  floatingGroup.style.right
            }));
        }
        setTimeout(() => { dragState.hasMoved = false; }, 0);
    }

    if (controlFab) {
        controlFab.addEventListener('mousedown', (e) => { e.preventDefault(); dragStart(e.clientX, e.clientY); });
        controlFab.addEventListener('touchstart', (e) => { dragStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    }
    document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => { if (dragState.active) dragMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('mouseup',   dragEnd);
    document.addEventListener('touchend',  dragEnd);

    // Restaurar posición guardada
    const savedPos = localStorage.getItem('controlPos');
    if (savedPos && floatingGroup) {
        try {
            const pos = JSON.parse(savedPos);
            if (pos.bottom !== undefined) {
                floatingGroup.style.bottom = pos.bottom;
                floatingGroup.style.right  = pos.right;
            } else if (pos.top !== undefined) {
                // Migrar posiciones antiguas (top/left) a bottom/right
                floatingGroup.style.bottom = (window.innerHeight - parseFloat(pos.top) - floatingGroup.offsetHeight) + 'px';
                floatingGroup.style.right  = (window.innerWidth  - parseFloat(pos.left) - floatingGroup.offsetWidth)  + 'px';
            }
        } catch (_) { localStorage.removeItem('controlPos'); }
    }

    function positionPicker(picker, btn) {
        const groupRect = floatingGroup.getBoundingClientRect();
        const r   = btn.getBoundingClientRect();
        const GAP = 12;
        const pw  = picker.offsetWidth  || 180;
        const ph  = picker.offsetHeight || 160;

        // Horizontal: a la izquierda del panel de control completo
        const spaceOnLeft = groupRect.left - GAP;
        if (spaceOnLeft >= pw) {
            // Cabe a la izquierda del panel
            picker.style.right = (window.innerWidth - groupRect.left + GAP) + 'px';
            picker.style.left  = 'auto';
        } else {
            // No cabe a la izquierda: mostrar a la derecha del panel
            picker.style.left  = (groupRect.right + GAP) + 'px';
            picker.style.right = 'auto';
        }

        // Vertical: centrado en el botón que lo abrió, clampeado al viewport
        const btnCenterY = r.top + r.height / 2;
        let top = btnCenterY - ph / 2;
        top = Math.max(GAP, Math.min(top, window.innerHeight - ph - GAP));
        picker.style.top    = top + 'px';
        picker.style.bottom = 'auto';
    }

    if (paletteToggle && palettePicker) {
        paletteToggle.onclick = (e) => {
            e.stopPropagation();
            a11yPicker?.classList.remove('open');
            const opening = !palettePicker.classList.contains('open');
            if (opening) positionPicker(palettePicker, paletteToggle);
            palettePicker.classList.toggle('open');
        };
    }

    if (a11yToggle && a11yPicker) {
        a11yToggle.onclick = (e) => {
            e.stopPropagation();
            palettePicker?.classList.remove('open');
            const opening = !a11yPicker.classList.contains('open');
            if (opening) positionPicker(a11yPicker, a11yToggle);
            a11yPicker.classList.toggle('open');
        };
    }
}