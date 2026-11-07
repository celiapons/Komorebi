
/* =========================================
   KOMOREBI — GENERADOR DE MAPAS
   Versión optimizada
========================================= */

// =========================================
// VARIABLES Y CONFIGURACIÓN
// =========================================

let puntos = [];
let islas = [];

let formasTerritorioActual = null;
let nombreTerritorioActual = null;
let territorioVectorial = null;
let territorioSVGTransformacion = null;

let calidadMapa = "high";
let resolucionMapa = 1;

const ISLA_MINIMO_PX = 20;
const ISLA_MARGEN_PX = 12;

const GRUPOS_COSTEROS_MIN = 3;
const GRUPOS_COSTEROS_MAX = 6;

const ISLAS_BORDE_MIN = 5;
const ISLAS_BORDE_MAX = 10;

const ESCALA_TERRITORIO = 0.76;
const EXTENSION_MASCARA = 180;

// =========================================
// CACHÉ DE GEOMETRÍA
// =========================================

const cacheGeometriaMapa = new Map();

function reiniciarCacheGeometriaMapa() {
    cacheGeometriaMapa.clear();

    if (typeof reiniciarCacheTradicionModernidad === "function") {
        reiniciarCacheTradicionModernidad();
    }
}

function obtenerGeometriaMapa(factor) {
    if (cacheGeometriaMapa.has(factor)) {
        return cacheGeometriaMapa.get(factor);
    }

    const mascara = crearMascara(factor);
    const segmentos = obtenerSegmentos(mascara);

    const geometria = {
        segmentos,
        contornos: factor === 2
            ? unirSegmentos(segmentos).map(contorno =>
                simplificarContorno(contorno, 2)
            )
            : null
    };

    mascara.remove();
    cacheGeometriaMapa.set(factor, geometria);

    return geometria;
}

// =========================================
// CONFIGURACIÓN INICIAL
// =========================================

function setup() {
    const contenedor = document.getElementById("lienzo");

    const ancho = Math.max(1, contenedor.clientWidth);
    const alto = Math.max(1, contenedor.clientHeight);

    const lienzo = createCanvas(ancho, alto);
    lienzo.parent("lienzo");

    pixelDensity(1);
    noLoop();

    generarMapa();
}

// =========================================
// REDIMENSIONAR VENTANA
// =========================================

function windowResized() {
    const contenedor = document.getElementById("lienzo");

    const ancho = Math.max(1, contenedor.clientWidth);
    const alto = Math.max(1, contenedor.clientHeight);

    if (ancho === width && alto === height) {
        return;
    }

    const anchoAnterior = width;
    const altoAnterior = height;

    resizeCanvas(ancho, alto);

    const escala = Math.min(
        ancho / anchoAnterior,
        alto / altoAnterior
    );

    // Mantener la composición y las islas a sangre.

    for (const forma of [puntos, ...islas]) {
        for (const punto of forma) {
            punto.x =
                ancho / 2 +
                (punto.x - anchoAnterior / 2) * escala;

            punto.y =
                alto / 2 +
                (punto.y - altoAnterior / 2) * escala;
        }
    }

    reiniciarCacheGeometriaMapa();

    if (typeof reiniciarTexturaTerritorial === "function") {
        reiniciarTexturaTerritorial();
    }

    redraw();
}

// =========================================
// SINCRONIZAR EL LIENZO CON SU CONTENEDOR
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("lienzo");

    if (!contenedor) return;

    const observadorLienzo = new ResizeObserver(() => {
        const seleccion =
            window.KomorebiTerritorios?.obtenerSeleccion();

        if (seleccion?.modo !== "territory") return;

        if (
            typeof width === "undefined" ||
            typeof height === "undefined" ||
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        const ancho = Math.max(1, contenedor.clientWidth);
        const alto = Math.max(1, contenedor.clientHeight);

        if (ancho === width && alto === height) return;

        resizeCanvas(ancho, alto);

        if (territorioVectorial) {
            aplicarGeometriaTerritorio();
        }

        reiniciarCacheGeometriaMapa();

        if (typeof reiniciarTexturaTerritorial === "function") {
            reiniciarTexturaTerritorial();
        }

        redraw();
    });

    observadorLienzo.observe(contenedor);
});

