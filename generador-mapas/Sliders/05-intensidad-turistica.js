
/* =========================================
   KOMOREBI
   SLIDER 05 — TOURISM INTENSITY

   Glitch rectangular localizado.
   Sin animación propia ni cambios de color.
   No modifica los elementos originales.
========================================= */

const configuracionGlitchTurismo = {
    // Intensidad de los desplazamientos.
    desplazamientoMaximo: 75,

    // Fragmentos pequeños, en píxeles.
    pequenoMin: 3,
    pequenoMax: 18,

    // Fragmentos grandes, en píxeles.
    grandeMin: 90,
    grandeMax: 320,

    // Fragmentos intermedios.
    medianoMin: 20,
    medianoMax: 75,

    // Cantidad máxima de fragmentos.
    cantidadMaxima: 190,

    // Número de zonas afectadas.
    nucleosMaximos: 9,

    // Tamaño de las zonas de concentración.
    radioNucleo: 115,

    // Progresión del slider.
    potenciaSlider: 1.3,

    // Resolución del mapa de desplazamiento.
    // 1 = resolución completa.
    resolucion: 1,

    semilla: 2741
};

let intensidadTuristica = 50;

let svgGlitchTurismo = null;
let defsGlitchTurismo = null;
let filtroGlitchTurismo = null;
let imagenGlitchTurismo = null;
let observadorGlitchTurismo = null;

const NS_GLITCH_TURISMO = "http://www.w3.org/2000/svg";
const ID_GLITCH_TURISMO = "komorebi-glitch-rectangular";


// =========================================
// UTILIDADES
// =========================================

function limitarGlitchTurismo(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
}

function crearElementoGlitchTurismo(nombre, atributos = {}) {
    const elemento = document.createElementNS(
        NS_GLITCH_TURISMO,
        nombre
    );

    for (const [atributo, valor] of Object.entries(atributos)) {
        elemento.setAttribute(atributo, String(valor));
    }

    return elemento;
}

function crearAleatorioGlitchTurismo(semilla) {
    let estado = semilla >>> 0;

    return () => {
        estado = (
            Math.imul(1664525, estado) + 1013904223
        ) >>> 0;

        return estado / 4294967296;
    };
}

function aleatorioEntreGlitch(aleatorio, minimo, maximo) {
    return minimo + aleatorio() * (maximo - minimo);
}

function obtenerProgresoGlitchTurismo() {
    return Math.pow(
        intensidadTuristica / 100,
        configuracionGlitchTurismo.potenciaSlider
    );
}

function obtenerDimensionesGlitchTurismo(svg) {
    const caja = svg.viewBox.baseVal;

    return {
        x: caja.width ? caja.x : 0,
        y: caja.height ? caja.y : 0,
        ancho: caja.width || svg.clientWidth,
        alto: caja.height || svg.clientHeight
    };
}


// =========================================
// LOCALIZAR SILUETAS DEL TERRITORIO
// =========================================

function obtenerZonasTerritorialesGlitch(svg, dimensiones) {
    const zonas = [];

    // Buscar rutas de contorno, excluyendo
    // los trazados pequeños de partículas.

    const rutas = svg.querySelectorAll("path");

    for (const ruta of rutas) {
        if (
            ruta.closest("defs") ||
            ruta.closest("[data-glitch-turismo]")
        ) {
            continue;
        }

        let caja;

        try {
            caja = ruta.getBBox();
        } catch {
            continue;
        }

        if (
            !caja ||
            caja.width < 35 ||
            caja.height < 35
        ) {
            continue;
        }

        const area = caja.width * caja.height;

        if (area < 3500) {
            continue;
        }

        // Preferimos las rutas de contorno
        // que no tienen relleno.

        const relleno =
            ruta.getAttribute("fill") ||
            ruta.style.fill;

        const trazo =
            ruta.getAttribute("stroke") ||
            ruta.style.stroke;

        if (
            relleno &&
            relleno !== "none" &&
            !trazo
        ) {
            continue;
        }

        zonas.push({
            x: caja.x + caja.width / 2,
            y: caja.y + caja.height / 2,
            ancho: caja.width,
            alto: caja.height,
            peso: Math.sqrt(area)
        });
    }

    // Si no encontramos contornos accesibles,
    // utilizamos centros repartidos por el mapa.

    if (!zonas.length) {
        const columnas = 4;
        const filas = 3;

        for (let fila = 0; fila < filas; fila++) {
            for (let columna = 0; columna < columnas; columna++) {
                zonas.push({
                    x: dimensiones.x +
                        dimensiones.ancho *
                        (columna + 0.5) / columnas,

                    y: dimensiones.y +
                        dimensiones.alto *
                        (fila + 0.5) / filas,

                    ancho: dimensiones.ancho / columnas,
                    alto: dimensiones.alto / filas,
                    peso: 1
                });
            }
        }
    }

    return zonas;
}


