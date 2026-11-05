
/* =========================================
   KOMOREBI
   SLIDER 02 — NATURAL / URBANO
   Relleno territorial y textura fluida
========================================= */

let naturalUrbano = 50;


// =========================================
// PALETA URBANA
// =========================================

const paletaUrbana = [
    "#F000FF",
    "#001EFF",
    "#4DEEEA",
    "#74EE15",
    "#FFE700"
];

const paletaUrbanaRGB = paletaUrbana.map(hex => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
]);


// =========================================
// CONFIGURACIÓN DE TEXTURA
// =========================================

const texturaTerritorial = {
    escalaGrande: 0.008,
    escalaMedia: 0.025,
    escalaDetalle: 0.09,

    contraste: 3.5,
    opacidadMaxima: 0.92,

    expansion: 100,
    deformacion: 90,
    suavidad: 85,
    margenLienzo: 35
};

const texturaTerritoriosInvestigados = {
    expansion: 450,
    deformacion: 90,
    suavidad: 85,
    margenLienzo: 15
};


// =========================================
// VARIABLES Y CACHÉ
// =========================================

let texturaGenerada = null;
let mascaraGenerada = null;
let modoMascaraGenerada = null;
let semillaTextura = 0;

let cacheColorTerritorial = null;
let anchoCacheColor = 0;
let altoCacheColor = 0;


// =========================================
// ACTUALIZAR SLIDER
// =========================================

function actualizarNaturalUrbano(valor) {
    naturalUrbano = constrain(Number(valor), 0, 100);
    redraw();
}


// =========================================
// REINICIAR CACHÉ
// =========================================

function reiniciarCacheColorTerritorial() {
    cacheColorTerritorial = null;
    anchoCacheColor = 0;
    altoCacheColor = 0;
}

function reiniciarTexturaTerritorial() {
    semillaTextura = Math.random() * 10000;

    if (texturaGenerada) {
        texturaGenerada.remove();
        texturaGenerada = null;
    }

    if (mascaraGenerada) {
        mascaraGenerada.remove();
        mascaraGenerada = null;
    }

    reiniciarCacheColorTerritorial();
}


// =========================================
// SUAVIZAR VALOR
// =========================================

function suavizarValor(valor) {
    valor = Math.max(0, Math.min(1, valor));
    return valor * valor * (3 - 2 * valor);
}


// =========================================
// CREAR TEXTURA FLUIDA
// =========================================

function crearTexturaTerritorial() {
    if (texturaGenerada) {
        texturaGenerada.remove();
        texturaGenerada = null;
    }

    const ancho = Math.max(1, Math.ceil(width));
    const alto = Math.max(1, Math.ceil(height));

    const grafico = createGraphics(ancho, alto);

    grafico.pixelDensity(1);
    grafico.clear();
    grafico.loadPixels();

    noiseSeed(semillaTextura);

    const escalaFluido = 0.009;
    const deformacion = 140;

    const escalaManchas = 0.009;
    const escalaVetas = 0.035;

    const contraste = texturaTerritorial.contraste;
    const opacidadMaxima = texturaTerritorial.opacidadMaxima;

    const pixeles = grafico.pixels;

    for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {

            // Campo de deformación.

            const flujoX = noise(
                x * escalaFluido,
                y * escalaFluido,
                10
            );

            const flujoY = noise(
                x * escalaFluido,
                y * escalaFluido,
                50
            );

            const desplazamientoX =
                (flujoX - 0.5) * deformacion;

            const desplazamientoY =
                (flujoY - 0.5) * deformacion;

            const xFluido = x + desplazamientoX;
            const yFluido = y + desplazamientoY;

            // Manchas principales.

            const manchaGrande = noise(
                xFluido * escalaManchas,
                yFluido * escalaManchas,
                100
            );

            // Vetas y filamentos.

            const veta = noise(
                xFluido * escalaVetas,
                yFluido * escalaVetas,
                200
            );

            const filamentos =
                Math.abs(veta - 0.5) * 2;

            // Acumulación de pigmento.

            const acumulacion = noise(
                xFluido * 0.015,
                yFluido * 0.015,
                300
            );

            let densidad =
                manchaGrande * 0.65 +
                acumulacion * 0.25 +
                filamentos * 0.10;

            densidad = constrain(
                (densidad - 0.5) * contraste + 0.5,
                0,
                1
            );

            densidad = suavizarValor(densidad);

            // Mayor cobertura sin eliminar
            // las variaciones de la textura.

            densidad = 0.18 + densidad * 0.82;

            const opacidad =
                densidad * opacidadMaxima * 255;

            const indice = 4 * (y * ancho + x);

            pixeles[indice] = 12;
            pixeles[indice + 1] = 12;
            pixeles[indice + 2] = 12;
            pixeles[indice + 3] = opacidad;
        }
    }

    grafico.updatePixels();

    texturaGenerada = grafico;
    return texturaGenerada;
}