// =========================================
// DIBUJAR MAPA
// =========================================

function draw() {
    background(255);

    const contenedor = document.getElementById("lienzo");
    const canvas = contenedor.querySelector("canvas");

    if (calidadMapa === "high") {
        if (canvas) {
            canvas.style.visibility = "hidden";
        }

        dibujarMapaSVG();
    } else {
        const svgAnterior = contenedor.querySelector("svg");

        if (svgAnterior) {
            svgAnterior.remove();
        }

        if (canvas) {
            canvas.style.visibility = "visible";
        }

        dibujarMapaRasterizado();
    }
}

// =========================================
// CREAR MÁSCARA
// =========================================

function dibujarEnMascara(mascara, forma) {
    if (!forma || forma.length < 3) {
        return;
    }

    mascara.beginShape();

    for (const punto of forma) {
        mascara.vertex(punto.x, punto.y);
    }

    mascara.endShape(CLOSE);
}

function crearMascara(factor) {
    const extension = EXTENSION_MASCARA;

    const ancho = Math.max(
        1,
        Math.ceil((width + extension * 2) * factor)
    );

    const alto = Math.max(
        1,
        Math.ceil((height + extension * 2) * factor)
    );

    const mascara = createGraphics(ancho, alto);

    mascara.pixelDensity(1);
    mascara.background(255);
    mascara.fill(0);
    mascara.noStroke();

    mascara.push();
    mascara.scale(factor);
    mascara.translate(extension, extension);

    dibujarEnMascara(mascara, puntos);

    for (const isla of islas) {
        dibujarEnMascara(mascara, isla);
    }

    mascara.pop();
    mascara.loadPixels();

    mascara.extension = extension;
    mascara.factorMapa = factor;

    return mascara;
}

// =========================================
// DETECTAR SEGMENTOS
// =========================================

function obtenerSegmentos(mascara) {
    const ancho = mascara.width;
    const alto = mascara.height;

    const pixeles = mascara.pixels;
    const segmentos = [];

    function ocupado(x, y) {
        if (
            x < 0 ||
            x >= ancho ||
            y < 0 ||
            y >= alto
        ) {
            return false;
        }

        const indice = 4 * (y * ancho + x);
        return pixeles[indice] < 128;
    }

    function agregar(p1, p2) {
        segmentos.push([p1, p2]);
    }

    for (let y = 0; y < alto - 1; y++) {
        for (let x = 0; x < ancho - 1; x++) {
            const a = ocupado(x, y);
            const b = ocupado(x + 1, y);
            const c = ocupado(x + 1, y + 1);
            const d = ocupado(x, y + 1);

            const codigo =
                (a ? 8 : 0) +
                (b ? 4 : 0) +
                (c ? 2 : 0) +
                (d ? 1 : 0);

            if (codigo === 0 || codigo === 15) {
                continue;
            }

            const arriba = {
                x: x + 0.5,
                y: y
            };

            const derecha = {
                x: x + 1,
                y: y + 0.5
            };

            const abajo = {
                x: x + 0.5,
                y: y + 1
            };

            const izquierda = {
                x: x,
                y: y + 0.5
            };

            switch (codigo) {
                case 1:
                case 14:
                    agregar(izquierda, abajo);
                    break;

                case 2:
                case 13:
                    agregar(abajo, derecha);
                    break;

                case 3:
                case 12:
                    agregar(izquierda, derecha);
                    break;

                case 4:
                case 11:
                    agregar(arriba, derecha);
                    break;

                case 5:
                    agregar(arriba, izquierda);
                    agregar(abajo, derecha);
                    break;

                case 6:
                case 9:
                    agregar(arriba, abajo);
                    break;

                case 7:
                case 8:
                    agregar(arriba, izquierda);
                    break;

                case 10:
                    agregar(arriba, derecha);
                    agregar(izquierda, abajo);
                    break;
            }
        }
    }

    return segmentos;
}

// =========================================
// UNIR SEGMENTOS EN CONTORNOS
// =========================================

