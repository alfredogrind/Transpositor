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

export function initTheme() {
    const body = document.body;

    // Restaurar ajustes desde localStorage
    if (localStorage.getItem('theme') === 'light') body.classList.add('light-mode');
    const savedSize = localStorage.getItem('chordSize') || '';
    if (savedSize) document.documentElement.setAttribute('data-chord-size', savedSize);
    body.setAttribute('data-palette', localStorage.getItem('palette') || '0');

    // ── Selectores Dark / Light Mode ─────────────────────────────────────────
    const btnDark  = document.getElementById('themeDark');
    const btnLight = document.getElementById('themeLight');

    function syncThemeBtns() {
        const isLight = body.classList.contains('light-mode');
        btnDark?.classList.toggle('active', !isLight);
        btnLight?.classList.toggle('active',  isLight);
    }

    btnDark?.addEventListener('click', () => {
        body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        syncThemeBtns();
    });

    btnLight?.addEventListener('click', () => {
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        syncThemeBtns();
    });

    syncThemeBtns();

    // ── Swatches de paleta ───────────────────────────────────────────────────
    const PALETTES = [
        { name: 'Starlight',   swatch: '#c8a96e' },
        { name: 'Artic',       swatch: 'rgb(96, 165, 250)' },
        { name: 'Ambar Solar', swatch: 'rgb(251, 146, 60)' },
        { name: 'Menta Zen',   swatch: 'rgb(74, 222, 128)' },
    ];
    const paletteRow = document.getElementById('sfmPaletteRow');
    if (paletteRow) {
        const savedPalette = parseInt(localStorage.getItem('palette') || '0');
        PALETTES.forEach((pal, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pers-swatch' + (i === savedPalette ? ' active' : '');
            btn.style.background = pal.swatch;
            btn.title = pal.name;
            btn.addEventListener('click', () => {
                body.setAttribute('data-palette', i);
                localStorage.setItem('palette', i);
                paletteRow.querySelectorAll('.pers-swatch').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            paletteRow.appendChild(btn);
        });
    }

    // ── Botones de tamaño de texto ───────────────────────────────────────────
    const A11Y_SIZES = [
        { label: 'a',   size: 'xs' },
        { label: 'A',   size: 'sm' },
        { label: 'Aa',  size: ''   },
        { label: 'A⁺',  size: 'lg' },
        { label: 'A⁺⁺', size: 'xl' },
    ];
    const sizeRow = document.getElementById('sfmSizeRow');
    if (sizeRow) {
        A11Y_SIZES.forEach(({ label, size }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pers-size-btn' + (savedSize === size ? ' active' : '');
            btn.textContent = label;
            btn.addEventListener('click', () => {
                if (size) document.documentElement.setAttribute('data-chord-size', size);
                else      document.documentElement.removeAttribute('data-chord-size');
                localStorage.setItem('chordSize', size);
                sizeRow.querySelectorAll('.pers-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            sizeRow.appendChild(btn);
        });
    }
}

export function initSFM(onOpenLibrary, onSaveScan, onOpenSetlist) {
    const group      = document.getElementById('sfmGroup');
    const trigger    = document.getElementById('sfmTrigger');
    const btnLib     = document.getElementById('sfmOpenLibrary');
    const btnSave    = document.getElementById('sfmSaveScan');
    const btnSetlist = document.getElementById('sfmOpenSetlist');
    const btnPers    = document.getElementById('sfmPersonalizar');
    const persPanel  = document.getElementById('personalizarPanel');
    if (!group || !trigger) return;

    const closeSFM = () => {
        group.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    };

    const closePers = () => {
        persPanel?.classList.remove('open');
        persPanel?.setAttribute('aria-hidden', 'true');
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closePers();
        const isOpen = group.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
        if (!group.contains(e.target) && !persPanel?.contains(e.target)) {
            closeSFM();
            closePers();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeSFM(); closePers(); }
    });

    btnLib?.addEventListener('click', () => { closeSFM(); onOpenLibrary?.(); });
    btnSave?.addEventListener('click', () => { closeSFM(); onSaveScan?.(); });
    btnSetlist?.addEventListener('click', () => { closeSFM(); onOpenSetlist?.(); });

    btnPers?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSFM();
        if (persPanel) {
            const isOpen = persPanel.classList.toggle('open');
            persPanel.setAttribute('aria-hidden', String(!isOpen));
        }
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

// ── Tag chip editor ───────────────────────────────────────────────────────────
const TAG_PALETTE = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e8c','#95a5a6'];

function _loadTagColors() {
    try { return JSON.parse(localStorage.getItem('tagColors') || '{}'); } catch { return {}; }
}
function _saveTagColors(colors) {
    localStorage.setItem('tagColors', JSON.stringify(colors));
}

/**
 * Mounts a tag chip editor onto `chipsEl`/`inputEl`/`hiddenEl`.
 * Reads and writes `tagColors` from localStorage (shared with library-page.js).
 * Returns { reset(), getTags() }.
 */
export function createTagEditor(chipsEl, inputEl, hiddenEl) {
    let editingTags   = [];
    let activePalette = null;

    function renderChips() {
        const tagColors = _loadTagColors();
        if (!chipsEl) return;
        chipsEl.innerHTML = '';
        editingTags.forEach((tag, i) => {
            const color = tagColors[tag] || null;
            const chip  = document.createElement('span');
            chip.className = 'lib-tag-chip';
            if (color) chip.style.setProperty('--chip-color', color);

            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'lib-tag-chip-dot';
            dot.title = 'Color de etiqueta';
            if (color) dot.style.background = color;
            dot.addEventListener('click', e => { e.stopPropagation(); openColorPalette(dot, tag); });

            const label = document.createElement('span');
            label.className = 'lib-tag-chip-label';
            label.textContent = tag;

            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'lib-tag-chip-remove';
            rm.innerHTML = '&times;';
            rm.addEventListener('click', () => { editingTags.splice(i, 1); renderChips(); });

            chip.append(dot, label, rm);
            chipsEl.appendChild(chip);
        });
        if (hiddenEl) hiddenEl.value = editingTags.join(', ');
    }

    function openColorPalette(dotEl, tagName) {
        activePalette?.remove();
        activePalette = null;

        const tagColors = _loadTagColors();
        const palette   = document.createElement('div');
        palette.className = 'lib-color-palette';

        const none = document.createElement('button');
        none.type = 'button';
        none.className = 'lib-color-swatch lib-color-swatch--none' + (!tagColors[tagName] ? ' active' : '');
        none.title = 'Sin color';
        none.textContent = '✕';
        none.addEventListener('click', e => {
            e.stopPropagation();
            const c = _loadTagColors(); delete c[tagName]; _saveTagColors(c);
            renderChips(); palette.remove(); activePalette = null;
        });
        palette.appendChild(none);

        TAG_PALETTE.forEach(color => {
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'lib-color-swatch' + (tagColors[tagName] === color ? ' active' : '');
            sw.style.background = color;
            sw.title = color;
            sw.addEventListener('click', e => {
                e.stopPropagation();
                const c = _loadTagColors(); c[tagName] = color; _saveTagColors(c);
                renderChips(); palette.remove(); activePalette = null;
            });
            palette.appendChild(sw);
        });

        document.body.appendChild(palette);
        activePalette = palette;

        const rect = dotEl.getBoundingClientRect();
        palette.style.top  = (rect.bottom + 6) + 'px';
        palette.style.left = rect.left + 'px';

        requestAnimationFrame(() => {
            const pr = palette.getBoundingClientRect();
            if (pr.right  > window.innerWidth  - 8) palette.style.left = (window.innerWidth  - pr.width  - 8) + 'px';
            if (pr.bottom > window.innerHeight - 8) palette.style.top  = (rect.top - pr.height - 6) + 'px';
        });

        const outside = e => {
            if (!palette.contains(e.target) && e.target !== dotEl) {
                palette.remove(); activePalette = null;
                document.removeEventListener('click', outside);
            }
        };
        setTimeout(() => document.addEventListener('click', outside), 0);
    }

    if (inputEl) {
        inputEl.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ',') && inputEl.value.trim()) {
                e.preventDefault();
                const tag = inputEl.value.trim().replace(/,+$/, '');
                if (tag && !editingTags.includes(tag)) { editingTags.push(tag); renderChips(); }
                inputEl.value = '';
            }
            if (e.key === 'Backspace' && !inputEl.value && editingTags.length) {
                editingTags.pop(); renderChips();
            }
        });
    }

    chipsEl?.parentElement?.addEventListener('click', e => {
        if (!e.target.closest('.lib-tag-chip')) inputEl?.focus();
    });

    return {
        reset() {
            editingTags = [];
            activePalette?.remove();
            activePalette = null;
            renderChips();
        },
        getTags() { return [...editingTags]; },
    };
}
