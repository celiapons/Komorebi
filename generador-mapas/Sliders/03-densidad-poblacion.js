
let densidadPoblacion = 50;

const configuracionParticulas = {
    cantidadMinima: 800,
    cantidadMaxima: 8000,
    recorridosPrincipales: 9,
    diametroMinimo: 0.8,
    diametroMaximo: 6,
    proporcionRellenas: 0.50,
    grosorTrazo: 0.7,
    color: "#000000",
    velocidadMinima: 0.009,
    velocidadMaxima: 0.018,
    oscilacion: 0.9,
    fpsMaximos: 24
};

let particulasPoblacion = [];
let firmaGeometriaPoblacion = "";
let capaPoblacion = null;
let gruposPoblacion = [];
let animacionPoblacion = null;
let tiempoAnteriorPoblacion = null;
let tiempoAcumuladoPoblacion = 0;
let ultimoDibujoPoblacion = null;

function actualizarDensidadPoblacion(valor) {
    const numero = Number(valor);
    densidadPoblacion = Number.isFinite(numero)
        ? Math.max(0, Math.min(100, numero))
        : 50;

    if (capaPoblacion && capaPoblacion.isConnected) {
        actualizarCapaPoblacion();
    } else if (typeof redraw === "function") {
        redraw();
    }
}

function conectarSliderDensidad() {
    const slider = document.getElementById("densidad");
    if (!slider) return;

    if (!slider.hasAttribute("oninput")) {
        slider.addEventListener("input", () => {
            actualizarDensidadPoblacion(slider.value);
        });
    }

    const valorInicial = Number(slider.value);
    if (Number.isFinite(valorInicial)) {
        densidadPoblacion = Math.max(
            0,
            Math.min(100, valorInicial)
        );
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        conectarSliderDensidad,
        { once: true }
    );
} else {
    conectarSliderDensidad();
}

function limitarPoblacion(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
}

function crearAleatorioPoblacion(semilla) {
    let estado = semilla >>> 0;

    return function() {
        estado = (
            Math.imul(1664525, estado) +
            1013904223
        ) >>> 0;

        return estado / 4294967296;
    };
}

function aleatorioNormalPoblacion(aleatorio) {
    const u = Math.max(0.000001, aleatorio());
    const v = aleatorio();

    return Math.sqrt(-2 * Math.log(u)) *
        Math.cos(Math.PI * 2 * v);
}

function obtenerFirmaPoblacion() {
    const valores = [width, height];

    for (const forma of [puntos, ...islas]) {
        valores.push(forma.length);

        const paso = Math.max(
            1,
            Math.floor(forma.length / 8)
        );

        for (let i = 0; i < forma.length; i += paso) {
            valores.push(
                Math.round(forma[i].x * 10),
                Math.round(forma[i].y * 10)
            );
        }
    }

    return valores.join(",");
}

function obtenerLimitesPoblacion(forma) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const punto of forma) {
        minX = Math.min(minX, punto.x);
        minY = Math.min(minY, punto.y);
        maxX = Math.max(maxX, punto.x);
        maxY = Math.max(maxY, punto.y);
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        ancho: maxX - minX,
        alto: maxY - minY
    };
}

function elegirOrigenPoblacion(forma, aleatorio) {
    const limites = obtenerLimitesPoblacion(forma);

    for (let intento = 0; intento < 80; intento++) {
        const candidato = {
            x: limites.minX +
                aleatorio() * limites.ancho,

            y: limites.minY +
                aleatorio() * limites.alto
        };

        if (
            typeof puntoDentroPoligono === "function" &&
            puntoDentroPoligono(candidato, forma)
        ) {
            return candidato;
        }
    }

    return forma[
        Math.floor(aleatorio() * forma.length)
    ];
}

function puntoBezierPoblacion(p0, p1, p2, p3, t) {
    const inverso = 1 - t;
    const a = inverso * inverso * inverso;
    const b = 3 * inverso * inverso * t;
    const c = 3 * inverso * t * t;
    const d = t * t * t;

    return {
        x:
            a * p0.x +
            b * p1.x +
            c * p2.x +
            d * p3.x,

        y:
            a * p0.y +
            b * p1.y +
            c * p2.y +
            d * p3.y
    };
}