function unirSegmentos(segmentos) {
    const conexiones = new Map();
    const aristas = new Set();

    function clave(punto) {
        return (
            `${Math.round(punto.x * 2)},` +
            `${Math.round(punto.y * 2)}`
        );
    }

    function agregarConexion(origen, destino) {
        if (!conexiones.has(origen)) {
            conexiones.set(origen, []);
        }

        conexiones.get(origen).push(destino);
    }

    for (const [a, b] of segmentos) {
        const ka = clave(a);
        const kb = clave(b);

        agregarConexion(ka, kb);
        agregarConexion(kb, ka);
    }

    function claveArista(a, b) {
        return a < b
            ? `${a}|${b}`
            : `${b}|${a}`;
    }

    const contornos = [];

    for (const [inicio, vecinos] of conexiones) {
        for (const primerVecino of vecinos) {
            const aristaInicial = claveArista(
                inicio,
                primerVecino
            );

            if (aristas.has(aristaInicial)) {
                continue;
            }

            const recorrido = [inicio];

            let anterior = inicio;
            let actual = primerVecino;

            aristas.add(aristaInicial);

            let cerrado = false;
            const limite = segmentos.length + 1;

            for (let i = 0; i < limite; i++) {
                if (actual === inicio) {
                    cerrado = true;
                    break;
                }

                recorrido.push(actual);

                const opciones = conexiones.get(actual) || [];

                const siguiente = opciones.find(destino => {
                    if (destino === anterior) {
                        return false;
                    }

                    return !aristas.has(
                        claveArista(actual, destino)
                    );
                });

                if (!siguiente) {
                    break;
                }

                aristas.add(
                    claveArista(actual, siguiente)
                );

                anterior = actual;
                actual = siguiente;
            }

            if (!cerrado || recorrido.length < 3) {
                continue;
            }

            const contorno = recorrido.map(valor => {
                const [x, y] = valor
                    .split(",")
                    .map(Number);

                return {
                    x: x / 2,
                    y: y / 2
                };
            });

            contornos.push(contorno);
        }
    }

    return contornos;
}

// =========================================
// SIMPLIFICAR CONTORNOS
// =========================================

function simplificarContorno(contorno, distanciaMinima) {
    if (contorno.length < 4) {
        return contorno;
    }

    const resultado = [contorno[0]];
    let ultimo = contorno[0];

    for (let i = 1; i < contorno.length; i++) {
        const punto = contorno[i];

        const distancia = Math.hypot(
            punto.x - ultimo.x,
            punto.y - ultimo.y
        );

        if (distancia >= distanciaMinima) {
            resultado.push(punto);
            ultimo = punto;
        }
    }

    return resultado.length >= 3
        ? resultado
        : contorno;
}

// =========================================
// CREAR RUTA SUAVE ORIGINAL
// =========================================

function crearRutaSuave(contorno, factor) {
    const cantidad = contorno.length;

    if (cantidad < 3) {
        return "";
    }

    const ultimo = contorno[cantidad - 1];
    const primero = contorno[0];

    const inicioX =
        (ultimo.x + primero.x) / (2 * factor);

    const inicioY =
        (ultimo.y + primero.y) / (2 * factor);

    let d = `M ${inicioX} ${inicioY}`;

    for (let i = 0; i < cantidad; i++) {
        const actual = contorno[i];
        const siguiente = contorno[(i + 1) % cantidad];

        const x = actual.x / factor;
        const y = actual.y / factor;

        const medioX =
            (actual.x + siguiente.x) / (2 * factor);

        const medioY =
            (actual.y + siguiente.y) / (2 * factor);

        d += ` Q ${x} ${y} ${medioX} ${medioY}`;
    }

    return d + " Z";
}

