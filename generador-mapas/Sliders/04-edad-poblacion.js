
/* =========================================
   KOMOREBI
   SLIDER 04 — POPULATION AGE

   Erosión localizada:
   - Blur
   - Distorsión orgánica
   - Bitmap / tramado granular
   - Contornos de islas
   - Líneas topográficas del slider 06

   Sin capas grises ni imágenes externas.
========================================= */

(() => {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";

    const CONFIG = {
        idFiltro: "komorebi-erosion-edad-04",

        desenfoqueMaximo: 1.15,
        distorsionMaxima: 2.6,

        frecuenciaRuido: 0.085,
        octavasRuido: 2,

        escalaZonas: 0.012,
        coberturaMaxima: 0.88,

        // Nuevo tratamiento bitmap
        frecuenciaBitmap: 0.85,
        contrasteBitmap: 9,
        intensidadBitmap: 0.78,

        potenciaSlider: 1.2,

        semillaRuido: 27
    };

    let edadPoblacion = 50;

    let svgActual = null;
    let filtroActual = null;

    let desplazamiento = null;
    let desenfoque = null;
    let mascaraZonas = null;

    let canalBitmap = null;
    let mezclaBitmap = null;

    let grupoContornos = null;
    let capaTopografia = null;

    let observador = null;
    let actualizacionPendiente = false;


    // =====================================
    // UTILIDADES
    // =====================================

    function limitar(valor, minimo, maximo) {
        return Math.max(minimo, Math.min(maximo, valor));
    }

    function crearSVG(nombre, atributos = {}) {
        const elemento = document.createElementNS(
            NS,
            nombre
        );

        for (const [clave, valor] of Object.entries(
            atributos
        )) {
            elemento.setAttribute(clave, String(valor));
        }

        return elemento;
    }


    // =====================================
    // ENCONTRAR CONTORNOS
    // =====================================

    function encontrarContornos(svg) {
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
                grupo.querySelector("path[stroke]")
            );
        }) || null;
    }


    // =====================================
    // CREAR FILTRO
    // =====================================

    function crearFiltro(svg) {
        const defs = crearSVG("defs", {
            "data-erosion-edad": "true"
        });

        const filtro = crearSVG("filter", {
            id: CONFIG.idFiltro,
            x: "-10%",
            y: "-10%",
            width: "120%",
            height: "120%",
            "color-interpolation-filters": "sRGB"
        });

        // ---------------------------------
        // 1. RUIDO ORGÁNICO
        // ---------------------------------

        const ruido = crearSVG("feTurbulence", {
            type: "fractalNoise",
            baseFrequency: CONFIG.frecuenciaRuido,
            numOctaves: CONFIG.octavasRuido,
            seed: CONFIG.semillaRuido,
            result: "ruidoOrganico"
        });

        const desplazar = crearSVG(
            "feDisplacementMap",
            {
                in: "SourceGraphic",
                in2: "ruidoOrganico",
                scale: 0,
                xChannelSelector: "R",
                yChannelSelector: "G",
                result: "contornoDistorsionado"
            }
        );

        // ---------------------------------
        // 2. BLUR
        // ---------------------------------

        const blur = crearSVG(
            "feGaussianBlur",
            {
                in: "contornoDistorsionado",
                stdDeviation: 0,
                result: "contornoDifuso"
            }
        );

        // ---------------------------------
        // 3. BITMAP SOBRE EL BLUR
        // ---------------------------------

        /*
           Creamos un ruido de frecuencia alta.

           Después convertimos ese ruido en
           una máscara de alto contraste.

           La máscara perfora parcialmente
           los bordes desenfocados.
        */

        const ruidoBitmap = crearSVG(
            "feTurbulence",
            {
                type: "fractalNoise",
                baseFrequency:
                    CONFIG.frecuenciaBitmap,
                numOctaves: 1,
                seed: 43,
                result: "ruidoBitmap"
            }
        );

        const contrasteBitmap = crearSVG(
            "feComponentTransfer",
            {
                in: "ruidoBitmap",
                result: "mascaraBitmap"
            }
        );

        const funcR = crearSVG("feFuncR", {
            type: "identity"
        });

        const funcG = crearSVG("feFuncG", {
            type: "identity"
        });

        const funcB = crearSVG("feFuncB", {
            type: "identity"
        });

        const funcA = crearSVG("feFuncA", {
            type: "linear",
            slope: CONFIG.contrasteBitmap,
            intercept: -4
        });

        contrasteBitmap.append(
            funcR,
            funcG,
            funcB,
            funcA
        );

        // Perforar el contorno desenfocado
        // usando el ruido de alto contraste.
        const aplicarBitmap = crearSVG(
            "feComposite",
            {
                in: "contornoDifuso",
                in2: "mascaraBitmap",
                operator: "in",
                result: "contornoBitmap"
            }
        );

        // ---------------------------------
        // 4. MEZCLAR BLUR Y BITMAP
        // ---------------------------------

        /*
           Se conservan algunos píxeles
           desenfocados y otros se convierten
           en una textura de puntos.
        */

        const blurReducido = crearSVG(
            "feComponentTransfer",
            {
                in: "contornoDifuso",
                result: "blurReducido"
            }
        );

        const opacidadBlur = crearSVG(
            "feFuncA",
            {
                type: "linear",
                slope: 1
            }
        );

        blurReducido.appendChild(opacidadBlur);

        const unirBitmap = crearSVG(
            "feComposite",
            {
                in: "contornoBitmap",
                in2: "blurReducido",
                operator: "over",
                result: "erosionConBitmap"
            }
        );

        // ---------------------------------
        // 5. ZONAS ALEATORIAS
        // ---------------------------------

        const ruidoZonas = crearSVG(
            "feTurbulence",
            {
                type: "fractalNoise",
                baseFrequency: CONFIG.escalaZonas,
                numOctaves: 2,
                seed: 91,
                result: "zonasAleatorias"
            }
        );

        const contrasteZonas = crearSVG(
            "feComponentTransfer",
            {
                in: "zonasAleatorias",
                result: "zonasContrastadas"
            }
        );

        const canalZonas = crearSVG(
            "feFuncA",
            {
                type: "linear",
                slope: 6,
                intercept: -3
            }
        );

        contrasteZonas.appendChild(canalZonas);

        // ---------------------------------
        // 6. APLICAR SOLO EN CIERTAS ZONAS
        // ---------------------------------

        const erosionLocalizada = crearSVG(
            "feComposite",
            {
                in: "erosionConBitmap",
                in2: "zonasContrastadas",
                operator: "in",
                result: "erosionLocalizada"
            }
        );

        const contornoIntacto = crearSVG(
            "feComposite",
            {
                in: "SourceGraphic",
                in2: "zonasContrastadas",
                operator: "out",
                result: "contornoIntacto"
            }
        );

        const resultado = crearSVG(
            "feComposite",
            {
                in: "erosionLocalizada",
                in2: "contornoIntacto",
                operator: "over"
            }
        );

        filtro.append(
            ruido,
            desplazar,
            blur,
            ruidoBitmap,
            contrasteBitmap,
            aplicarBitmap,
            blurReducido,
            unirBitmap,
            ruidoZonas,
            contrasteZonas,
            erosionLocalizada,
            contornoIntacto,
            resultado
        );

        defs.appendChild(filtro);
        svg.insertBefore(defs, svg.firstChild);

        filtroActual = filtro;

        desplazamiento = desplazar;
        desenfoque = blur;
        mascaraZonas = canalZonas;

        canalBitmap = funcA;
        mezclaBitmap = opacidadBlur;
    }


    // =====================================
    // APLICAR EFECTO
    // =====================================

    function aplicarFiltro() {
        if (!filtroActual) return;

        const progreso = Math.pow(
            limitar(edadPoblacion / 100, 0, 1),
            CONFIG.potenciaSlider
        );

        const referencia =
            `url(#${CONFIG.idFiltro})`;

        for (const elemento of [
            grupoContornos,
            capaTopografia
        ]) {
            if (!elemento) continue;

            if (progreso <= 0.001) {
                elemento.removeAttribute("filter");
            } else {
                elemento.setAttribute(
                    "filter",
                    referencia
                );
            }
        }

        if (progreso <= 0.001) return;

        desplazamiento.setAttribute(
            "scale",
            (
                progreso *
                CONFIG.distorsionMaxima
            ).toFixed(3)
        );

        desenfoque.setAttribute(
            "stdDeviation",
            (
                progreso *
                CONFIG.desenfoqueMaximo
            ).toFixed(3)
        );

        // Cobertura de las zonas erosionadas.
        const cobertura =
            progreso *
            CONFIG.coberturaMaxima;

        const umbral =
            0.75 - cobertura * 0.58;

        mascaraZonas.setAttribute(
            "intercept",
            (-6 * umbral).toFixed(3)
        );

        // Intensidad del bitmap.
        const intensidad =
            progreso *
            CONFIG.intensidadBitmap;

        /*
           Al subir el slider, reducimos
           la cantidad de blur continuo
           y hacemos más visible el bitmap.
        */

        mezclaBitmap.setAttribute(
            "slope",
            (1 - intensidad * 0.85).toFixed(3)
        );

        canalBitmap.setAttribute(
            "slope",
            (
                CONFIG.contrasteBitmap *
                (0.5 + intensidad)
            ).toFixed(3)
        );

        canalBitmap.setAttribute(
            "intercept",
            (
                -CONFIG.contrasteBitmap *
                (0.25 + intensidad * 0.22)
            ).toFixed(3)
        );
    }


    // =====================================
    // SINCRONIZAR CON EL MAPA
    // =====================================

    function sincronizar() {
        const lienzo = document.getElementById(
            "lienzo"
        );

        if (!lienzo) return;

        let svgMapa = null;

        for (const svg of lienzo.querySelectorAll("svg")) {
            if (encontrarContornos(svg)) {
                svgMapa = svg;
                break;
            }
        }

        if (!svgMapa) {
            svgActual = null;
            grupoContornos = null;
            capaTopografia = null;
            return;
        }

        if (
            svgMapa !== svgActual ||
            !filtroActual ||
            !filtroActual.isConnected
        ) {
            svgActual = svgMapa;
            crearFiltro(svgMapa);
        }

        grupoContornos =
            encontrarContornos(svgMapa);

        capaTopografia =
            svgMapa.querySelector(
                "#komorebi-topografia-06"
            );

        aplicarFiltro();
    }


    // =====================================
    // ACTUALIZAR SLIDER
    // =====================================

    function actualizarEdad(valor) {
        const numero = Number(valor);

        edadPoblacion = Number.isFinite(numero)
            ? limitar(numero, 0, 100)
            : 50;

        aplicarFiltro();
    }


    // =====================================
    // OBSERVAR REGENERACIÓN
    // =====================================

    function programarSincronizacion() {
        if (actualizacionPendiente) return;

        actualizacionPendiente = true;

        requestAnimationFrame(() => {
            actualizacionPendiente = false;
            sincronizar();
        });
    }

    function inicializar() {
        const slider =
            document.getElementById("edad");

        if (slider) {
            edadPoblacion = limitar(
                Number(slider.value) || 0,
                0,
                100
            );

            slider.addEventListener(
                "input",
                () => actualizarEdad(slider.value)
            );
        }

        const lienzo =
            document.getElementById("lienzo");

        if (!lienzo) return;

        if (observador) {
            observador.disconnect();
        }

        observador = new MutationObserver(
            programarSincronizacion
        );

        observador.observe(lienzo, {
            childList: true,
            subtree: true
        });

        programarSincronizacion();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializar,
            { once: true }
        );
    } else {
        inicializar();
    }

})();
