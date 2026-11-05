
/* KOMOREBI — lectura fiel de territorios SVG */
(() => {
    "use strict";
    const rutas = {
    tokyo: "territorios/tokyo.svg",
    kyoto: "territorios/kyoto.svg", 
    osaka: "territorios/osaka.svg",
    hokkaido: "territorios/hokkaido.svg",
    okinawa: "territorios/okinawa.svg"
};
    const cache = new Map();
    const estado = { modo: "random", territorio: "tokyo" };
    let version = 0;

    async function cargarTerritorio(nombre) {
        if (!rutas[nombre]) throw new Error(`Territorio aún no disponible: ${nombre}`);
        if (!cache.has(nombre)) {
            cache.set(nombre, (async () => {
                const respuesta = await fetch(rutas[nombre]);
                if (!respuesta.ok) throw new Error(`No se pudo abrir ${rutas[nombre]}`);
                const texto = await respuesta.text();
                const documento = new DOMParser().parseFromString(texto, "image/svg+xml");
                if (documento.querySelector("parsererror")) throw new Error("SVG no válido");
                const svg = documento.documentElement;
                const caja = svg.viewBox.baseVal;
                // Los 16 paths visibles están dentro de <g>; los 16 de las máscaras
                // están en <defs> y NO deben dibujarse dos veces.
               const paths = [
    ...svg.querySelectorAll("path")
].filter(path => !path.closest("defs, mask"));
                if (!paths.length) throw new Error("No se encontraron trazados visibles");
                const formas = paths.map(path => {
                    const longitud = path.getTotalLength();
                    const cantidad = Math.max(48, Math.min(2500, Math.ceil(longitud / 1.2)));
                    const puntos = [];
                    for (let i = 0; i < cantidad; i++) {
                        const punto = path.getPointAtLength(longitud * i / cantidad);
                        puntos.push({ x: punto.x, y: punto.y });
                    }
                    return { d: path.getAttribute("d"), puntos };
                });
                return { ancho: caja.width || 937, alto: caja.height || 786, formas };
            })().catch(error => { cache.delete(nombre); throw error; }));
        }
        return cache.get(nombre);
    }

    async function actualizar() {
        const actual = ++version;
        if (estado.modo === "random") {
            document.dispatchEvent(new CustomEvent("komorebi:cambio-territorio", { detail: { ...estado } }));
            return;
        }
        try {
            const geometria = await cargarTerritorio(estado.territorio);
            if (actual !== version) return;
            document.dispatchEvent(new CustomEvent("komorebi:cambio-territorio", {
                detail: { ...estado, geometria }
            }));
        } catch (error) {
            if (actual === version) console.error("KOMOREBI: error de territorio", error);
        }
    }

    function iniciar() {
        const radios = [...document.querySelectorAll('input[name="modo-generacion"]')];
        const selector = document.getElementById("territorio-seleccionado");
        const contenedor = document.getElementById("contenedor-territorios");
        if (!radios.length || !selector) return;
        estado.modo = radios.find(r => r.checked)?.value || "random";
        estado.territorio = selector.value || "tokyo";
        const mostrar = () => { if (contenedor) contenedor.hidden = estado.modo !== "territory"; };
        radios.forEach(radio => radio.addEventListener("change", () => {
            if (!radio.checked) return;
            estado.modo = radio.value;
            mostrar();
            actualizar();
        }));
        selector.addEventListener("change", () => {
            estado.territorio = selector.value;
            actualizar();
        });
        mostrar();
        if (estado.modo === "territory") actualizar();
    }

    window.KomorebiTerritorios = { obtenerSeleccion: () => ({ ...estado }), cargarTerritorio };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else iniciar();
})();