function tangenteBezierPoblacion(p0, p1, p2, p3, t) {
    const inverso = 1 - t;

    return {
        x:
            3 * inverso * inverso * (p1.x - p0.x) +
            6 * inverso * t * (p2.x - p1.x) +
            3 * t * t * (p3.x - p2.x),

        y:
            3 * inverso * inverso * (p1.y - p0.y) +
            6 * inverso * t * (p2.y - p1.y) +
            3 * t * t * (p3.y - p2.y)
    };
}

function crearCorrientesPoblacion(aleatorio) {
    const corrientes = [];

    const formas = [puntos, ...islas].filter(
        forma => Array.isArray(forma) && forma.length >= 3
    );

    if (formas.length === 0) {
        return corrientes;
    }

    const territorios = formas.map((forma, indice) => {
        const limites = obtenerLimitesPoblacion(forma);

        return {
            forma,
            indice,
            limites,
            area: Math.max(
                1,
                limites.ancho * limites.alto
            )
        };
    });

    const areaPrincipal = territorios[0].area;
    const dimensionLienzo = Math.max(width, height);

    for (const territorio of territorios) {
        const proporcion =
            territorio.area / areaPrincipal;

        const cantidad = territorio.indice === 0
            ? configuracionParticulas.recorridosPrincipales
            : proporcion > 0.18
                ? 3
                : proporcion > 0.055
                    ? 2
                    : 1;

        const importancia = territorio.indice === 0
            ? 1
            : limitarPoblacion(
                0.28 + Math.sqrt(proporcion) * 0.65,
                0.28,
                0.85
            );

        const dimension = Math.max(
            territorio.limites.ancho,
            territorio.limites.alto
        );

        for (let i = 0; i < cantidad; i++) {
            const origen = elegirOrigenPoblacion(
                territorio.forma,
                aleatorio
            );

            const angulo = aleatorio() * Math.PI * 2;
            const direccionX = Math.cos(angulo);
            const direccionY = Math.sin(angulo);

            const perpendicularX = -direccionY;
            const perpendicularY = direccionX;

            const escalaRecorrido = territorio.indice === 0
                ? 1
                : 0.65 + Math.min(
                    0.35,
                    Math.sqrt(proporcion)
                );

            const distancia =
                dimensionLienzo *
                (0.65 + aleatorio() * 0.55) *
                escalaRecorrido;

            const curvatura =
                (aleatorio() < 0.5 ? -1 : 1) *
                (0.2 + aleatorio() * 0.35);

            const control1 = {
                x:
                    origen.x +
                    direccionX * distancia * 0.25 +
                    perpendicularX * distancia * curvatura,

                y:
                    origen.y +
                    direccionY * distancia * 0.25 +
                    perpendicularY * distancia * curvatura
            };

            const control2 = {
                x:
                    origen.x +
                    direccionX * distancia * 0.72 -
                    perpendicularX * distancia * curvatura * 0.8,

                y:
                    origen.y +
                    direccionY * distancia * 0.72 -
                    perpendicularY * distancia * curvatura * 0.8
            };

            const puntoFinal = {
                x: origen.x + direccionX * distancia,
                y: origen.y + direccionY * distancia
            };

            const anchuraBase = Math.max(
                8,
                Math.min(65, dimension * 0.12)
            );

            corrientes.push({
                p0: origen,
                p1: control1,
                p2: control2,
                p3: puntoFinal,

                anchura:
                    anchuraBase *
                    (0.75 + aleatorio() * 0.8),

                velocidad:
                    configuracionParticulas.velocidadMinima +
                    aleatorio() *
                    (
                        configuracionParticulas.velocidadMaxima -
                        configuracionParticulas.velocidadMinima
                    ),

                importancia
            });
        }
    }

    return corrientes;
}

function elegirCorrientePoblacion(corrientes, aleatorio) {
    let total = 0;

    for (const corriente of corrientes) {
        total += corriente.importancia;
    }

    let seleccion = aleatorio() * total;

    for (const corriente of corrientes) {
        seleccion -= corriente.importancia;

        if (seleccion <= 0) {
            return corriente;
        }
    }

    return corrientes[corrientes.length - 1];
}