// =========================================
// CREAR FILTRO SVG
// =========================================

function crearFiltroGlitchTurismo(svg) {
    const defs = crearElementoGlitchTurismo("defs", {
        "data-glitch-turismo": "true"
    });

    const filtro = crearElementoGlitchTurismo("filter", {
        id: ID_GLITCH_TURISMO,
        filterUnits: "userSpaceOnUse",
        primitiveUnits: "userSpaceOnUse",
        "color-interpolation-filters": "sRGB"
    });

    // Esta imagen contendrá un mapa de
    // desplazamiento hecho de rectángulos.
    //
    // El gris neutro representa las zonas
    // donde no hay glitch.

    const imagen = crearElementoGlitchTurismo("feImage", {
        result: "mapaRectangular",
        preserveAspectRatio: "none"
    });

    const desplazamiento = crearElementoGlitchTurismo(
    "feDisplacementMap",
    {
        in: "SourceGraphic",
        in2: "mapaRectangular",
        result: "imagenFragmentada",
        scale:
            configuracionGlitchTurismo.desplazamientoMaximo * 2,
        xChannelSelector: "R",
        yChannelSelector: "G"
    }
);

// Mantener el mapa original debajo del glitch.
const composicion = crearElementoGlitchTurismo(
    "feComposite",
    {
        in: "imagenFragmentada",
        in2: "SourceGraphic",
        operator: "over"
    }
);

filtro.appendChild(imagen);
filtro.appendChild(desplazamiento);
filtro.appendChild(composicion);

    filtro.appendChild(imagen);
    filtro.appendChild(desplazamiento);
    defs.appendChild(filtro);

    svg.insertBefore(defs, svg.firstChild);

    defsGlitchTurismo = defs;
    filtroGlitchTurismo = filtro;
    imagenGlitchTurismo = imagen;
}


// =========================================
// GENERAR NÚCLEOS DE FRAGMENTACIÓN
// =========================================

function generarNucleosGlitch(
    aleatorio,
    zonas,
    dimensiones,
    progreso
) {
    const cantidad = Math.max(
        1,
        Math.round(
            configuracionGlitchTurismo.nucleosMaximos *
            progreso
        )
    );

    const nucleos = [];

    for (let i = 0; i < cantidad; i++) {
        const zona = zonas[
            Math.floor(aleatorio() * zonas.length)
        ];

        // Variación alrededor del territorio
        // para que no se concentre todo
        // exactamente en su centro.

        const dispersionX = Math.min(
            zona.ancho * 0.35,
            dimensiones.ancho * 0.15
        );

        const dispersionY = Math.min(
            zona.alto * 0.35,
            dimensiones.alto * 0.15
        );

        nucleos.push({
            x: limitarGlitchTurismo(
                zona.x +
                (aleatorio() * 2 - 1) * dispersionX,
                dimensiones.x,
                dimensiones.x + dimensiones.ancho
            ),

            y: limitarGlitchTurismo(
                zona.y +
                (aleatorio() * 2 - 1) * dispersionY,
                dimensiones.y,
                dimensiones.y + dimensiones.alto
            ),

            radio:
                configuracionGlitchTurismo.radioNucleo *
                aleatorioEntreGlitch(
                    aleatorio,
                    0.65,
                    1.5
                )
        });
    }

    return nucleos;
}


// =========================================
// GENERAR RECTÁNGULOS
// =========================================

