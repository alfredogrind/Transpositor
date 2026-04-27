/**
 * Renderiza secciones con Grid Dinámico y Drag & Drop interactivo
 */
export function renderResults(container, data, onUpdate, onReorder, labelFn = c => c) {
    container.innerHTML = `<h3 class="revision-title">Revisión de secciones (Arrastra para ordenar):</h3>`;

    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'section-box';
        div.draggable = true;
        div.dataset.index = index;

        div.innerHTML = `
            <div class="section-header" style="pointer-events:none;">
                <div class="section-title" id="title-${index}" contenteditable="true" style="pointer-events:auto;">${item.section}</div>
                <button class="btn-edit-icon" title="Editar nombre" style="pointer-events:auto;">✎</button>
            </div>
            <div class="chord-grid">
                ${item.chords.map(c => `<span class="chord-pill">${labelFn(c)}</span>`).join('')}
            </div>
        `;

        div.addEventListener('dragstart', (e) => {
            requestAnimationFrame(() => div.classList.add('dragging'));
            e.dataTransfer.effectAllowed = 'move';
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            const boxes = Array.from(container.querySelectorAll('.section-box'));
            const newOrder = boxes.map(el => parseInt(el.dataset.index));
            onReorder(newOrder);
            boxes.forEach((el, i) => {
                el.dataset.index = i;
                const titleEl = el.querySelector('.section-title');
                if (titleEl) titleEl.onblur = (e2) => onUpdate(i, e2.target.textContent);
            });
        });

        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = container.querySelector('.dragging');
            if (!draggingItem || draggingItem === div) return;
            const box = div.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0) container.insertBefore(draggingItem, div);
            else container.insertBefore(draggingItem, div.nextSibling);
        });

        const titleElement = div.querySelector('.section-title');
        titleElement.onblur = (e) => onUpdate(parseInt(div.dataset.index), e.target.textContent);
        div.querySelector('.btn-edit-icon').onclick = () => titleElement.focus();

        container.appendChild(div);
    });
}

/**
 * Muestra el escáner láser dinámico en lugar del spinner
 */
export function showScanner(container, statusTextEl, message) {
    container.style.display = 'flex';
    container.innerHTML = `
        <div class="scanner-container">
            <div class="scanner-line"></div>
            <div style="padding:20px; opacity:0.15;">
                <div style="height:10px; background:var(--text3); width:80%; margin-bottom:10px; border-radius:5px;"></div>
                <div style="display:flex; gap:10px;">
                    <div style="width:40px; height:20px; background:var(--accent); border-radius:5px;"></div>
                    <div style="width:40px; height:20px; background:var(--accent); border-radius:5px;"></div>
                </div>
            </div>
        </div>
        <p style="color: var(--text2); font-weight: 500; margin-top: 0.75rem;">${message}</p>
    `;
}

/**
 * Renderiza resultado final transpuesto (sin capacidad de arrastre)
 */
export function renderFinalResults(container, data, labelFn = c => c) {
    container.innerHTML = "";
    data.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'section-box';
        card.innerHTML = `
            <div class="section-header"><div class="section-title">${item.section}</div></div>
            <div class="chord-grid">${item.chords.map(c => `<span class="chord-result">${labelFn(c)}</span>`).join('')}</div>
        `;
        container.appendChild(card);
    });
}

export function renderDetectedKey(container, keyInfo) {
    if (!container || !keyInfo) { container?.classList.remove('visible'); return; }
    const keyDisplay = keyInfo.quality === 'menor' ? keyInfo.root + 'm' : keyInfo.root;
    container.innerHTML = `<span class="f-key-label">Raíz</span><span class="f-key-value">${keyDisplay}</span>`;
    container.classList.add('visible');
}

export function renderToneGrid(container, mode, onSelect) {
    const notes  = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const suffix = mode === 'menor' ? 'm' : '';
    container.innerHTML = "";
    notes.forEach(note => {
        const label = note + suffix;
        const btn   = document.createElement('button');
        btn.className   = 'btn-tone';
        btn.textContent = label;
        btn.onclick = () => {
            document.querySelectorAll('.btn-tone').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(label);        // "Dm", "Em"... o "D", "E"... según el modo
        };
        container.appendChild(btn);
    });
}