function generarSistemaPoblacion() {
    const firma = obtenerFirmaPoblacion();

    if (
        particulasPoblacion.length > 0 &&
        firmaGeometriaPoblacion === firma
    ) {
        return;
    }

    let semilla = 2166136261;

    for (let i = 0; i < firma.length; i++) {
        semilla ^= firma.charCodeAt(i);
        semilla = Math.imul(semilla, 16777619);
    }

    const aleatorio = crearAleatorioPoblacion(semilla);

    const corrientes = crearCorrientesPoblacion(
        aleatorio
    );

    particulasPoblacion = [];

    if (corrientes.length === 0) {
        firmaGeometriaPoblacion = firma;
        return;
    }

    for (
        let i = 0;
        i < configuracionParticulas.cantidadMaxima;
        i++
    ) {
        const corriente = elegirCorrientePoblacion(
            corrientes,
            aleatorio
        );

        const faseInicial = Math.pow(
            aleatorio(),
            1.65
        );

        const posicionLateral =
            aleatorioNormalPoblacion(aleatorio);

        const variacionTamano = Math.pow(
            aleatorio(),
            2.1
        );

        const diametro =
            configuracionParticulas.diametroMinimo +
            variacionTamano *
            (
                configuracionParticulas.diametroMaximo -
                configuracionParticulas.diametroMinimo
            );

        particulasPoblacion.push({
            corriente,
            fase: faseInicial,
            velocidad: 0.75 + aleatorio() * 0.5,
            lateral: posicionLateral,
            oscilacionFase:
                aleatorio() * Math.PI * 2,
            oscilacionVelocidad:
                0.35 + aleatorio() * 0.6,
            radio: diametro / 2,
            rellena:
                aleatorio() <
                configuracionParticulas.proporcionRellenas,
            variacion: aleatorio()
        });
    }

    firmaGeometriaPoblacion = firma;
    tiempoAcumuladoPoblacion = 0;
}

function calcularPosicionPoblacion(particula, tiempo) {
    const corriente = particula.corriente;

    const progreso = (
        particula.fase +
        tiempo *
        corriente.velocidad *
        particula.velocidad
    ) % 1;

    const centro = puntoBezierPoblacion(
        corriente.p0,
        corriente.p1,
        corriente.p2,
        corriente.p3,
        progreso
    );

    const tangente = tangenteBezierPoblacion(
        corriente.p0,
        corriente.p1,
        corriente.p2,
        corriente.p3,
        progreso
    );

    const longitud = Math.hypot(
        tangente.x,
        tangente.y
    ) || 1;

    const normalX = -tangente.y / longitud;
    const normalY = tangente.x / longitud;

    const apertura =
        0.18 +
        progreso * 0.85 +
        Math.sin(progreso * Math.PI * 3) * 0.12;

    const anchura =
        corriente.anchura *
        Math.max(0.12, apertura);

    const oscilacion =
        Math.sin(
            tiempo *
            particula.oscilacionVelocidad *
            Math.PI * 2 +
            particula.oscilacionFase
        ) *
        configuracionParticulas.oscilacion;

    const desplazamiento =
        particula.lateral * anchura +
        oscilacion;

    const x =
        centro.x +
        normalX * desplazamiento;

    const y =
        centro.y +
        normalY * desplazamiento;

    let opacidad = 1;

    if (progreso < 0.06) {
        opacidad = progreso / 0.06;
    } else if (progreso > 0.42) {
        opacidad = Math.pow(
            (1 - progreso) / 0.58,
            1.6
        );
    }

    opacidad = limitarPoblacion(
        opacidad,
        0,
        1
    );

    return { x, y, opacidad };
}

function crearCapaPoblacion(svg, namespace) {
    const grupo = document.createElementNS(
        namespace,
        "g"
    );

    grupo.setAttribute("id", "komorebi-particulas-03");
    grupo.setAttribute(
        "class",
        "particulas-poblacion"
    );

    grupo.setAttribute(
        "stroke",
        configuracionParticulas.color
    );

    grupo.setAttribute(
        "stroke-width",
        configuracionParticulas.grosorTrazo
    );

    grupo.setAttribute(
        "stroke-linejoin",
        "round"
    );

    const niveles = [1, 0.75, 0.5, 0.25];

    gruposPoblacion = niveles.map(opacidad => {
        const vacias = document.createElementNS(
            namespace,
            "path"
        );

        vacias.setAttribute("fill", "none");
        vacias.setAttribute("opacity", opacidad);

        const rellenas = document.createElementNS(
            namespace,
            "path"
        );

        rellenas.setAttribute(
            "fill",
            configuracionParticulas.color
        );

        rellenas.setAttribute(
            "opacity",
            opacidad
        );

        grupo.appendChild(vacias);
        grupo.appendChild(rellenas);

        return { vacias, rellenas };
    });

    svg.appendChild(grupo);

    return grupo;
}

