
/* =========================================
   KOMOREBI
   SLIDER 01 — TRADITIONAL OR MODERN
========================================= */

let tradicionModernidad = 50;

const configuracionContornos = {
    separacionOrtogonal: 25,
    simplificacionOrganica: 12,
    tensionCurvas: 0.72,
    limiteCurvatura: 0.28,
    distanciaMinima: 0.001
};


// =========================================
// CACHÉ DE GEOMETRÍA
// =========================================

let cacheContornosOrtogonales = new WeakMap();

function reiniciarCacheTradicionModernidad() {
    cacheContornosOrtogonales = new WeakMap();
}


// =========================================
// UTILIDADES
// =========================================

function distanciaEntrePuntos(a, b) {
    return Math.hypot(
        b.x - a.x,
        b.y - a.y
    );
}

function interpolarPuntos(a, b, t) {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}

function limitarValorContorno(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
}


// =========================================
// REPARTIR PUNTOS
// =========================================

function repartirPuntos(contorno, cantidad) {
    if (!contorno || contorno.length < 3) {
        return [];
    }

    const distancias = [0];
    let perimetro = 0;

    for (let i = 0; i < contorno.length; i++) {
        const siguiente = contorno[
            (i + 1) % contorno.length
        ];

        perimetro += distanciaEntrePuntos(
            contorno[i],
            siguiente
        );

        distancias.push(perimetro);
    }

    if (perimetro <= 0) {
        return [];
    }

    const resultado = [];
    let segmento = 0;

    for (let i = 0; i < cantidad; i++) {
        const objetivo =
            (i / cantidad) * perimetro;

        while (
            segmento < contorno.length - 1 &&
            distancias[segmento + 1] < objetivo
        ) {
            segmento++;
        }

        const inicio = contorno[segmento];

        const fin = contorno[
            (segmento + 1) % contorno.length
        ];

        const longitud =
            distancias[segmento + 1] -
            distancias[segmento];

        const t = longitud > 0
            ? (objetivo - distancias[segmento]) / longitud
            : 0;

        resultado.push(
            interpolarPuntos(inicio, fin, t)
        );
    }

    return resultado;
}


// =========================================
// LIMPIAR CONTORNO ORTOGONAL
// =========================================

function limpiarPuntosOrtogonales(puntos) {
    let resultado = [];

    for (const punto of puntos) {
        const anterior =
            resultado[resultado.length - 1];

        if (
            !anterior ||
            distanciaEntrePuntos(anterior, punto) >
                configuracionContornos.distanciaMinima
        ) {
            resultado.push(punto);
        }
    }

    if (
        resultado.length > 1 &&
        distanciaEntrePuntos(
            resultado[0],
            resultado[resultado.length - 1]
        ) < configuracionContornos.distanciaMinima
    ) {
        resultado.pop();
    }

    let cambios = true;

    while (cambios && resultado.length > 4) {
        cambios = false;

        const nuevos = [];

        for (let i = 0; i < resultado.length; i++) {
            const anterior = resultado[
                (i - 1 + resultado.length) %
                resultado.length
            ];

            const actual = resultado[i];

            const siguiente = resultado[
                (i + 1) % resultado.length
            ];

            const vertical =
                Math.abs(anterior.x - actual.x) <
                    configuracionContornos.distanciaMinima &&
                Math.abs(actual.x - siguiente.x) <
                    configuracionContornos.distanciaMinima;

            const horizontal =
                Math.abs(anterior.y - actual.y) <
                    configuracionContornos.distanciaMinima &&
                Math.abs(actual.y - siguiente.y) <
                    configuracionContornos.distanciaMinima;

            if (vertical || horizontal) {
                cambios = true;
            } else {
                nuevos.push(actual);
            }
        }

        if (nuevos.length < 4) {
            break;
        }

        resultado = nuevos;
    }

    return resultado;
}


// =========================================
// CONTORNO GEOMÉTRICO
// =========================================