function generarMapaRectangularGlitch() {
    if (
        !svgGlitchTurismo ||
        !filtroGlitchTurismo ||
        !imagenGlitchTurismo
    ) {
        return;
    }

    const progreso = obtenerProgresoGlitchTurismo();

    if (progreso <= 0) {
        svgGlitchTurismo.style.removeProperty("filter");
        return;
    }

    const dimensiones = obtenerDimensionesGlitchTurismo(
        svgGlitchTurismo
    );

    if (!dimensiones.ancho || !dimensiones.alto) {
        return;
    }

    const resolucion =
        configuracionGlitchTurismo.resolucion;

    const anchoCanvas = Math.max(
        1,
        Math.round(dimensiones.ancho * resolucion)
    );

    const altoCanvas = Math.max(
        1,
        Math.round(dimensiones.alto * resolucion)
    );

    const canvas = document.createElement("canvas");

    canvas.width = anchoCanvas;
    canvas.height = altoCanvas;

    const contexto = canvas.getContext("2d", {
        alpha: false
    });

    if (!contexto) return;

    // 128,128 representa un desplazamiento
    // prácticamente neutro en los canales
    // rojo y verde.

    contexto.fillStyle = "rgb(128,128,128)";
    contexto.fillRect(
        0,
        0,
        anchoCanvas,
        altoCanvas
    );

    const aleatorio = crearAleatorioGlitchTurismo(
        configuracionGlitchTurismo.semilla
    );

    const zonas = obtenerZonasTerritorialesGlitch(
        svgGlitchTurismo,
        dimensiones
    );

    const nucleos = generarNucleosGlitch(
        aleatorio,
        zonas,
        dimensiones,
        progreso
    );

    const cantidad = Math.round(
        configuracionGlitchTurismo.cantidadMaxima *
        progreso
    );

    for (let i = 0; i < cantidad; i++) {
        const nucleo = nucleos[
            Math.floor(aleatorio() * nucleos.length)
        ];

        // Distribución alrededor de cada núcleo.

        const x =
            nucleo.x +
            (aleatorio() + aleatorio() - 1) *
            nucleo.radio * 2;

        const y =
            nucleo.y +
            (aleatorio() + aleatorio() - 1) *
            nucleo.radio * 2;

        // Tres escalas de fragmentación.
        //
        // 55 % pequeños
        // 25 % medianos
        // 20 % grandes
        //
        // Los grandes tienen dimensiones
        // muy superiores a los pequeños.

        const tipo = aleatorio();

        let ancho;
        let alto;

        if (tipo < 0.55) {
            ancho = aleatorioEntreGlitch(
                aleatorio,
                configuracionGlitchTurismo.pequenoMin,
                configuracionGlitchTurismo.pequenoMax
            );

            alto = aleatorioEntreGlitch(
                aleatorio,
                configuracionGlitchTurismo.pequenoMin,
                configuracionGlitchTurismo.pequenoMax
            );
        } else if (tipo < 0.80) {
            ancho = aleatorioEntreGlitch(
                aleatorio,
                configuracionGlitchTurismo.medianoMin,
                configuracionGlitchTurismo.medianoMax
            );

            alto = aleatorioEntreGlitch(
                aleatorio,
                configuracionGlitchTurismo.medianoMin,
                configuracionGlitchTurismo.medianoMax
            );
        } else {
            ancho = aleatorioEntreGlitch(
                aleatorio,
                configuracionGlitchTurismo.grandeMin,
                configuracionGlitchTurismo.grandeMax
            );

            alto = aleatorioEntreGlitch(
                aleatorio,
                configuracionGlitchTurismo.grandeMin * 0.35,
                configuracionGlitchTurismo.grandeMax * 0.7
            );
        }

        // El desplazamiento se codifica en
        // los canales R y G.
        //
        // No son colores visibles: son datos
        // utilizados por feDisplacementMap.

        const desplazamientoX =
            (aleatorio() * 2 - 1) * progreso;

        const desplazamientoY =
            (aleatorio() * 2 - 1) *
            progreso * 0.65;

        const rojo = Math.round(
            limitarGlitchTurismo(
                128 + desplazamientoX * 127,
                0,
                255
            )
        );

        const verde = Math.round(
            limitarGlitchTurismo(
                128 + desplazamientoY * 127,
                0,
                255
            )
        );

        contexto.fillStyle =
            `rgb(${rojo},${verde},128)`;

        // Rectángulos de bordes perfectamente
        // rectos, sin suavizado orgánico.

        contexto.fillRect(
            Math.round(
                (x - ancho / 2 - dimensiones.x) *
                resolucion
            ),

            Math.round(
                (y - alto / 2 - dimensiones.y) *
                resolucion
            ),

            Math.max(1, Math.round(ancho * resolucion)),
            Math.max(1, Math.round(alto * resolucion))
        );
    }

    // Actualizar únicamente el mapa de
    // desplazamiento, sin modificar los
    // elementos SVG originales.

    const imagen = canvas.toDataURL("image/png");

    imagenGlitchTurismo.setAttribute(
        "href",
        imagen
    );

    imagenGlitchTurismo.setAttribute(
        "x",
        dimensiones.x
    );

    imagenGlitchTurismo.setAttribute(
        "y",
        dimensiones.y
    );

    imagenGlitchTurismo.setAttribute(
        "width",
        dimensiones.ancho
    );

    imagenGlitchTurismo.setAttribute(
        "height",
        dimensiones.alto
    );

    filtroGlitchTurismo.setAttribute(
        "x",
        dimensiones.x -
        configuracionGlitchTurismo.desplazamientoMaximo
    );

    filtroGlitchTurismo.setAttribute(
        "y",
        dimensiones.y -
        configuracionGlitchTurismo.desplazamientoMaximo
    );

    filtroGlitchTurismo.setAttribute(
        "width",
        dimensiones.ancho +
        configuracionGlitchTurismo.desplazamientoMaximo * 2
    );

    filtroGlitchTurismo.setAttribute(
        "height",
        dimensiones.alto +
        configuracionGlitchTurismo.desplazamientoMaximo * 2
    );

    svgGlitchTurismo.style.filter =
        `url(#${ID_GLITCH_TURISMO})`;
}


