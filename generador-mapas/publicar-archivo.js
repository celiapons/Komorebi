
(() => {
    "use strict";

    // Perfiles de referencia de los cinco territorios.
    // Orden: tradición, entorno, densidad, edad, turismo y relieve.
    const perfiles = {
        Tokyo: [85, 85, 95, 65, 90, 55],
        Kyoto: [30, 40, 50, 75, 90, 75],
        Osaka: [80, 85, 85, 65, 85, 25],
        "Hokkaidō": [45, 15, 10, 80, 75, 85],
        Okinawa: [40, 35, 50, 40, 85, 55]
    };

    const parametros = [
        {
            id: "tradicionModernidad",
            nombre: "tradition and modernity"
        },
        {
            id: "entorno",
            nombre: "natural and urban environment"
        },
        {
            id: "densidad",
            nombre: "population density"
        },
        {
            id: "edad",
            nombre: "population age"
        },
        {
            id: "turismo",
            nombre: "tourism intensity"
        },
        {
            id: "relieve",
            nombre: "terrain relief"
        }
    ];

    const botonAbrir = document.getElementById("subir-archivo");
    const modal = document.getElementById("archivo-modal");
    const botonCerrar = document.getElementById("archivo-cerrar");
    const fondo = modal?.querySelector("[data-cerrar-archivo]");

    const titulo = document.getElementById("archivo-resultado");
    const comunes = document.getElementById("archivo-coincidencias");
    const contrastes = document.getElementById("archivo-diferencias");

    const imagen = document.getElementById("archivo-captura");
    const mensajeCaptura = document.getElementById(
        "archivo-captura-espera"
    );

    if (!botonAbrir || !modal || !botonCerrar) {
        return;
    }

    let focoAnterior = null;
    let versionCaptura = 0;

    function obtenerValores() {
        return parametros.map(parametro => {
            const elemento = document.getElementById(parametro.id);
            const valor = Number(elemento?.value ?? 50);

            return Number.isFinite(valor)
                ? Math.max(0, Math.min(100, valor))
                : 50;
        });
    }

    function compararTerritorios(valores) {
        const resultados = Object.entries(perfiles).map(
            ([nombre, perfil]) => {
                const diferencias = valores.map(
                    (valor, indice) =>
                        Math.abs(valor - perfil[indice])
                );

                const distancia = Math.sqrt(
                    diferencias.reduce(
                        (suma, diferencia) =>
                            suma + diferencia ** 2,
                        0
                    ) / diferencias.length
                );

                return {
                    nombre,
                    similitud: Math.max(
                        0,
                        Math.round(100 - distancia)
                    ),
                    diferencias
                };
            }
        );

        resultados.sort(
            (a, b) => b.similitud - a.similitud
        );

        return resultados[0];
    }

   
function actualizarAnalisis(resultado) {
    const diferenciasOrdenadas = resultado.diferencias
        .map((diferencia, indice) => ({
            diferencia,
            indice
        }))
        .sort((a, b) => a.diferencia - b.diferencia);

    const coincidencias = diferenciasOrdenadas.slice(0, 2);

    const disonancias = diferenciasOrdenadas
        .slice(-2)
        .reverse();

    const descripciones = [
        "the balance between tradition and modernity",
        "the relationship between natural and urban environments",
        "the distribution of population across the territory",
        "the demographic composition of its population",
        "the intensity of tourism and visitor activity",
        "the characteristics of its geographical relief"
    ];

    function describirParametros(elementos) {
        return elementos
            .map(elemento => descripciones[elemento.indice])
            .join(" and ");
    }

    comunes.textContent =
        `Your imaginary territory shares similarities ` +
        `with ${resultado.nombre} in ` +
        `${describirParametros(coincidencias)}.`;

    contrastes.textContent =
        `The main differences appear in ` +
        `${describirParametros(disonancias)}, ` +
        `giving your map its own distinct identity.`;
}


    function actualizarTitulo(resultado) {
        const porcentaje = document.createElement("strong");

        porcentaje.textContent =
            `${resultado.similitud}% similar`;

        titulo.replaceChildren(
            document.createTextNode("Your map is "),
            porcentaje,
            document.createTextNode(
                ` to the territory of ${resultado.nombre}.`
            )
        );
    }

    async function crearCaptura() {
        const versionActual = ++versionCaptura;

        imagen.hidden = true;
        imagen.removeAttribute("src");

        mensajeCaptura.hidden = false;
        mensajeCaptura.textContent = "Preparing map preview…";

        const lienzo = document.getElementById("lienzo");

        const svg = lienzo?.querySelector("svg");
        const canvas = lienzo?.querySelector("canvas");

        try {
            let resultado;

            if (svg) {
                const copia = svg.cloneNode(true);

                copia.setAttribute(
                    "xmlns",
                    "http://www.w3.org/2000/svg"
                );

                const dimensiones = svg.getBoundingClientRect();

                const ancho = Math.max(
                    1,
                    Math.round(dimensiones.width)
                );

                const alto = Math.max(
                    1,
                    Math.round(dimensiones.height)
                );

                copia.setAttribute("width", ancho);
                copia.setAttribute("height", alto);

                const contenido = new XMLSerializer()
                    .serializeToString(copia);

                const blob = new Blob(
                    [contenido],
                    {
                        type: "image/svg+xml;charset=utf-8"
                    }
                );

                const url = URL.createObjectURL(blob);

                try {
                    const imagenTemporal = new Image();

                    await new Promise((resolver, rechazar) => {
                        imagenTemporal.onload = resolver;
                        imagenTemporal.onerror = rechazar;
                        imagenTemporal.src = url;
                    });

                    const destino = document.createElement("canvas");

                    destino.width = ancho;
                    destino.height = alto;

                    const contexto = destino.getContext("2d");

                    if (!contexto) {
                        throw new Error("Canvas unavailable");
                    }

                    contexto.fillStyle = "#ffffff";
                    contexto.fillRect(0, 0, ancho, alto);

                    contexto.drawImage(
                        imagenTemporal,
                        0,
                        0,
                        ancho,
                        alto
                    );

                    resultado = destino.toDataURL("image/png");
                } finally {
                    URL.revokeObjectURL(url);
                }
            } else if (canvas) {
                resultado = canvas.toDataURL("image/png");
            } else {
                throw new Error("No map rendering found");
            }

            if (versionActual !== versionCaptura || modal.hidden) {
                return;
            }

            imagen.src = resultado;
            imagen.hidden = false;
            mensajeCaptura.hidden = true;
        } catch (error) {
            if (versionActual !== versionCaptura || modal.hidden) {
                return;
            }

            console.warn(
                "KOMOREBI: Preview unavailable",
                error
            );

            mensajeCaptura.textContent =
                "Preview unavailable. Your slider comparison is ready.";
        }
    }

    function abrirBanner() {
        focoAnterior = document.activeElement;

        const valores = obtenerValores();
        const resultado = compararTerritorios(valores);

        actualizarTitulo(resultado);
        actualizarAnalisis(resultado);

        modal.hidden = false;

        document.body.classList.add(
            "archivo-modal-abierto"
        );

        botonCerrar.focus();

        void crearCaptura();
    }

    function cerrarBanner() {
        versionCaptura++;

        modal.hidden = true;

        document.body.classList.remove(
            "archivo-modal-abierto"
        );

        focoAnterior?.focus();
    }

    botonAbrir.addEventListener(
        "click",
        abrirBanner
    );

    botonCerrar.addEventListener(
        "click",
        cerrarBanner
    );

    fondo?.addEventListener(
        "click",
        cerrarBanner
    );

    document.addEventListener("keydown", evento => {
        if (modal.hidden) return;

        if (evento.key === "Escape") {
            cerrarBanner();
            return;
        }

        if (evento.key !== "Tab") return;

        const elementos = [
            ...modal.querySelectorAll(
                "button:not(:disabled), input:not(:disabled)"
            )
        ];

        const primero = elementos[0];
        const ultimo = elementos[elementos.length - 1];

        if (!primero || !ultimo) return;

        if (
            evento.shiftKey &&
            document.activeElement === primero
        ) {
            evento.preventDefault();
            ultimo.focus();
        } else if (
            !evento.shiftKey &&
            document.activeElement === ultimo
        ) {
            evento.preventDefault();
            primero.focus();
        }
    });

    
/* ===================================
   SEGUNDO BANNER — INTERACCIONES
=================================== */

const botonCrearTerritorio = document.getElementById(
    "archivo-crear-territorio"
);

const territorioModal = document.getElementById(
    "territorio-modal"
);

const botonCerrarTerritorio = document.getElementById(
    "territorio-cerrar"
);

const fondoTerritorio = territorioModal?.querySelector(
    "[data-cerrar-territorio]"
);

const formularioTerritorio = document.getElementById(
    "territorio-formulario"
);

const tituloTerritorio = document.getElementById(
    "territorio-resultado"
);

const capturaTerritorio = document.getElementById(
    "territorio-captura"
);

const esperaTerritorio = document.getElementById(
    "territorio-captura-espera"
);

const estadoTerritorio = document.getElementById(
    "territorio-estado"
);

function abrirSegundoBanner() {
    if (!territorioModal) return;

    // Conservar el título del primer banner.
    tituloTerritorio.innerHTML = titulo.innerHTML;

    // Conservar la captura del mapa.
    if (!imagen.hidden && imagen.src) {
        capturaTerritorio.src = imagen.src;
        capturaTerritorio.hidden = false;
        esperaTerritorio.hidden = true;
    } else {
        capturaTerritorio.hidden = true;
        esperaTerritorio.hidden = false;
        esperaTerritorio.textContent =
            "Map preview unavailable.";
    }

    modal.hidden = true;
    territorioModal.hidden = false;

    document.body.classList.add(
        "archivo-modal-abierto"
    );

    document.getElementById(
        "territorio-nombre"
    )?.focus();
}

function cerrarSegundoBanner() {
    if (!territorioModal) return;

    territorioModal.hidden = true;

    document.body.classList.remove(
        "archivo-modal-abierto"
    );

    botonAbrir.focus();
}

botonCrearTerritorio?.addEventListener(
    "click",
    abrirSegundoBanner
);

botonCerrarTerritorio?.addEventListener(
    "click",
    cerrarSegundoBanner
);

fondoTerritorio?.addEventListener(
    "click",
    cerrarSegundoBanner
);

document.addEventListener("keydown", evento => {
    if (!territorioModal || territorioModal.hidden) return;

    if (evento.key === "Escape") {
        cerrarSegundoBanner();
    }
});

formularioTerritorio?.addEventListener(
    "submit",
    evento => {
        evento.preventDefault();

        const nombre = document.getElementById(
            "territorio-nombre"
        ).value.trim();

        const caracteristicas = document.getElementById(
            "territorio-caracteristicas"
        ).value.trim();

        if (!nombre || !caracteristicas) {
            estadoTerritorio.hidden = false;
            estadoTerritorio.textContent =
                "Please complete both fields.";
            return;
        }

        estadoTerritorio.hidden = false;
        estadoTerritorio.textContent =
            "Your territory is ready. Public archive storage " +
            "will be connected in the next step.";
    }
);

})();