// =========================================
// CALCULAR DISTANCIAS AL TERRITORIO
// =========================================

function calcularDistanciasTerritorio(ancho, alto) {
    const original = crearMascara(1);
    original.loadPixels();

    const cantidad = ancho * alto;

    const interior = new Uint8Array(cantidad);
    const distanciaInterior = new Float32Array(cantidad);
    const distanciaExterior = new Float32Array(cantidad);
    const resultado = new Float32Array(cantidad);

    const infinito = 100000;

    const extension = original.extension;
    const pixelesOriginales = original.pixels;
    const anchoOriginal = original.width;

    // Identificar interior y exterior.

    for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
            const i = y * ancho + x;

            const xMascara = x + extension;
            const yMascara = y + extension;

            const indiceMascara = 4 * (
                yMascara * anchoOriginal + xMascara
            );

            const esTerritorio =
                pixelesOriginales[indiceMascara] < 128;

            interior[i] = esTerritorio ? 1 : 0;

            distanciaInterior[i] =
                esTerritorio ? infinito : 0;

            distanciaExterior[i] =
                esTerritorio ? 0 : infinito;
        }
    }

    // Transformación de distancias
    // mediante dos pasadas.

    function propagar(datos) {
        const diagonal = Math.SQRT2;

        for (let y = 0; y < alto; y++) {
            for (let x = 0; x < ancho; x++) {
                const i = y * ancho + x;
                let d = datos[i];

                if (x > 0) {
                    d = Math.min(d, datos[i - 1] + 1);
                }

                if (y > 0) {
                    d = Math.min(d, datos[i - ancho] + 1);
                }

                if (x > 0 && y > 0) {
                    d = Math.min(
                        d,
                        datos[i - ancho - 1] + diagonal
                    );
                }

                if (x < ancho - 1 && y > 0) {
                    d = Math.min(
                        d,
                        datos[i - ancho + 1] + diagonal
                    );
                }

                datos[i] = d;
            }
        }

        for (let y = alto - 1; y >= 0; y--) {
            for (let x = ancho - 1; x >= 0; x--) {
                const i = y * ancho + x;
                let d = datos[i];

                if (x < ancho - 1) {
                    d = Math.min(d, datos[i + 1] + 1);
                }

                if (y < alto - 1) {
                    d = Math.min(d, datos[i + ancho] + 1);
                }

                if (x < ancho - 1 && y < alto - 1) {
                    d = Math.min(
                        d,
                        datos[i + ancho + 1] + diagonal
                    );
                }

                if (x > 0 && y < alto - 1) {
                    d = Math.min(
                        d,
                        datos[i + ancho - 1] + diagonal
                    );
                }

                datos[i] = d;
            }
        }
    }

    propagar(distanciaInterior);
    propagar(distanciaExterior);

    for (let i = 0; i < cantidad; i++) {
        resultado[i] = interior[i]
            ? distanciaInterior[i]
            : -distanciaExterior[i];
    }

    original.remove();

    return resultado;
}