function _checkSFMCollision(fabEl) {
    const sfmTrigger = document.getElementById('sfmTrigger');
    const sfmGroup   = document.getElementById('sfmGroup');
    if (!sfmTrigger || !sfmGroup || !fabEl) return;
    requestAnimationFrame(() => {
        const PAD = 10;
        const t = sfmTrigger.getBoundingClientRect();
        const f = fabEl.getBoundingClientRect();
        const overlap = t.right + PAD > f.left && t.left - PAD < f.right &&
                        t.bottom + PAD > f.top  && t.top  - PAD < f.bottom;
        if (overlap) {
            sfmGroup.style.bottom = (window.innerHeight - f.top + PAD) + 'px';
        } else {
            sfmGroup.style.bottom = '';
        }
    });
}

/**
 * Posiciona un picker a la izquierda del botón toggle, clampeado al viewport.
 * Los pickers son position:fixed, así que sus dimensiones son siempre accesibles.
 */
function positionPicker(pickerEl, toggleEl) {
    const PAD = 12;
    const pw = pickerEl.offsetWidth  || 200;
    const ph = pickerEl.offsetHeight || 130;
    const tRect = toggleEl.getBoundingClientRect();

    // Intentar a la derecha primero; si no cabe, a la izquierda
    // (el FAB puede estar en cualquier lado de la pantalla tras arrastrarlo)
    let left = tRect.right + PAD;
    if (left + pw > window.innerWidth - PAD) left = tRect.left - pw - PAD;

    let top = tRect.top + tRect.height / 2 - ph / 2;

    left = Math.max(PAD, Math.min(left, window.innerWidth  - pw - PAD));
    top  = Math.max(PAD, Math.min(top,  window.innerHeight - ph - PAD));

    pickerEl.style.left = left + 'px';
    pickerEl.style.top  = top  + 'px';
}

/**
 * LÓGICA DE TEMAS, ACCESIBILIDAD Y FAB COMPLETA
 */