// =========================================
// HIGH — SVG VECTORIAL
// =========================================

 
function dibujarMapaSVG() {
    const contenedor = document.getElementById("lienzo");
    const svgAnterior = contenedor.querySelector("svg");

    if (svgAnterior) {
        svgAnterior.remove();
    }

    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-label", "Komorebi vector map");

    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "hidden";

    const factor = 2;

    const contornos = territorioVectorial
        ? []
        : obtenerGeometriaMapa(factor).contornos;

    if (typeof dibujarRellenoTerritorial === "function") {
        dibujarRellenoTerritorial(svg, namespace);
    }

    const grupoContornos = document.createElementNS(
        namespace,
        "g"
    );

    grupoContornos.setAttribute(
        "transform",
        `translate(${-EXTENSION_MASCARA} ${-EXTENSION_MASCARA})`
    );

    for (const contorno of contornos) {
        const ruta = crearRutaTradicionModernidad(
            contorno,
            factor
        );

        if (!ruta) continue;

        const path = document.createElementNS(
            namespace,
            "path"
        );

        path.setAttribute("d", ruta);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#000000");
        path.setAttribute("stroke-width", "1.2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "miter");

        grupoContornos.appendChild(path);
    }

    svg.appendChild(grupoContornos);

    if (territorioVectorial) {
        dibujarContornosTerritorioSVG(svg, namespace);
    }

    if (typeof dibujarParticulasPoblacion === "function") {
        dibujarParticulasPoblacion(svg, namespace);
    }

    contenedor.appendChild(svg);
}


// =========================================
// MEDIUM Y LOW — CANVAS
// =========================================

function dibujarMapaRasterizado() {
    const factor = 1 / resolucionMapa;

    const segmentos = obtenerGeometriaMapa(factor).segmentos;
    const extension = EXTENSION_MASCARA;

    noFill();
    stroke(0);
    strokeWeight(1.0);
    strokeCap(ROUND);
    strokeJoin(ROUND);

    for (const [a, b] of segmentos) {
        line(
            a.x / factor - extension,
            a.y / factor - extension,
            b.x / factor - extension,
            b.y / factor - extension
        );
    }
}

// =========================================
// GENERAR MAPA COMPLETO
// =========================================



/* =========================================
   GENERAR MAPA COMPLETO
========================================= */


function generarMapa() {
    const seleccion =
        window.KomorebiTerritorios?.obtenerSeleccion();

    if (seleccion?.modo === "territory") {
        if (
            !territorioVectorial ||
            territorioVectorial.nombre !== seleccion.territorio
        ) {
            return;
        }

        aplicarGeometriaTerritorio();

    } else {
        territorioVectorial = null;
        territorioSVGTransformacion = null;

        generarTerritorio();
        generarIslas();
        corregirIslasFinales();
    }

    reiniciarCacheGeometriaMapa();

    if (typeof reiniciarTexturaTerritorial === "function") {
        reiniciarTexturaTerritorial();
    }

    redraw();
}




function reiniciarMapa() {
    generarMapa();
}

// =========================================
// GENERAR TERRITORIO PRINCIPAL
// =========================================

function generarTerritorio() {
    puntos = [];

    const cantidad = 720;

    const centroX = width / 2;
    const centroY = height / 2;

    const ancho = random(95, 160);
    const alto = random(85, 150);

    const estiramientoX = random(0.65, 1.4);
    const estiramientoY = random(0.65, 1.4);

    const rotacion = random(TWO_PI);
    const semilla = random(10000);

    const accidentes = [];

    const cantidadAccidentes = floor(
        random(4, 9)
    );

    for (let i = 0; i < cantidadAccidentes; i++) {
        accidentes.push({
            angulo: random(TWO_PI),
            amplitud: random(-0.4, 0.55),
            extension: random(0.12, 0.4)
        });
    }

    for (let i = 0; i < cantidad; i++) {
        const angulo = TWO_PI * i / cantidad;

        const ruidoGrande = noise(
            cos(angulo) * 1.1 + semilla,
            sin(angulo) * 1.1 + semilla
        );

        const ruidoMedio = noise(
            cos(angulo) * 4 + semilla + 100,
            sin(angulo) * 4 + semilla + 100
        );

        const ruidoPequeno = noise(
            cos(angulo) * 15 + semilla + 200,
            sin(angulo) * 15 + semilla + 200
        );

        let deformacion =
            map(ruidoGrande, 0, 1, 0.45, 1.55) +
            map(ruidoMedio, 0, 1, -0.25, 0.25) +
            map(ruidoPequeno, 0, 1, -0.07, 0.07);

        for (const accidente of accidentes) {
            const diferencia = atan2(
                sin(angulo - accidente.angulo),
                cos(angulo - accidente.angulo)
            );

            const influencia = exp(
                -pow(
                    diferencia / accidente.extension,
                    2
                )
            );

            deformacion +=
                accidente.amplitud * influencia;
        }

        deformacion = max(0.18, deformacion);

        const xLocal =
            cos(angulo) *
            ancho *
            estiramientoX *
            deformacion;

        const yLocal =
            sin(angulo) *
            alto *
            estiramientoY *
            deformacion;

        const xRotado =
            xLocal * cos(rotacion) -
            yLocal * sin(rotacion);

        const yRotado =
            xLocal * sin(rotacion) +
            yLocal * cos(rotacion);

        puntos.push({
            x: centroX + xRotado,
            y: centroY + yRotado
        });
    }

    ajustarTerritorio();
}

// =========================================
// AJUSTAR TERRITORIO PRINCIPAL
// =========================================

function ajustarTerritorio() {
    const limites = limitesDeForma(puntos);

    const escala = Math.min(
        (width * ESCALA_TERRITORIO) /
            Math.max(1, limites.ancho),

        (height * ESCALA_TERRITORIO) /
            Math.max(1, limites.alto)
    );

    for (const punto of puntos) {
        punto.x =
            width / 2 +
            (punto.x - limites.centroX) * escala;

        punto.y =
            height / 2 +
            (punto.y - limites.centroY) * escala;
    }
}


/* =========================================
   AJUSTAR GEOMETRÍAS SVG
========================================= */

function ajustarTerritorioSVG() {
    const formas = [puntos, ...islas];

    const limites = limitesDeForma(
        formas.flat()
    );

    const escala = Math.min(
        (width * ESCALA_TERRITORIO) /
            Math.max(1, limites.ancho),

        (height * ESCALA_TERRITORIO) /
            Math.max(1, limites.alto)
    );

    for (const forma of formas) {
        for (const punto of forma) {
            punto.x =
                width / 2 +
                (punto.x - limites.centroX) * escala;

            punto.y =
                height / 2 +
                (punto.y - limites.centroY) * escala;
        }
    }
}


// =========================================
// GENERAR ISLAS Y ARCHIPIÉLAGOS
// =========================================

function generarIslas() {
    islas = [];

    // 1. Archipiélagos costeros.

    const cantidadGrupos = floor(
        random(
            GRUPOS_COSTEROS_MIN,
            GRUPOS_COSTEROS_MAX + 1
        )
    );

    for (let g = 0; g < cantidadGrupos; g++) {
        const indice = floor(random(puntos.length));
        const costa = puntos[indice];

        const angulo = atan2(
            costa.y - height / 2,
            costa.x - width / 2
        );

        const distancia = random(35, 105);

        const grupoX =
            costa.x + cos(angulo) * distancia;

        const grupoY =
            costa.y + sin(angulo) * distancia;

        const cantidadIslas = floor(random(4, 10));

        for (let i = 0; i < cantidadIslas; i++) {
            const centroX =
                grupoX + random(-55, 55);

            const centroY =
                grupoY + random(-55, 55);

            const probabilidad = random();

            let tamano;

            if (probabilidad < 0.16) {
                tamano = random(18, 36);
            } else if (probabilidad < 0.50) {
                tamano = random(9, 19);
            } else {
                tamano = random(4, 10);
            }

            islas.push(
                crearIsla(centroX, centroY, tamano)
            );
        }
    }

    // 2. Islas a sangre.

    const cantidadBordes = floor(
        random(
            ISLAS_BORDE_MIN,
            ISLAS_BORDE_MAX + 1
        )
    );

    const bordesObligatorios = [0, 1];

    for (let i = 0; i < cantidadBordes; i++) {
        const borde = i < bordesObligatorios.length
            ? bordesObligatorios[i]
            : floor(random(4));

        let centroX;
        let centroY;

        if (borde === 0) {
            centroX = random(-12, 8);
            centroY = random(40, height - 40);
        } else if (borde === 1) {
            centroX = random(width - 8, width + 12);
            centroY = random(40, height - 40);
        } else if (borde === 2) {
            centroX = random(-40, width + 40);
            centroY = random(-35, 45);
        } else {
            centroX = random(-40, width + 40);
            centroY = random(height - 45, height + 35);
        }

        const tamano = random(20, 58);

        islas.push(
            crearIsla(centroX, centroY, tamano)
        );
    }

    // 3. Islas intermedias.

    const cantidadIntermedias = floor(random(5, 11));

    for (let i = 0; i < cantidadIntermedias; i++) {
        const angulo = random(TWO_PI);

        const radioX = random(
            width * 0.25,
            width * 0.54
        );

        const radioY = random(
            height * 0.25,
            height * 0.58
        );

        const centroX =
            width / 2 + cos(angulo) * radioX;

        const centroY =
            height / 2 + sin(angulo) * radioY;

        const tamano = random(8, 29);

        islas.push(
            crearIsla(centroX, centroY, tamano)
        );
    }
}

// =========================================
// CREAR ISLA IRREGULAR
// =========================================

function crearIsla(centroX, centroY, tamano) {
    const forma = [];

    const cantidad = 90;
    const semilla = random(10000);

    const proporcionX = random(0.6, 1.5);
    const proporcionY = random(0.6, 1.5);

    for (let i = 0; i < cantidad; i++) {
        const angulo = TWO_PI * i / cantidad;

        const ruido = noise(
            cos(angulo) * 2.5 + semilla,
            sin(angulo) * 2.5 + semilla
        );

        const detalle = noise(
            cos(angulo) * 8 + semilla + 100,
            sin(angulo) * 8 + semilla + 100
        );

        const deformacion =
            map(ruido, 0, 1, 0.5, 1.5) +
            map(detalle, 0, 1, -0.15, 0.15);

        const x =
            centroX +
            cos(angulo) *
            tamano *
            proporcionX *
            deformacion;

        const y =
            centroY +
            sin(angulo) *
            tamano *
            proporcionY *
            deformacion;

        forma.push({ x, y });
    }

    return forma;
}

// =========================================
// AJUSTE GLOBAL
// =========================================

// Se conserva por compatibilidad.
// No debe encajar las islas dentro del lienzo.

function ajustarMapaCompleto() {
}

// =========================================
// OBTENER LÍMITES DE UNA FORMA
// =========================================

function limitesDeForma(forma) {
    let minX = Infinity;
    let minY = Infinity;

    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of forma) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);

        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    return {
        minX,
        minY,
        maxX,
        maxY,

        ancho: maxX - minX,
        alto: maxY - minY,

        centroX: (minX + maxX) / 2,
        centroY: (minY + maxY) / 2
    };
}