function crearContornoOrtogonal(contorno, factor) {
    if (!contorno || contorno.length < 3) {
        return [];
    }

    const original = contorno.map(punto => ({
        x: punto.x / factor,
        y: punto.y / factor
    }));

    let perimetro = 0;

    for (let i = 0; i < original.length; i++) {
        perimetro += distanciaEntrePuntos(
            original[i],
            original[(i + 1) % original.length]
        );
    }

    const cantidad = Math.max(
        4,
        Math.ceil(
            perimetro /
            configuracionContornos.separacionOrtogonal
        )
    );

    const muestras = repartirPuntos(
        original,
        cantidad
    );

    if (muestras.length < 3) {
        return [];
    }

    const ortogonales = [];

    for (let i = 0; i < muestras.length; i++) {
        const actual = muestras[i];

        const siguiente = muestras[
            (i + 1) % muestras.length
        ];

        const esquinaA = {
            x: siguiente.x,
            y: actual.y
        };

        const esquinaB = {
            x: actual.x,
            y: siguiente.y
        };

        const medioOriginal = {
            x: (actual.x + siguiente.x) / 2,
            y: (actual.y + siguiente.y) / 2
        };

        const medioA = {
            x: (actual.x + esquinaA.x) / 2,
            y: (actual.y + esquinaA.y) / 2
        };

        const medioB = {
            x: (actual.x + esquinaB.x) / 2,
            y: (actual.y + esquinaB.y) / 2
        };

        const distanciaA = distanciaEntrePuntos(
            medioA,
            medioOriginal
        );

        const distanciaB = distanciaEntrePuntos(
            medioB,
            medioOriginal
        );

        ortogonales.push(actual);

        ortogonales.push(
            distanciaA <= distanciaB
                ? esquinaA
                : esquinaB
        );
    }

    return limpiarPuntosOrtogonales(
        ortogonales
    );
}


// =========================================
// SIMPLIFICAR GEOMETRÍA ORGÁNICA
// =========================================

// Selecciona menos puntos para que las
// curvas sean amplias y no formen
// pequeñas ondulaciones consecutivas.

function simplificarContornoOrganico(puntos) {
    if (puntos.length < 6) {
        return puntos.slice();
    }

    let perimetro = 0;

    for (let i = 0; i < puntos.length; i++) {
        perimetro += distanciaEntrePuntos(
            puntos[i],
            puntos[(i + 1) % puntos.length]
        );
    }

    const cantidad = Math.max(
        5,
        Math.min(
            puntos.length,
            Math.ceil(
                perimetro /
                configuracionContornos.simplificacionOrganica
            )
        )
    );

    return repartirPuntos(
        puntos,
        cantidad
    );
}


// =========================================
// CURVAS CATMULL-ROM A BÉZIER
// =========================================

function crearCurvaOrganica(puntos, intensidad) {
    if (puntos.length < 3) {
        return "";
    }

    const cantidad = puntos.length;

    let ruta =
        `M ${puntos[0].x} ${puntos[0].y}`;

    const tension =
        configuracionContornos.tensionCurvas *
        intensidad;

    for (let i = 0; i < cantidad; i++) {
        const anterior = puntos[
            (i - 1 + cantidad) % cantidad
        ];

        const actual = puntos[i];

        const siguiente = puntos[
            (i + 1) % cantidad
        ];

        const posterior = puntos[
            (i + 2) % cantidad
        ];

        const longitud =
            distanciaEntrePuntos(actual, siguiente);

        const longitudAnterior =
            distanciaEntrePuntos(anterior, actual);

        const longitudPosterior =
            distanciaEntrePuntos(siguiente, posterior);

        // Los manejadores se limitan para
        // reducir los abultamientos que
        // pueden deformar las islas.

        const limite =
            longitud *
            configuracionContornos.limiteCurvatura;

        const factorInicial = Math.min(
            limite,
            longitudAnterior * tension / 3,
            longitud * tension / 3
        );

        const factorFinal = Math.min(
            limite,
            longitudPosterior * tension / 3,
            longitud * tension / 3
        );

        const vectorInicial = {
            x: siguiente.x - anterior.x,
            y: siguiente.y - anterior.y
        };

        const vectorFinal = {
            x: posterior.x - actual.x,
            y: posterior.y - actual.y
        };

        const magnitudInicial = Math.hypot(
            vectorInicial.x,
            vectorInicial.y
        ) || 1;

        const magnitudFinal = Math.hypot(
            vectorFinal.x,
            vectorFinal.y
        ) || 1;

        const control1 = {
            x:
                actual.x +
                vectorInicial.x /
                magnitudInicial * factorInicial,

            y:
                actual.y +
                vectorInicial.y /
                magnitudInicial * factorInicial
        };

        const control2 = {
            x:
                siguiente.x -
                vectorFinal.x /
                magnitudFinal * factorFinal,

            y:
                siguiente.y -
                vectorFinal.y /
                magnitudFinal * factorFinal
        };

        ruta +=
            ` C ${control1.x} ${control1.y}` +
            ` ${control2.x} ${control2.y}` +
            ` ${siguiente.x} ${siguiente.y}`;
    }

    return ruta + " Z";
}


