const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://TU_BACKEND.up.railway.app/api';

class API {
    static async obtenerTodas() {
        try {
            const response = await fetch(`${API_URL}/canciones`);
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const json = await response.json();
            return json.data || [];
        } catch (error) {
            console.error('❌ Error al obtener canciones:', error);
            throw error;
        }
    }

    static async buscar(termino = '', filtros = {}) {
        try {
            const params = new URLSearchParams({
                q: termino,
                bpmMin: filtros.bpmMin || '',
                bpmMax: filtros.bpmMax || '',
                tono: filtros.tono || ''
            });
            const response = await fetch(`${API_URL}/canciones/search?${params}`);
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const json = await response.json();
            return json.data || [];
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            throw error;
        }
    }

    static async obtenerStats() {
        try {
            const response = await fetch(`${API_URL}/canciones/stats`);
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const json = await response.json();
            return json.data || { totalCanciones: 0, totalCantautores: 0, bpmPromedio: 0 };
        } catch (error) {
            console.error('❌ Error al obtener stats:', error);
            return { totalCanciones: 0, totalCantautores: 0, bpmPromedio: 0 };
        }
    }

    static async crear(datos) {
        try {
            const response = await fetch(`${API_URL}/canciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cantautor: datos.cantautor,
                    nombre: datos.nombre,
                    tono_original: datos.tonoOriginal,
                    bpm: datos.bpm ? parseInt(datos.bpm) : null,
                    etiquetas: Array.isArray(datos.etiquetas)
                        ? datos.etiquetas
                        : (datos.etiquetas || '').split(',').map(e => e.trim()).filter(e => e),
                    notas: datos.notas
                })
            });
            if (!response.ok) {
                const json = await response.json();
                throw new Error(json.error || `Error: ${response.status}`);
            }
            return (await response.json()).data;
        } catch (error) {
            console.error('❌ Error al crear:', error);
            throw error;
        }
    }

    static async actualizar(id, datos) {
        try {
            const response = await fetch(`${API_URL}/canciones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cantautor: datos.cantautor,
                    nombre: datos.nombre,
                    tono_original: datos.tonoOriginal,
                    bpm: datos.bpm ? parseInt(datos.bpm) : null,
                    etiquetas: Array.isArray(datos.etiquetas)
                        ? datos.etiquetas
                        : (datos.etiquetas || '').split(',').map(e => e.trim()).filter(e => e),
                    notas: datos.notas
                })
            });
            if (!response.ok) {
                const json = await response.json();
                throw new Error(json.error || `Error: ${response.status}`);
            }
            return (await response.json()).data;
        } catch (error) {
            console.error('❌ Error al actualizar:', error);
            throw error;
        }
    }

    static async eliminar(id) {
        try {
            const response = await fetch(`${API_URL}/canciones/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const json = await response.json();
                throw new Error(json.error || `Error: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar:', error);
            throw error;
        }
    }
}

export default API;