// =========================================
// AJUSTAR TAMAÑO MÍNIMO DE ISLA
// =========================================

function ajustarTamanoIsla(forma) {
    const limites = limitesDeForma(forma);

    const escala = Math.max(
        1,
        ISLA_MINIMO_PX / Math.max(0.001, limites.ancho),
        ISLA_MINIMO_PX / Math.max(0.001, limites.alto)
    );

    return forma.map(p => ({
        x:
            limites.centroX +
            (p.x - limites.centroX) * escala,

        y:
            limites.centroY +
            (p.y - limites.centroY) * escala
    }));
}

// =========================================
// DISTANCIA ENTRE PUNTO Y SEGMENTO
// =========================================

function distanciaPuntoSegmento(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const longitud2 = dx * dx + dy * dy;

    if (longitud2 === 0) {
        return Math.hypot(p.x - a.x, p.y - a.y);
    }

    const t = Math.max(
        0,
        Math.min(
            1,
            ((p.x - a.x) * dx + (p.y - a.y) * dy) /
                longitud2
        )
    );

    const x = a.x + t * dx;
    const y = a.y + t * dy;

    return Math.hypot(p.x - x, p.y - y);
}

// =========================================
// PUNTO DENTRO DE POLÍGONO
// =========================================

function puntoDentroPoligono(p, forma) {
    let dentro = false;

    for (
        let i = 0, j = forma.length - 1;
        i < forma.length;
        j = i++
    ) {
        const a = forma[i];
        const b = forma[j];

        const cruza =
            (a.y > p.y) !== (b.y > p.y) &&
            p.x <
                (b.x - a.x) *
                (p.y - a.y) /
                (b.y - a.y) +
                a.x;

        if (cruza) {
            dentro = !dentro;
        }
    }

    return dentro;
}