// =========================================
// CREAR MÁSCARA FLUIDA
// =========================================

function crearMascaraTextura() {
    const ancho = Math.max(1, Math.ceil(width));
    const alto = Math.max(1, Math.ceil(height));

    const modoActual =
    window.KomorebiTerritorios?.obtenerSeleccion()?.modo || "random";

    if (
    mascaraGenerada &&
    mascaraGenerada.width === ancho &&
    mascaraGenerada.height === alto &&
    modoMascaraGenerada === modoActual
) {
    return mascaraGenerada;
}

    if (mascaraGenerada) {
        mascaraGenerada.remove();
        mascaraGenerada = null;
    }

    const mascara = createGraphics(ancho, alto);

    mascara.pixelDensity(1);
    mascara.clear();
    mascara.loadPixels();

    noiseSeed(semillaTextura);

    const distancias = calcularDistanciasTerritorio(
        ancho,
        alto
    );

    const esTerritorioInvestigado =
    window.KomorebiTerritorios?.obtenerSeleccion()?.modo === "territory";

const configuracion = esTerritorioInvestigado
    ? texturaTerritoriosInvestigados
    : texturaTerritorial;

const expansion = configuracion.expansion;
const deformacion = configuracion.deformacion;
const suavidad = configuracion.suavidad;
const margenLienzo = configuracion.margenLienzo;
    const pixeles = mascara.pixels;

    for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
            const posicion = y * ancho + x;
            const indice = posicion * 4;

            // Irregularidad orgánica del borde.

            const ruidoGrande = noise(
                x * 0.008,
                y * 0.008,
                800
            );

            const ruidoMedio = noise(
                x * 0.022,
                y * 0.022,
                900
            );

            const irregularidad =
                (ruidoGrande - 0.5) * deformacion +
                (ruidoMedio - 0.5) * 30;

            // Distancia al territorio
            // con expansión adicional.

            const distanciaFluida =
                distancias[posicion] +
                expansion +
                irregularidad;

            let opacidad = constrain(
                (distanciaFluida + suavidad) /
                (suavidad * 2),
                0,
                1
            );

            opacidad = suavizarValor(opacidad);

            // Atenuación en los bordes
            // superior e inferior del lienzo.

            const distanciaBorde = Math.min(
                y,
                alto - 1 - y
            );

            let atenuacion = constrain(
                distanciaBorde / margenLienzo,
                0,
                1
            );

            atenuacion = suavizarValor(atenuacion);
            opacidad *= atenuacion;

            pixeles[indice] = 255;
            pixeles[indice + 1] = 255;
            pixeles[indice + 2] = 255;
            pixeles[indice + 3] = opacidad * 255;
        }
    }

    mascara.updatePixels();

    mascaraGenerada = mascara;
modoMascaraGenerada = modoActual;

return mascaraGenerada;
}


// =========================================
// PREPARAR COLORES DEL TERRITORIO
// =========================================