function actualizarCapaPoblacion() {
    if (!capaPoblacion || !capaPoblacion.isConnected) {
        return;
    }

    const intensidad = densidadPoblacion / 100;

    const cantidad = Math.min(
        particulasPoblacion.length,
        Math.round(
            configuracionParticulas.cantidadMinima +
            Math.pow(intensidad, 1.35) *
            (
                configuracionParticulas.cantidadMaxima -
                configuracionParticulas.cantidadMinima
            )
        )
    );

    const rutas = gruposPoblacion.map(() => ({
        vacias: [],
        rellenas: []
    }));

    for (let i = 0; i < cantidad; i++) {
        const particula = particulasPoblacion[i];

        const posicion = calcularPosicionPoblacion(
            particula,
            tiempoAcumuladoPoblacion
        );

        if (
            posicion.x < -10 ||
            posicion.x > width + 10 ||
            posicion.y < -10 ||
            posicion.y > height + 10 ||
            posicion.opacidad < 0.08
        ) {
            continue;
        }

        const visibilidad =
            0.25 + posicion.opacidad * 0.75;

        if (particula.variacion > visibilidad) {
            continue;
        }

        const nivel = limitarPoblacion(
            Math.floor(
                (1 - posicion.opacidad) * 4
            ),
            0,
            3
        );

        const radio = particula.radio;

        const y = posicion.y.toFixed(2);
        const r = radio.toFixed(2);
        const diametro = (radio * 2).toFixed(2);

        const ruta =
            `M ${(posicion.x + radio).toFixed(2)} ${y}` +
            ` a ${r} ${r} 0 1 0 -${diametro} 0` +
            ` a ${r} ${r} 0 1 0 ${diametro} 0`;

        if (particula.rellena) {
            rutas[nivel].rellenas.push(ruta);
        } else {
            rutas[nivel].vacias.push(ruta);
        }
    }

    for (let i = 0; i < gruposPoblacion.length; i++) {
        gruposPoblacion[i].vacias.setAttribute(
            "d",
            rutas[i].vacias.join(" ")
        );

        gruposPoblacion[i].rellenas.setAttribute(
            "d",
            rutas[i].rellenas.join(" ")
        );
    }
}

function animarPoblacion(tiempoActual) {
    if (!capaPoblacion || !capaPoblacion.isConnected) {
        animacionPoblacion = null;
        tiempoAnteriorPoblacion = null;
        ultimoDibujoPoblacion = null;
        return;
    }

    if (document.hidden) {
        tiempoAnteriorPoblacion = null;
        ultimoDibujoPoblacion = null;
        animacionPoblacion = requestAnimationFrame(
            animarPoblacion
        );
        return;
    }

    if (tiempoAnteriorPoblacion !== null) {
        const diferencia = Math.min(
            50,
            Math.max(
                0,
                tiempoActual - tiempoAnteriorPoblacion
            )
        );

        tiempoAcumuladoPoblacion += diferencia / 1000;
    }

    tiempoAnteriorPoblacion = tiempoActual;

    const intervalo =
        1000 / configuracionParticulas.fpsMaximos;

    if (
        ultimoDibujoPoblacion === null ||
        tiempoActual - ultimoDibujoPoblacion >= intervalo
    ) {
        actualizarCapaPoblacion();
        ultimoDibujoPoblacion = tiempoActual;
    }

    animacionPoblacion = requestAnimationFrame(
        animarPoblacion
    );
}

function dibujarParticulasPoblacion(svg, namespace) {
    if (animacionPoblacion !== null) {
        cancelAnimationFrame(animacionPoblacion);
        animacionPoblacion = null;
    }

    tiempoAnteriorPoblacion = null;
    ultimoDibujoPoblacion = null;

    generarSistemaPoblacion();

    capaPoblacion = crearCapaPoblacion(
        svg,
        namespace
    );

    animacionPoblacion = requestAnimationFrame(
        animarPoblacion
    );
}