// =========================================
// ACTUALIZAR SLIDER
// =========================================

function actualizarIntensidadTuristica(valor) {
    const numero = Number(valor);

    intensidadTuristica = Number.isFinite(numero)
        ? limitarGlitchTurismo(numero, 0, 100)
        : 50;

    generarMapaRectangularGlitch();
}


// =========================================
// SINCRONIZAR SVG
// =========================================

function sincronizarGlitchTurismo() {
    const contenedor = document.getElementById("lienzo");

    if (!contenedor) return;

    const svg = contenedor.querySelector("svg");

    if (!svg) {
        svgGlitchTurismo = null;
        defsGlitchTurismo = null;
        filtroGlitchTurismo = null;
        imagenGlitchTurismo = null;
        return;
    }

    if (svg === svgGlitchTurismo) {
        return;
    }

    svgGlitchTurismo = svg;

    defsGlitchTurismo = null;
    filtroGlitchTurismo = null;
    imagenGlitchTurismo = null;

    crearFiltroGlitchTurismo(svg);
    generarMapaRectangularGlitch();
}


// =========================================
// OBSERVAR REGENERACIÓN
// =========================================

function observarMapaGlitchTurismo() {
    const contenedor = document.getElementById("lienzo");

    if (!contenedor) return;

    if (observadorGlitchTurismo) {
        observadorGlitchTurismo.disconnect();
    }

    observadorGlitchTurismo = new MutationObserver(
        sincronizarGlitchTurismo
    );

    observadorGlitchTurismo.observe(contenedor, {
        childList: true
    });

    sincronizarGlitchTurismo();
}


// =========================================
// CONECTAR SLIDER
// =========================================

function conectarSliderTurismo() {
    const slider =
        document.getElementById("turismo") ||
        document.getElementById("intensidad") ||
        document.getElementById("tourism");

    if (!slider) return;

    intensidadTuristica = limitarGlitchTurismo(
        Number(slider.value) || 0,
        0,
        100
    );

    slider.addEventListener("input", () => {
        actualizarIntensidadTuristica(
            slider.value
        );
    });
}


// =========================================
// INICIALIZACIÓN
// =========================================

function inicializarGlitchTurismo() {
    conectarSliderTurismo();
    observarMapaGlitchTurismo();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarGlitchTurismo,
        { once: true }
    );
} else {
    inicializarGlitchTurismo();
}
