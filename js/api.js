const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://TU_BACKEND.up.railway.app/api';

class API {
    static async _fetch(path, opts = {}) {
        const res = await fetch(`${API_URL}${path}`, opts);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
        return json;
    }

    // ── Canciones ──────────────────────────────────────
    static async listar(params = {}) {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
        );
        const json = await API._fetch(`/canciones?${qs}`);
        return json.data || [];
    }

    static async obtenerTodas() {
        return API.listar();
    }

    static async obtenerStats() {
        try {
            const json = await API._fetch('/canciones/stats');
            return json.data || {};
        } catch { return {}; }
    }

    static async crear(datos) {
        const json = await API._fetch('/canciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cantautor:    datos.cantautor,
                nombre:       datos.nombre,
                tono_original: datos.tonoOriginal,
                bpm:          datos.bpm ? parseInt(datos.bpm) : null,
                etiquetas:    Array.isArray(datos.etiquetas)
                                ? datos.etiquetas
                                : (datos.etiquetas || '').split(',').map(e => e.trim()).filter(Boolean),
                notas:        datos.notas,
            })
        });
        return json.data;
    }

    static async actualizar(id, datos) {
        const json = await API._fetch(`/canciones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cantautor:    datos.cantautor,
                nombre:       datos.nombre,
                tono_original: datos.tonoOriginal,
                bpm:          datos.bpm ? parseInt(datos.bpm) : null,
                etiquetas:    Array.isArray(datos.etiquetas)
                                ? datos.etiquetas
                                : (datos.etiquetas || '').split(',').map(e => e.trim()).filter(Boolean),
                notas:        datos.notas,
            })
        });
        return json.data;
    }

    static async eliminar(id) {
        await API._fetch(`/canciones/${id}`, { method: 'DELETE' });
        return true;
    }

    // ── Favoritos ─────────────────────────────────────
    static async obtenerFavoritos() {
        try {
            const json = await API._fetch('/favoritos');
            return json.data || [];
        } catch { return []; }
    }

    static async toggleFavorito(id) {
        const json = await API._fetch(`/favoritos/${id}`, { method: 'POST' });
        return json.favorito;
    }

    // ── Setlists ──────────────────────────────────────
    static async obtenerSetlists() {
        const json = await API._fetch('/setlists');
        return json.data || [];
    }

    static async obtenerSetlist(id) {
        const json = await API._fetch(`/setlists/${id}`);
        return json.data;
    }

    static async crearSetlist(datos) {
        const json = await API._fetch('/setlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return json.data;
    }

    static async agregarASetlist(setlistId, cancionId) {
        await API._fetch(`/setlists/${setlistId}/canciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cancion_id: cancionId })
        });
    }

    static async eliminarDeSetlist(setlistId, cancionId) {
        await API._fetch(`/setlists/${setlistId}/canciones/${cancionId}`, { method: 'DELETE' });
    }

    static async eliminarSetlist(id) {
        await API._fetch(`/setlists/${id}`, { method: 'DELETE' });
    }
}

export default API;