// =========================================
// CRUCE ENTRE SEGMENTOS
// =========================================

function segmentosSeCruzan(a, b, c, d) {
    function orientacion(p, q, r) {
        return (
            (q.x - p.x) * (r.y - p.y) -
            (q.y - p.y) * (r.x - p.x)
        );
    }

    const o1 = orientacion(a, b, c);
    const o2 = orientacion(a, b, d);
    const o3 = orientacion(c, d, a);
    const o4 = orientacion(c, d, b);

    return (
        ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
        ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
    );
}

// =========================================
// DISTANCIA ENTRE SEGMENTOS
// =========================================

function distanciaSegmentos(a, b, c, d) {
    if (segmentosSeCruzan(a, b, c, d)) {
        return 0;
    }

    return Math.min(
        distanciaPuntoSegmento(a, c, d),
        distanciaPuntoSegmento(b, c, d),
        distanciaPuntoSegmento(c, a, b),
        distanciaPuntoSegmento(d, a, b)
    );
}

// =========================================
// COMPROBAR SEPARACIÓN ENTRE FORMAS
// =========================================

function cajasSeparadas(formaA, formaB, margen) {
    const a = limitesDeForma(formaA);
    const b = limitesDeForma(formaB);

    const dx = Math.max(
        0,
        a.minX - b.maxX,
        b.minX - a.maxX
    );

    const dy = Math.max(
        0,
        a.minY - b.maxY,
        b.minY - a.maxY
    );

    if (Math.hypot(dx, dy) >= margen) {
        return true;
    }

    if (
        puntoDentroPoligono(formaA[0], formaB) ||
        puntoDentroPoligono(formaB[0], formaA)
    ) {
        return false;
    }

    const pasoA = Math.max(
        1,
        Math.floor(formaA.length / 90)
    );

    const pasoB = Math.max(
        1,
        Math.floor(formaB.length / 90)
    );

    for (let i = 0; i < formaA.length; i += pasoA) {
        const siguienteA =
            (i + pasoA) % formaA.length;

        const a1 = formaA[i];
        const a2 = formaA[siguienteA];

        for (let j = 0; j < formaB.length; j += pasoB) {
            const siguienteB =
                (j + pasoB) % formaB.length;

            const b1 = formaB[j];
            const b2 = formaB[siguienteB];

            if (
                distanciaSegmentos(
                    a1, a2, b1, b2
                ) < margen
            ) {
                return false;
            }
        }
    }

    return true;
}