// =========================================
// INTERPOLACIÓN DE CONTORNOS
// =========================================

// Para mantener una transición continua,
// utilizamos el mismo número de muestras
// en la versión geométrica y orgánica.

function interpolarContornos(
    geometricos,
    organicos,
    intensidad
) {
    const cantidad = geometricos.length;

    const organicosAjustados = repartirPuntos(
        organicos,
        cantidad
    );

    if (organicosAjustados.length !== cantidad) {
        return geometricos;
    }

    const resultado = [];

    for (let i = 0; i < cantidad; i++) {
        resultado.push(
            interpolarPuntos(
                geometricos[i],
                organicosAjustados[i],
                intensidad
            )
        );
    }

    return resultado;
}


// =========================================
// RUTA PRINCIPAL
// =========================================

function crearRutaTradicionModernidad(contorno, factor) {
    if (!contorno || contorno.length < 3) {
        return "";
    }

    let datos = cacheContornosOrtogonales.get(contorno);

    if (!datos || datos.factor !== factor) {
        const geometricos = crearContornoOrtogonal(
            contorno,
            factor
        );

        datos = {
            factor,
            geometricos,
            organicos: simplificarContornoOrganico(
                geometricos
            )
        };

        cacheContornosOrtogonales.set(
            contorno,
            datos
        );
    }

    if (datos.geometricos.length < 4) {
        return "";
    }

    const modernidad = limitarValorContorno(
        tradicionModernidad / 100,
        0,
        1
    );

    // Modern: geometría ortogonal exacta.

    if (modernidad >= 0.999) {
        let ruta =
            `M ${datos.geometricos[0].x} ` +
            `${datos.geometricos[0].y}`;

        for (
            let i = 1;
            i < datos.geometricos.length;
            i++
        ) {
            ruta +=
                ` L ${datos.geometricos[i].x}` +
                ` ${datos.geometricos[i].y}`;
        }

        return ruta + " Z";
    }

    // Traditional: curvas amplias.

    const intensidad = Math.pow(
        1 - modernidad,
        0.65
    );

    const puntos = interpolarContornos(
        datos.geometricos,
        datos.organicos,
        intensidad
    );

    return crearCurvaOrganica(
        puntos,
        intensidad
    );
}


// =========================================
// CONEXIÓN CON EL SLIDER
// =========================================

function conectarSliderTradicionModernidad() {
    const slider = document.getElementById(
        "tradicionModernidad"
    );

    if (!slider) {
        return;
    }

    tradicionModernidad = Number(slider.value);

    slider.addEventListener("input", () => {
        tradicionModernidad = Number(slider.value);

        if (typeof redraw === "function") {
            redraw();
        }
    });
}


// =========================================
// INICIALIZACIÓN
// =========================================

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        conectarSliderTradicionModernidad,
        { once: true }
    );
} else {
    conectarSliderTradicionModernidad();
}


function crearRutaTerritorioTradicionModernidad(
    original,
    rutaSVG
) {
    if (!original?.length) {
        return rutaSVG;
    }

    const valor = limitarValorContorno(
        tradicionModernidad / 100,
        0,
        1
    );

    // En el centro se respeta el SVG original.
    if (Math.abs(valor - 0.5) < 0.00001) {
        return rutaSVG;
    }

    const intensidad = Math.abs(valor - 0.5) * 2;

    const cantidad = Math.max(
        48,
        Math.min(original.length, 1500)
    );

    const base = repartirPuntos(
        original,
        cantidad
    );

    if (base.length < 3) {
        return rutaSVG;
    }

    let destino;

    if (valor > 0.5) {
        const ortogonal = crearContornoOrtogonal(
            original,
            1
        );

        destino = repartirPuntos(
            ortogonal,
            cantidad
        );
    } else {
        const suave = simplificarContornoOrganico(
            original
        );

        destino = repartirPuntos(
            suave,
            cantidad
        );
    }

    if (destino.length !== base.length) {
        return rutaSVG;
    }

    const puntosInterpolados = base.map(
        (punto, i) => interpolarPuntos(
            punto,
            destino[i],
            intensidad
        )
    );

    if (valor < 0.5) {
        return crearCurvaOrganica(
            puntosInterpolados,
            intensidad
        );
    }

    return (
        `M ${puntosInterpolados
            .map(p => `${p.x} ${p.y}`)
            .join(" L ")} Z`
    );
}
