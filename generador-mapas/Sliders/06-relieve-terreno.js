/* =========================================
   KOMOREBI
   SLIDER 06 — TERRAIN RELIEF

   Optimización de renderizado:
   - Geometría topográfica idéntica
   - Curvas dibujadas en Canvas 2D
   - Una sola imagen SVG
   - Recorte exacto con las siluetas
   - Caché de geometría por tamaño
   - Sin animaciones adicionales
========================================= */

(() => {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";

    const CONFIG = {
        id: "komorebi-topografia-06",
        clipId: "komorebi-recorte-topografico-06",

        paso: 4,
        niveles: 56,

        trazo: 0.65,
        trazoPrincipal: 0.95,

        gris: "#666666",
        grisPrincipal: "#292929",

        // Resolución de rasterizado.
        // 2 mantiene los contornos definidos.
        escalaRender: 2,

        maxCache: 2
    };

    let valorRelieve = 0;

    let svgActual = null;
    let capaActual = null;
    let imagenActual = null;

    let geometriaActual = null;
    let anchoActual = 0;
    let altoActual = 0;

    let observador = null;

    let sincronizacionPendiente = false;
    let renderPendiente = false;

    let ultimaIntensidad = -1;

    const cacheGeometria = new Map();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {
        alpha: true
    });


    // =========================================
    // UTILIDADES
    // =========================================

    function crearSVG(tipo, atributos = {}) {
        const elemento = document.createElementNS(
            NS,
            tipo
        );

        for (const [nombre, valor] of Object.entries(
            atributos
        )) {
            elemento.setAttribute(
                nombre,
                String(valor)
            );
        }

        return elemento;
    }

    function limitar(valor, minimo, maximo) {
        return Math.max(
            minimo,
            Math.min(maximo, valor)
        );
    }

    function hash(x, y, semilla) {
        const numero = Math.sin(
            x * 127.1 +
            y * 311.7 +
            semilla * 74.7
        ) * 43758.5453;

        return numero - Math.floor(numero);
    }

    function ruido(x, y, semilla) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);

        let u = x - ix;
        let v = y - iy;

        u = u * u * (3 - 2 * u);
        v = v * v * (3 - 2 * v);

        const a = hash(ix, iy, semilla);
        const b = hash(ix + 1, iy, semilla);

        const c = hash(ix, iy + 1, semilla);
        const d = hash(ix + 1, iy + 1, semilla);

        return (
            (a + (b - a) * u) * (1 - v) +
            (c + (d - c) * u) * v
        );
    }


    // =========================================
    // CAMPO TOPOGRÁFICO ORIGINAL
    // =========================================

    function calcularAltura(x, y) {
        const desplazamientoX = (
            ruido(x * 0.004, y * 0.004, 8) - 0.5
        ) * 95;

        const desplazamientoY = (
            ruido(x * 0.004, y * 0.004, 9) - 0.5
        ) * 95;

        const px = x + desplazamientoX;
        const py = y + desplazamientoY;

        const base = ruido(
            px * 0.009,
            py * 0.009,
            3
        );

        const medio = ruido(
            px * 0.022,
            py * 0.022,
            5
        );

        const detalle = ruido(
            px * 0.052,
            py * 0.052,
            7
        );

        return (
            base * 0.58 +
            medio * 0.30 +
            detalle * 0.12
        );
    }


    // =========================================
    // ENCONTRAR SILUETAS ORIGINALES
    // =========================================

    function obtenerGrupoContornos(svg) {
        const grupos = Array.from(
            svg.children
        ).filter(elemento =>
            elemento.tagName.toLowerCase() === "g"
        );

        return grupos.find(grupo => {
            const transformacion =
                grupo.getAttribute("transform") || "";

            return (
                transformacion.includes("translate(") &&
                grupo.querySelector("path[d]")
            );
        }) || null;
    }


    // =========================================
    // MÁSCARA DE RECORTE
    // =========================================

    function crearRecorteTerritorial(
        svg,
        grupoContornos
    ) {
        const defs = crearSVG("defs", {
            "data-relieve-topografico": "true"
        });

        const clip = crearSVG("clipPath", {
            id: CONFIG.clipId,
            clipPathUnits: "userSpaceOnUse"
        });

        const rutas = grupoContornos.querySelectorAll(
            "path[d]"
        );

        for (const ruta of rutas) {
            const d = ruta.getAttribute("d");

            if (!d) {
                continue;
            }

            clip.appendChild(
                crearSVG("path", {
                    d,
                    fill: "#ffffff",
                    stroke: "none"
                })
            );
        }

        if (!clip.childNodes.length) {
            return false;
        }

        defs.appendChild(clip);

        svg.insertBefore(
            defs,
            grupoContornos
        );

        return true;
    }


    // =========================================
    // GEOMETRÍA TOPOGRÁFICA
    // =========================================

    function calcularGeometria(ancho, alto) {
        const paso = CONFIG.paso;
        const totalNiveles = CONFIG.niveles;

        const columnas = Math.ceil(
            ancho / paso
        ) + 1;

        const filas = Math.ceil(
            alto / paso
        ) + 1;

        const campo = new Float32Array(
            columnas * filas
        );

        // Calcular una sola vez las alturas.
        for (let y = 0; y < filas; y++) {
            const py = y * paso;
            const fila = y * columnas;

            for (let x = 0; x < columnas; x++) {
                campo[fila + x] = calcularAltura(
                    x * paso,
                    py
                );
            }
        }

        const alturas = new Float64Array(
            totalNiveles
        );

        for (
            let nivel = 0;
            nivel < totalNiveles;
            nivel++
        ) {
            alturas[nivel] = (
                0.16 +
                (nivel + 1) *
                (0.68 / (totalNiveles + 1))
            );
        }

        const segmentosPorNivel = Array.from(
            { length: totalNiveles },
            () => []
        );

        // Se conserva exactamente el mismo
        // método de intersección de curvas.
        for (let y = 0; y < filas - 1; y++) {
            const fila = y * columnas;

            const py = y * paso;
            const py2 = py + paso;

            for (
                let x = 0;
                x < columnas - 1;
                x++
            ) {
                const indice = fila + x;

                const a = campo[indice];
                const b = campo[indice + 1];

                const c = campo[
                    indice + columnas + 1
                ];

                const d = campo[
                    indice + columnas
                ];

                const minimo = Math.min(
                    a, b, c, d
                );

                const maximo = Math.max(
                    a, b, c, d
                );

                if (
                    maximo <= alturas[0] ||
                    minimo >= alturas[totalNiveles - 1]
                ) {
                    continue;
                }

                const px = x * paso;
                const px2 = px + paso;

                for (
                    let nivel = 0;
                    nivel < totalNiveles;
                    nivel++
                ) {
                    const altura = alturas[nivel];

                    if (
                        altura <= minimo ||
                        altura >= maximo
                    ) {
                        continue;
                    }

                    const cortes = [];

                    function cruzar(
                        valorA,
                        valorB,
                        x1,
                        y1,
                        x2,
                        y2
                    ) {
                        if (
                            (valorA < altura) ===
                            (valorB < altura)
                        ) {
                            return;
                        }

                        const t = limitar(
                            (altura - valorA) /
                            (valorB - valorA),
                            0,
                            1
                        );

                        cortes.push([
                            x1 + (x2 - x1) * t,
                            y1 + (y2 - y1) * t
                        ]);
                    }

                    cruzar(
                        a, b,
                        px, py,
                        px2, py
                    );

                    cruzar(
                        b, c,
                        px2, py,
                        px2, py2
                    );

                    cruzar(
                        c, d,
                        px2, py2,
                        px, py2
                    );

                    cruzar(
                        d, a,
                        px, py2,
                        px, py
                    );

                    const segmentos =
                        segmentosPorNivel[nivel];

                    for (
                        let i = 0;
                        i + 1 < cortes.length;
                        i += 2
                    ) {
                        const primero = cortes[i];
                        const segundo = cortes[i + 1];

                        segmentos.push(
                            `M${primero[0].toFixed(1)} ` +
                            `${primero[1].toFixed(1)}` +
                            `L${segundo[0].toFixed(1)} ` +
                            `${segundo[1].toFixed(1)}`
                        );
                    }
                }
            }
        }

        // Convertir los segmentos a Path2D.
        // Se dibujarán directamente en Canvas.
        const geometria = [];

        for (
            let nivel = 0;
            nivel < totalNiveles;
            nivel++
        ) {
            const segmentos =
                segmentosPorNivel[nivel];

            if (!segmentos.length) {
                continue;
            }

            geometria.push({
                nivel,
                path: new Path2D(
                    segmentos.join("")
                )
            });
        }

        return geometria;
    }


    // =========================================
    // CACHÉ DE GEOMETRÍA
    // =========================================

    function obtenerGeometria(ancho, alto) {
        const clave = `${ancho}x${alto}`;

        if (cacheGeometria.has(clave)) {
            return cacheGeometria.get(clave);
        }

        const geometria = calcularGeometria(
            ancho,
            alto
        );

        if (
            cacheGeometria.size >=
            CONFIG.maxCache
        ) {
            const primeraClave =
                cacheGeometria.keys().next().value;

            cacheGeometria.delete(primeraClave);
        }

        cacheGeometria.set(
            clave,
            geometria
        );

        return geometria;
    }


    // =========================================
    // RENDERIZAR EN UNA SOLA CAPA
    // =========================================

    function renderizarTopografia() {
        if (
            !imagenActual ||
            !geometriaActual ||
            !anchoActual ||
            !altoActual ||
            !ctx
        ) {
            return;
        }

        const proporcion = limitar(
            valorRelieve / 100,
            0,
            1
        );

        const intensidad = Math.pow(
            proporcion,
            0.85
        );

        // Evitar renders duplicados.
        if (intensidad === ultimaIntensidad) {
            return;
        }

        ultimaIntensidad = intensidad;

        const escala = CONFIG.escalaRender;

        const anchoPixeles = Math.ceil(
            anchoActual * escala
        );

        const altoPixeles = Math.ceil(
            altoActual * escala
        );

        if (
            canvas.width !== anchoPixeles ||
            canvas.height !== altoPixeles
        ) {
            canvas.width = anchoPixeles;
            canvas.height = altoPixeles;
        }

        ctx.setTransform(
            escala, 0,
            0, escala,
            0, 0
        );

        ctx.clearRect(
            0,
            0,
            anchoActual,
            altoActual
        );

        if (intensidad > 0) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const total = geometriaActual.length;

            const visibles = Math.round(
                total * intensidad
            );

            if (visibles > 0) {
                for (let i = 0; i < total; i++) {
                    const posicion = (
                        i * 0.618033988749895
                    ) % 1;

                    if (posicion >= intensidad) {
                        continue;
                    }

                    const curva = geometriaActual[i];

                    const principal =
                        curva.nivel % 9 === 0;

                    ctx.strokeStyle = principal
                        ? CONFIG.grisPrincipal
                        : CONFIG.gris;

                    ctx.lineWidth = principal
                        ? CONFIG.trazoPrincipal
                        : CONFIG.trazo;

                    ctx.stroke(curva.path);
                }
            }
        }

        // Actualizar una única imagen SVG.
        // No se insertan miles de segmentos
        // en el DOM.
        imagenActual.setAttribute(
            "href",
            canvas.toDataURL("image/png")
        );
    }

    function programarRender() {
        if (renderPendiente) {
            return;
        }

        renderPendiente = true;

        requestAnimationFrame(() => {
            renderPendiente = false;
            renderizarTopografia();
        });
    }


    // =========================================
    // ACTUALIZAR SLIDER
    // =========================================

    function actualizarRelieve(valor) {
        const numero = Number(valor);

        valorRelieve = Number.isFinite(numero)
            ? limitar(numero, 0, 100)
            : 0;

        programarRender();
    }


    // =========================================
    // CONSTRUIR CAPA TOPOGRÁFICA
    // =========================================

    function construirTopografia(svg) {
        const grupoContornos =
            obtenerGrupoContornos(svg);

        if (!grupoContornos) {
            return;
        }

        const recorteCreado =
            crearRecorteTerritorial(
                svg,
                grupoContornos
            );

        if (!recorteCreado) {
            return;
        }

        const capa = crearSVG("g", {
            id: CONFIG.id,
            "pointer-events": "none"
        });

        const transformacion =
            grupoContornos.getAttribute(
                "transform"
            );

        if (transformacion) {
            capa.setAttribute(
                "transform",
                transformacion
            );
        }

        const grupoRecortado = crearSVG("g", {
            "clip-path":
                `url(#${CONFIG.clipId})`
        });

        const vista = svg.viewBox.baseVal;

        const anchoLienzo = vista.width;
        const altoLienzo = vista.height;

        const extension =
            typeof EXTENSION_MASCARA !== "undefined"
                ? EXTENSION_MASCARA
                : 180;

        const anchoCampo =
            anchoLienzo + extension * 2;

        const altoCampo =
            altoLienzo + extension * 2;

        const imagen = crearSVG("image", {
            x: 0,
            y: 0,

            width: anchoCampo,
            height: altoCampo,

            preserveAspectRatio: "none",

            "pointer-events": "none"
        });

        grupoRecortado.appendChild(imagen);
        capa.appendChild(grupoRecortado);

        svg.insertBefore(
            capa,
            grupoContornos
        );

        // La geometría solo depende del tamaño.
        geometriaActual = obtenerGeometria(
            anchoCampo,
            altoCampo
        );

        anchoActual = anchoCampo;
        altoActual = altoCampo;

        svgActual = svg;
        capaActual = capa;
        imagenActual = imagen;

        // La nueva imagen necesita su primer render.
        ultimaIntensidad = -1;

        programarRender();
    }


    // =========================================
    // SINCRONIZACIÓN CON EL MAPA
    // =========================================

    function sincronizarTopografia() {
        const lienzo = document.getElementById(
            "lienzo"
        );

        if (!lienzo) {
            return;
        }

        const svg = lienzo.querySelector("svg");

        if (!svg) {
            svgActual = null;
            capaActual = null;
            imagenActual = null;

            geometriaActual = null;

            ultimaIntensidad = -1;

            return;
        }

        if (
            svg === svgActual &&
            capaActual &&
            capaActual.isConnected
        ) {
            return;
        }

        construirTopografia(svg);
    }

    function programarSincronizacion() {
        if (sincronizacionPendiente) {
            return;
        }

        sincronizacionPendiente = true;

        requestAnimationFrame(() => {
            sincronizacionPendiente = false;
            sincronizarTopografia();
        });
    }


    // =========================================
    // INICIALIZACIÓN
    // =========================================

    function inicializarRelieve() {
        const slider = document.getElementById(
            "relieve"
        );

        if (slider) {
            const numero = Number(slider.value);

            valorRelieve = Number.isFinite(numero)
                ? limitar(numero, 0, 100)
                : 0;

            slider.addEventListener(
                "input",
                () => {
                    actualizarRelieve(
                        slider.value
                    );
                }
            );
        }

        const lienzo = document.getElementById(
            "lienzo"
        );

        if (!lienzo) {
            return;
        }

        if (observador) {
            observador.disconnect();
        }

        observador = new MutationObserver(
            programarSincronizacion
        );

        observador.observe(lienzo, {
            childList: true
        });

        programarSincronizacion();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializarRelieve,
            { once: true }
        );
    } else {
        inicializarRelieve();
    }

})();