// =========================================
// VALIDAR POSICIÓN DE ISLA
// =========================================

function posicionIslaValida(forma, aceptadas) {
    const limites = limitesDeForma(forma);

    if (forma.bordeObligatorio === "izquierda") {
        if (limites.minX >= 0 || limites.maxX <= 0) {
            return false;
        }
    }

    if (forma.bordeObligatorio === "derecha") {
        if (limites.minX >= width || limites.maxX <= width) {
            return false;
        }
    }

    // Se permiten islas parcialmente fuera del lienzo.

    if (
        limites.maxX < 0 ||
        limites.minX > width ||
        limites.maxY < 0 ||
        limites.minY > height
    ) {
        return false;
    }

    if (!cajasSeparadas(
        forma,
        puntos,
        ISLA_MARGEN_PX
    )) {
        return false;
    }

    for (const isla of aceptadas) {
        if (!cajasSeparadas(
            forma,
            isla,
            ISLA_MARGEN_PX
        )) {
            return false;
        }
    }

    return true;
}

// =========================================
// DESPLAZAR ISLA
// =========================================

function desplazarIsla(forma, dx, dy) {
    return forma.map(p => ({
        x: p.x + dx,
        y: p.y + dy
    }));
}

// =========================================
// CORREGIR ISLAS FINALES
// =========================================