export function initTheme() {
    const body        = document.body;
    const themeToggle  = document.getElementById('themeToggle');
    const paletteToggle = document.getElementById('paletteToggle');
    const palettePicker = document.getElementById('palettePicker');
    const a11yToggle   = document.getElementById('a11yToggle');
    const a11yPicker   = document.getElementById('a11yPicker');

    // Restaurar tema
    if (localStorage.getItem('theme') === 'light') body.classList.add('light-mode');

    // Restaurar tamaño de texto guardado
    const savedSize = localStorage.getItem('chordSize') || '';
    if (savedSize) document.documentElement.setAttribute('data-chord-size', savedSize);

    // ── Paletas ──────────────────────────────────────────────────────────────
    const PALETTES = [
        { name: 'Starlight',   swatch: '#c8a96e' },
        { name: 'Artic',       swatch: 'rgb(96, 165, 250)' },
        { name: 'Ambar Solar', swatch: 'rgb(251, 146, 60)' },
        { name: 'Menta Zen',   swatch: 'rgb(74, 222, 128)' },
    ];
    PALETTES.forEach((pal, i) => {
        const opt = document.createElement('div');
        opt.className = 'palette-option';
        opt.innerHTML = `<span class="pal-swatch" style="background:${pal.swatch}"></span><span class="pal-name">${pal.name}</span>`;
        opt.onclick = () => {
            body.setAttribute('data-palette', i);
            localStorage.setItem('palette', i);
            palettePicker?.classList.remove('open');
        };
        palettePicker?.appendChild(opt);
    });
    body.setAttribute('data-palette', localStorage.getItem('palette') || '0');

    // Sacar el palettePicker del control-panel por la misma razón que a11yPicker
    if (palettePicker) document.body.appendChild(palettePicker);

    // ── Picker de accesibilidad (tamaños de texto) ───────────────────────────
    if (a11yPicker) {
        const A11Y_SIZES = [
            { label: 'a',    size: 'xs', title: 'Extra pequeño (12px)' },
            { label: 'A',    size: 'sm', title: 'Pequeño (14px)' },
            { label: 'Aa',   size: '',   title: 'Normal (16px)' },
            { label: 'A⁺',   size: 'lg', title: 'Grande (18px)' },
            { label: 'A⁺⁺',  size: 'xl', title: 'Extra grande (20px)' },
        ];

        const lbl = document.createElement('span');
        lbl.className = 'a11y-label';
        lbl.textContent = 'Tamaño de texto';
        a11yPicker.appendChild(lbl);

        const row = document.createElement('div');
        row.className = 'a11y-sizes';

        A11Y_SIZES.forEach(({ label, size, title }) => {
            const btn = document.createElement('button');
            btn.className = 'a11y-size-btn' + (savedSize === size ? ' selected' : '');
            btn.textContent = label;
            btn.title = title;
            btn.onclick = () => {
                if (size) document.documentElement.setAttribute('data-chord-size', size);
                else      document.documentElement.removeAttribute('data-chord-size');
                localStorage.setItem('chordSize', size);
                row.querySelectorAll('.a11y-size-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };
            row.appendChild(btn);
        });
        a11yPicker.appendChild(row);

        // Sacar el picker del control-panel (que tiene transform) para que
        // position:fixed sea relativo al viewport y no al panel transformado
        document.body.appendChild(a11yPicker);
    }

    // ── Handlers de los toggles del panel ────────────────────────────────────

    // Tema claro/oscuro
    themeToggle?.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
        palettePicker?.classList.remove('open');
        a11yPicker?.classList.remove('open');
    });

    // Paleta de colores
    paletteToggle?.addEventListener('click', () => {
        const isOpen = palettePicker?.classList.contains('open');
        a11yPicker?.classList.remove('open');
        if (palettePicker) {
            if (!isOpen) { positionPicker(palettePicker, paletteToggle); palettePicker.classList.add('open'); }
            else          { palettePicker.classList.remove('open'); }
        }
    });

    // Accesibilidad
    a11yToggle?.addEventListener('click', () => {
        const isOpen = a11yPicker?.classList.contains('open');
        palettePicker?.classList.remove('open');
        if (a11yPicker) {
            if (!isOpen) { positionPicker(a11yPicker, a11yToggle); a11yPicker.classList.add('open'); }
            else          { a11yPicker.classList.remove('open'); }
        }
    });

    // Cerrar pickers al hacer clic fuera de ellos
    document.addEventListener('click', (e) => {
        if (a11yPicker && !a11yPicker.contains(e.target) && !a11yToggle?.contains(e.target)) {
            a11yPicker.classList.remove('open');
        }
        if (palettePicker && !palettePicker.contains(e.target) && !paletteToggle?.contains(e.target)) {
            palettePicker.classList.remove('open');
        }
    });

    // ── Lógica de Arrastre del Botón FAB (Mantenida Original) ────────────────
    const floatingGroup = document.getElementById('floatingControlGroup');
    const controlFab    = document.getElementById('controlFab');
    const dragState     = { active: false, hasMoved: false, startX: 0, startY: 0, startBottom: 0, startRight: 0 };
    const PAD = 16;

    // Detecta si el panel debe abrirse hacia abajo (FAB cerca del borde superior)
    function updatePanelDirection() {
        if (!floatingGroup) return;
        const fabBottom = parseFloat(floatingGroup.style.bottom) || PAD;
        const fabTopY   = window.innerHeight - fabBottom - 54; // 54 = altura del FAB
        const PANEL_SAFE = 286; // max-height(260) + gap(10) + padding(16)
        floatingGroup.classList.toggle('panel-below', fabTopY < PANEL_SAFE);
    }

    if (controlFab) {
        controlFab.addEventListener('mousedown', (e) => {
            const rect = floatingGroup.getBoundingClientRect();
            dragState.startBottom = window.innerHeight - rect.bottom;
            dragState.startRight  = window.innerWidth  - rect.right;
            dragState.active = true; dragState.hasMoved = false;
            dragState.startX = e.clientX; dragState.startY = e.clientY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragState.active) return;
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.hasMoved = true;
            floatingGroup.style.bottom = Math.max(PAD, Math.min(dragState.startBottom - dy, window.innerHeight - 60 - PAD)) + 'px';
            floatingGroup.style.right  = Math.max(PAD, Math.min(dragState.startRight  - dx, window.innerWidth  - 60 - PAD)) + 'px';
            updatePanelDirection();
        });

        document.addEventListener('mouseup', () => {
            if (!dragState.active) return;
            dragState.active = false;
            if (dragState.hasMoved) localStorage.setItem('controlPos', JSON.stringify({ bottom: floatingGroup.style.bottom, right: floatingGroup.style.right }));
            _checkSFMCollision(floatingGroup);
        });

        controlFab.onclick = () => { if (!dragState.hasMoved) floatingGroup.classList.toggle('open'); };

        // ── Soporte táctil: el FAB debe poder arrastrarse en móvil ──────────
        controlFab.addEventListener('touchstart', (e) => {
            e.preventDefault(); // impide scroll desde el inicio del gesto
            const touch = e.touches[0];
            const rect = floatingGroup.getBoundingClientRect();
            dragState.startBottom = window.innerHeight - rect.bottom;
            dragState.startRight  = window.innerWidth  - rect.right;
            dragState.active = true; dragState.hasMoved = false;
            dragState.startX = touch.clientX; dragState.startY = touch.clientY;
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!dragState.active) return;
            e.preventDefault(); // evita scroll de página mientras se arrastra el FAB
            const touch = e.touches[0];
            const dx = touch.clientX - dragState.startX;
            const dy = touch.clientY - dragState.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.hasMoved = true;
            floatingGroup.style.bottom = Math.max(PAD, Math.min(dragState.startBottom - dy, window.innerHeight - 60 - PAD)) + 'px';
            floatingGroup.style.right  = Math.max(PAD, Math.min(dragState.startRight  - dx, window.innerWidth  - 60 - PAD)) + 'px';
            updatePanelDirection();
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!dragState.active) return;
            const wasMoved = dragState.hasMoved;
            dragState.active = false;
            if (wasMoved) {
                localStorage.setItem('controlPos', JSON.stringify({ bottom: floatingGroup.style.bottom, right: floatingGroup.style.right }));
                _checkSFMCollision(floatingGroup);
            } else {
                floatingGroup.classList.toggle('open'); // tap → abrir/cerrar panel
            }
            // Evita que el mousedown sintético posterior resetee dragState.hasMoved
            e.preventDefault();
        });
    }

    // Restaurar posición del FAB clampeada al viewport actual.
    // Sin el clamp, una posición guardada en escritorio (p.ej. right:580px)
    // deja el FAB fuera de pantalla en móvil.
    const savedPos = JSON.parse(localStorage.getItem('controlPos') || '{}');
    if (savedPos.bottom && floatingGroup) {
        const clampedBottom = Math.max(PAD, Math.min(parseFloat(savedPos.bottom), window.innerHeight - 60 - PAD));
        const clampedRight  = Math.max(PAD, Math.min(parseFloat(savedPos.right),  window.innerWidth  - 60 - PAD));
        floatingGroup.style.bottom = clampedBottom + 'px';
        floatingGroup.style.right  = clampedRight  + 'px';
        // Si la posición fue corregida, actualizar localStorage para este viewport
        if (clampedRight !== parseFloat(savedPos.right) || clampedBottom !== parseFloat(savedPos.bottom)) {
            localStorage.setItem('controlPos', JSON.stringify({ bottom: clampedBottom + 'px', right: clampedRight + 'px' }));
        }
    }
    updatePanelDirection();
    _checkSFMCollision(floatingGroup);

    // Re-clampear al cambiar tamaño de ventana (rotación móvil, resize escritorio)
    window.addEventListener('resize', () => {
        if (!floatingGroup) return;
        const b = parseFloat(floatingGroup.style.bottom) || PAD;
        const r = parseFloat(floatingGroup.style.right)  || PAD;
        floatingGroup.style.bottom = Math.max(PAD, Math.min(b, window.innerHeight - 60 - PAD)) + 'px';
        floatingGroup.style.right  = Math.max(PAD, Math.min(r, window.innerWidth  - 60 - PAD)) + 'px';
        updatePanelDirection();
        _checkSFMCollision(floatingGroup);
    });
}

