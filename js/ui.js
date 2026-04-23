/**
 * Renderiza los bloques de cada sección para revisión (Escaneo)
 * El botón del lápiz ahora activa la edición del nombre de la sección.
 */
export function renderResults(container, data, onUpdate) {
    container.innerHTML = `<h3 class="revision-title">Revisión de secciones:</h3>`;
    
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'section-box';
        div.innerHTML = `
            <div class="section-header">
                <div class="section-title" id="title-${index}" contenteditable="true">${item.section}</div>
                <button class="btn-edit-icon" title="Editar nombre de sección">✎</button>
            </div>
            <div class="chord-grid">
                ${item.chords.map(c => `<span class="chord-pill">${c}</span>`).join('')}
            </div>
        `;
        
        const titleElement = div.querySelector('.section-title');
        titleElement.onblur = (e) => onUpdate(index, e.target.textContent);

        // Nueva lógica: El botón pone el foco en el texto para editar
        div.querySelector('.btn-edit-icon').onclick = () => {
            titleElement.focus();
            // Opcional: coloca el cursor al final del texto
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(titleElement);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        };

        container.appendChild(div);
    });
}

/**
 * Renderiza el resultado final — cada sección en su propia tarjeta
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
 * Muestra solo el Tono (Raiz) sin calidad mayor o menor.
 */
export function renderDetectedKey(container, keyInfo) {
    if (!container) return;
    
    if (!keyInfo) {
        container.classList.remove('visible');
        return;
    }
    
    const keyDisplay = keyInfo.quality === 'menor' ? keyInfo.root + 'm' : keyInfo.root;
    container.innerHTML = `
        <span class="f-key-label">Raíz</span>
        <span class="f-key-value">${keyDisplay}</span>
    `;

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
    document.documentElement.setAttribute('data-chord-size', value);
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

    if (palettePicker) document.body.appendChild(palettePicker);
    if (a11yPicker)    document.body.appendChild(a11yPicker);
    const keyBadge = document.getElementById('keyFloatingBadge');
    if (keyBadge) document.body.appendChild(keyBadge);

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

    if (themeToggle) {
        themeToggle.onclick = () => {
            body.classList.toggle('light-mode');
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        };
    }

    const floatingGroup = document.getElementById('floatingControlGroup');
    const controlFab    = document.getElementById('controlFab');
    const dragState = { active: false, hasMoved: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

    document.addEventListener('click', (e) => {
        palettePicker?.classList.remove('open');
        a11yPicker?.classList.remove('open');
        if (floatingGroup && !floatingGroup.contains(e.target)) {
            floatingGroup.classList.remove('open');
        }
    });

    // Guarda el valor de `bottom` antes de cambiar a anclaje por `top` al abrir hacia abajo
    let savedBottomBeforeOpenDown = null;

    if (controlFab) {
        controlFab.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dragState.hasMoved) return;

            const rect = floatingGroup.getBoundingClientRect();
            const isUpperHalf = rect.bottom < window.innerHeight / 2;
            floatingGroup.classList.toggle('open-down', isUpperHalf);

            const isOpen = floatingGroup.classList.toggle('open');

            if (isOpen && isUpperHalf) {
                // Al abrir hacia abajo: anclar por `top` para que el panel crezca
                // hacia abajo sin salirse por arriba del viewport
                savedBottomBeforeOpenDown = window.innerHeight - rect.bottom;
                floatingGroup.style.top    = rect.top + 'px';
                floatingGroup.style.bottom = 'auto';
            } else if (!isOpen) {
                palettePicker?.classList.remove('open');
                a11yPicker?.classList.remove('open');
                // Al cerrar: restaurar anclaje por `bottom` (usado por el drag)
                if (savedBottomBeforeOpenDown !== null) {
                    floatingGroup.style.bottom = savedBottomBeforeOpenDown + 'px';
                    floatingGroup.style.top    = 'auto';
                    savedBottomBeforeOpenDown  = null;
                }
            }
        });
    }

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
        floatingGroup.style.top    = 'auto'; // limpiar top si quedó de open-down
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

    const savedPos = localStorage.getItem('controlPos');
    if (savedPos && floatingGroup) {
        try {
            const pos = JSON.parse(savedPos);
            const w = floatingGroup.offsetWidth  || 54;
            const h = floatingGroup.offsetHeight || 54;
            let bottom, right;
            if (pos.bottom !== undefined) {
                bottom = parseFloat(pos.bottom);
                right  = parseFloat(pos.right);
            } else if (pos.top !== undefined) {
                bottom = window.innerHeight - parseFloat(pos.top) - h;
                right  = window.innerWidth  - parseFloat(pos.left) - w;
            }
            if (bottom !== undefined) {
                floatingGroup.style.bottom = Math.max(PAD, Math.min(bottom, window.innerHeight - h - PAD)) + 'px';
                floatingGroup.style.right  = Math.max(PAD, Math.min(right,  window.innerWidth  - w - PAD)) + 'px';
            }
        } catch (_) { localStorage.removeItem('controlPos'); }
    }

    function positionPicker(picker, btn) {
        const groupRect = floatingGroup.getBoundingClientRect();
        const r   = btn.getBoundingClientRect();
        const GAP = 12;
        const pw  = picker.offsetWidth  || 180;
        const ph  = picker.offsetHeight || 160;

        const spaceOnLeft = groupRect.left - GAP;
        if (spaceOnLeft >= pw) {
            picker.style.right = (window.innerWidth - groupRect.left + GAP) + 'px';
            picker.style.left  = 'auto';
        } else {
            picker.style.left  = (groupRect.right + GAP) + 'px';
            picker.style.right = 'auto';
        }

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