function corregirIslasFinales() {
    const aceptadas = [];

    const ordenadas = [...islas].sort((a, b) => {
        const la = limitesDeForma(a);
        const lb = limitesDeForma(b);

        return (
            lb.ancho * lb.alto -
            la.ancho * la.alto
        );
    });

    for (const original of ordenadas) {
        const isla = ajustarTamanoIsla(original);

        if (posicionIslaValida(isla, aceptadas)) {
            aceptadas.push(isla);
            continue;
        }

        // Buscar posiciones alternativas cercanas.

        for (let intento = 1; intento <= 140; intento++) {
            const angulo = intento * 2.399963;
            const distancia = 6 * Math.sqrt(intento);

            const dx =
                Math.cos(angulo) * distancia;

            const dy =
                Math.sin(angulo) * distancia;

            const candidata = desplazarIsla(
                isla,
                dx,
                dy
            );

            if (posicionIslaValida(candidata, aceptadas)) {
                aceptadas.push(candidata);
                break;
            }
        }
    }

    islas = aceptadas;
}

// =========================================
// CAMBIAR CALIDAD
// =========================================

function cambiarCalidad(calidad) {
    if (
        calidad !== "high" &&
        calidad !== "medium" &&
        calidad !== "low"
    ) {
        return;
    }

    calidadMapa = calidad;

    if (calidad === "high") {
        resolucionMapa = 1;
    } else if (calidad === "medium") {
        resolucionMapa = 2;
    } else if (calidad === "low") {
        resolucionMapa = 4;
    }

    redraw();
}


function aplicarGeometriaTerritorio() {
    const geometria = territorioVectorial.geometria;
    const formas = geometria.formas;

    if (!formas.length) return;

    const escala = Math.min(
        width * ESCALA_TERRITORIO / geometria.ancho,
        height * ESCALA_TERRITORIO / geometria.alto
    );

    const desplazamientoX =
        (width - geometria.ancho * escala) / 2;

    const desplazamientoY =
        (height - geometria.alto * escala) / 2;

    territorioSVGTransformacion = {
        escala,
        desplazamientoX,
        desplazamientoY
    };

    const convertir = forma => forma.puntos.map(p => ({
        x: p.x * escala + desplazamientoX,
        y: p.y * escala + desplazamientoY
    }));

    puntos = convertir(formas[0]);
    islas = formas.slice(1).map(convertir);
}

function dibujarContornosTerritorioSVG(svg, namespace) {
    if (
        !territorioVectorial ||
        !territorioSVGTransformacion
    ) {
        return;
    }

    const {
        escala,
        desplazamientoX,
        desplazamientoY
    } = territorioSVGTransformacion;

    const grupo = document.createElementNS(
        namespace,
        "g"
    );

    grupo.setAttribute(
        "transform",
        `translate(${desplazamientoX} ${desplazamientoY}) scale(${escala})`
    );

    for (const forma of territorioVectorial.geometria.formas) {
        const path = document.createElementNS(
            namespace,
            "path"
        );

        const ruta =
            typeof crearRutaTerritorioTradicionModernidad === "function"
                ? crearRutaTerritorioTradicionModernidad(
                    forma.puntos,
                    forma.d
                )
                : forma.d;

        path.setAttribute("d", ruta);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#000000");
      path.setAttribute(
    "stroke-width",
    ["hokkaido", "okinawa"].includes(territorioVectorial.nombre) ? "1.3" : "2"
);
        path.setAttribute("stroke-linecap", "butt");
        path.setAttribute("stroke-linejoin", "miter");

        grupo.appendChild(path);
    }

    svg.appendChild(grupo);
}


/* =========================================
   CAMBIO ENTRE RANDOM Y TERRITORY
========================================= */


document.addEventListener(
    "komorebi:cambio-territorio",
    evento => {
        const { modo, territorio, geometria } =
            evento.detail || {};

        if (modo === "territory") {
            if (!geometria?.formas?.length) return;

            territorioVectorial = {
                nombre: territorio,
                geometria
            };
        }

        if (
            typeof width !== "undefined" &&
            width > 0
        ) {
            generarMapa();
        }
    }
);