function prepararColoresTerritoriales(grafico) {
    const ancho = grafico.width;
    const alto = grafico.height;

    if (
        cacheColorTerritorial &&
        anchoCacheColor === ancho &&
        altoCacheColor === alto
    ) {
        return cacheColorTerritorial;
    }

    const colores = paletaUrbanaRGB;
    const resultado = new Float64Array(ancho * alto * 3);
    const pixeles = grafico.pixels;

    noiseSeed(semillaTextura);

    for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
            const posicion = y * ancho + x;
            const indice = posicion * 4;

            if (pixeles[indice + 3] === 0) {
                continue;
            }

            // Campo de deformación.

            const flujoX = noise(
                x * 0.009,
                y * 0.009,
                10
            );

            const flujoY = noise(
                x * 0.009,
                y * 0.009,
                50
            );

            const xFluido =
                x + (flujoX - 0.5) * 140;

            const yFluido =
                y + (flujoY - 0.5) * 140;

            // Distribución cromática.

            const distribucion = noise(
                xFluido * 0.005,
                yFluido * 0.005,
                950
            );

            const detalle = noise(
                xFluido * 0.014,
                yFluido * 0.014,
                1050
            );

            let mezcla =
                distribucion * 0.85 +
                detalle * 0.15;

            mezcla = constrain(
                (mezcla - 0.5) * 3.2 + 0.5,
                0,
                1
            );

            mezcla = suavizarValor(mezcla);

            // Interpolación entre colores.

            const posicionColor =
                mezcla * (colores.length - 1);

            const primero = Math.min(
                Math.floor(posicionColor),
                colores.length - 2
            );

            const segundo = primero + 1;

            const proporcion = suavizarValor(
                posicionColor - primero
            );

            const colorR =
                colores[primero][0] +
                (colores[segundo][0] -
                colores[primero][0]) * proporcion;

            const colorG =
                colores[primero][1] +
                (colores[segundo][1] -
                colores[primero][1]) * proporcion;

            const colorB =
                colores[primero][2] +
                (colores[segundo][2] -
                colores[primero][2]) * proporcion;

            const indiceColor = posicion * 3;

            resultado[indiceColor] = colorR;
            resultado[indiceColor + 1] = colorG;
            resultado[indiceColor + 2] = colorB;
        }
    }

    cacheColorTerritorial = resultado;
    anchoCacheColor = ancho;
    altoCacheColor = alto;

    return cacheColorTerritorial;
}


// =========================================
// APLICAR COLOR NATURAL / URBANO
// =========================================

function aplicarColorNaturalUrbano(grafico) {
    const intensidad = constrain(
        naturalUrbano / 100,
        0,
        1
    );

    if (intensidad === 0) {
        return;
    }

    grafico.loadPixels();

    const pixeles = grafico.pixels;
    const colores = prepararColoresTerritoriales(grafico);
    const gris = 12;

    for (let i = 0; i < pixeles.length; i += 4) {
        if (pixeles[i + 3] === 0) {
            continue;
        }

        const indiceColor = (i / 4) * 3;

        const colorR = colores[indiceColor];
        const colorG = colores[indiceColor + 1];
        const colorB = colores[indiceColor + 2];

        pixeles[i] =
            gris + (colorR - gris) * intensidad;

        pixeles[i + 1] =
            gris + (colorG - gris) * intensidad;

        pixeles[i + 2] =
            gris + (colorB - gris) * intensidad;
    }

    grafico.updatePixels();
}


// =========================================
// DIBUJAR RELLENO TERRITORIAL
// =========================================

function dibujarRellenoTerritorial(svg, namespace) {
    const ancho = Math.max(1, Math.ceil(width));
    const alto = Math.max(1, Math.ceil(height));

    if (
        !texturaGenerada ||
        texturaGenerada.width !== ancho ||
        texturaGenerada.height !== alto
    ) {
        crearTexturaTerritorial();
    }

    const mascara = crearMascaraTextura();
    const grafico = texturaGenerada.get();

    grafico.loadPixels();
    mascara.loadPixels();

    const pixeles = grafico.pixels;
    const pixelesMascara = mascara.pixels;

    // Aplicar la máscara territorial.

    for (let i = 0; i < pixeles.length; i += 4) {
        pixeles[i + 3] =
            pixeles[i + 3] *
            pixelesMascara[i + 3] / 255;
    }

    grafico.updatePixels();

    // Aplicar el color según el slider.

    aplicarColorNaturalUrbano(grafico);

    // Integrar la textura detrás
    // de los contornos del mapa.

    const imagen = document.createElementNS(
        namespace,
        "image"
    );

    imagen.setAttribute("x", 0);
    imagen.setAttribute("y", 0);
    imagen.setAttribute("width", width);
    imagen.setAttribute("height", height);

    imagen.setAttribute(
        "href",
        grafico.canvas.toDataURL("image/png")
    );

    svg.insertBefore(imagen, svg.firstChild);
}