export function initSFM(onOpenLibrary, onSaveScan) {
    const group   = document.getElementById('sfmGroup');
    const trigger = document.getElementById('sfmTrigger');
    const btnLib  = document.getElementById('sfmOpenLibrary');
    const btnSave = document.getElementById('sfmSaveScan');
    if (!group || !trigger) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = group.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
        if (!group.contains(e.target)) {
            group.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            group.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    btnLib?.addEventListener('click', () => {
        group.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        onOpenLibrary();
    });

    btnSave?.addEventListener('click', () => {
        group.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        onSaveScan();
    });
}

export function updateSFMSaveState(hasData) {
    document.getElementById('sfmSaveScan')?.classList.toggle('sfm-item--inactive', !hasData);
}

/**
 * Graceful overlay close: adds `.closing` for the exit CSS state, waits for
 * the opacity transitionend on `animatedEl`, then removes both `.open` and
 * `.closing`. A 500ms fallback guards against transitionend never firing
 * (e.g., element hidden, zero-duration transitions in reduced-motion envs).
 */
export function closeOverlay(overlay, animatedEl) {
    if (!overlay || !overlay.classList.contains('open')) return;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.add('closing');

    let done = false;
    const cleanup = () => {
        if (done) return;
        done = true;
        overlay.classList.remove('open', 'closing');
        animatedEl?.removeEventListener('transitionend', onEnd);
    };
    const onEnd = (e) => {
        if (e.target === animatedEl && e.propertyName === 'opacity') cleanup();
    };

    animatedEl?.addEventListener('transitionend', onEnd);
    setTimeout(cleanup, 500);
}
