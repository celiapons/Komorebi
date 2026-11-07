
(() => {
    "use strict";

    // =====================================
    // CONFIGURACIÓN DE PUBLICACIÓN
    // =====================================

    const SUPABASE_URL =
        "https://tstwlvkyqtwzdvivunpq.supabase.co";

    const SUPABASE_PUBLIC_KEY =
        "sb_publishable_mZu8UESzqrEw2sQsek0wkg_cthI9yL6";

    const TURNSTILE_SITE_KEY =
        "0x4AAAAAAF1QP_YH4ITkqrbD";

    const URL_PUBLICACION =
        `${SUPABASE_URL}/functions/v1/publicar-territorio`;

    const MAX_IMAGEN_BYTES = 10 * 1024 * 1024;

    // =====================================
    // PERFILES TERRITORIALES
    // =====================================

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
            campo: "tradicion_modernidad"
        },
        {
            id: "entorno",
            campo: "natural_urbano"
        },
        {
            id: "densidad",
            campo: "densidad_poblacion"
        },
        {
            id: "edad",
            campo: "edad_poblacion"
        },
        {
            id: "turismo",
            campo: "intensidad_turistica"
        },
        {
            id: "relieve",
            campo: "relieve_terreno"
        }
    ];

    // =====================================
    // ELEMENTOS DEL DOM
    // =====================================

    const botonAbrir =
        document.getElementById("subir-archivo");

    const modal =
        document.getElementById("archivo-modal");

    const botonCerrar =
        document.getElementById("archivo-cerrar");

    const fondo =
        modal?.querySelector("[data-cerrar-archivo]");

    const titulo =
        document.getElementById("archivo-resultado");

    const comunes =
        document.getElementById("archivo-coincidencias");

    const contrastes =
        document.getElementById("archivo-diferencias");

    const imagen =
        document.getElementById("archivo-captura");

    const mensajeCaptura =
        document.getElementById("archivo-captura-espera");

    const botonCrearTerritorio =
        document.getElementById("archivo-crear-territorio");

    const territorioModal =
        document.getElementById("territorio-modal");

    const botonCerrarTerritorio =
        document.getElementById("territorio-cerrar");

    const fondoTerritorio =
        territorioModal?.querySelector(
            "[data-cerrar-territorio]"
        );

    const formularioTerritorio =
        document.getElementById("territorio-formulario");

    const tituloTerritorio =
        document.getElementById("territorio-resultado");

    const capturaTerritorio =
        document.getElementById("territorio-captura");

    const esperaTerritorio =
        document.getElementById("territorio-captura-espera");

    const estadoTerritorio =
        document.getElementById("territorio-estado");

    const botonPublicar =
        document.getElementById("territorio-publicar");

    const nombreTerritorio =
        document.getElementById("territorio-nombre");

    const caracteristicasTerritorio =
        document.getElementById("territorio-caracteristicas");

    const contenedorTurnstile =
        document.getElementById("territorio-turnstile");

    if (
        !botonAbrir ||
        !modal ||
        !territorioModal ||
        !formularioTerritorio
    ) {
        return;
    }

    // =====================================
    // ESTADO
    // =====================================

    let focoAnterior = null;
    let versionCaptura = 0;
    let capturaPNG = null;
    let valoresPublicacion = null;
    let publicando = false;
    let publicado = false;

    let turnstileId = null;
    let captchaToken = "";

    // =====================================
    // VALORES DE LOS SLIDERS
    // =====================================

    function obtenerValores() {
        return parametros.map(parametro => {
            const elemento =
                document.getElementById(parametro.id);

            const valor = Number(elemento?.value ?? 50);

            return Number.isFinite(valor)
                ? Math.max(0, Math.min(100, valor))
                : 50;
        });
    }

    // =====================================
    // COMPARACIÓN TERRITORIAL
    // =====================================

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
                    distancia,
                    diferencias
                };
            }
        );

        resultados.sort(
            (a, b) => a.distancia - b.distancia
        );

        return resultados[0];
    }

    // =====================================
    // ANÁLISIS TERRITORIAL
    // =====================================

    function actualizarAnalisis(resultado) {
        const diferenciasOrdenadas = resultado.diferencias
            .map((diferencia, indice) => ({
                diferencia,
                indice
            }))
            .sort((a, b) => a.diferencia - b.diferencia);

        const coincidencias =
            diferenciasOrdenadas.slice(0, 2);

        const disonancias =
            diferenciasOrdenadas.slice(-2).reverse();

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
                .map(elemento =>
                    descripciones[elemento.indice]
                )
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

    // =====================================
    // CAPTURA PNG DEL MAPA
    // =====================================

    async function crearCaptura() {
        const versionActual = ++versionCaptura;

        capturaPNG = null;

        imagen.hidden = true;
        imagen.removeAttribute("src");

        mensajeCaptura.hidden = false;
        mensajeCaptura.textContent =
            "Preparing map preview…";

        const lienzo =
            document.getElementById("lienzo");

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

                const dimensiones =
                    svg.getBoundingClientRect();

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

                const contenido =
                    new XMLSerializer().serializeToString(copia);

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

                    const destino =
                        document.createElement("canvas");

                    destino.width = ancho;
                    destino.height = alto;

                    const contexto =
                        destino.getContext("2d");

                    if (!contexto) {
                        throw new Error(
                            "Canvas unavailable"
                        );
                    }

                    contexto.fillStyle = "#ffffff";
                    contexto.fillRect(
                        0,
                        0,
                        ancho,
                        alto
                    );

                    contexto.drawImage(
                        imagenTemporal,
                        0,
                        0,
                        ancho,
                        alto
                    );

                    resultado =
                        destino.toDataURL("image/png");
                } finally {
                    URL.revokeObjectURL(url);
                }
            } else if (canvas) {
                resultado = canvas.toDataURL("image/png");
            } else {
                throw new Error(
                    "No map rendering found"
                );
            }

            if (
                versionActual !== versionCaptura ||
                modal.hidden
            ) {
                return;
            }

            capturaPNG = resultado;

            imagen.src = resultado;
            imagen.hidden = false;
            mensajeCaptura.hidden = true;

        } catch (error) {
            if (
                versionActual !== versionCaptura ||
                modal.hidden
            ) {
                return;
            }

            console.warn(
                "KOMOREBI: Preview unavailable",
                error
            );

            mensajeCaptura.textContent =
                "Preview unavailable. Please try again.";
        }
    }

    // =====================================
    // PRIMER BANNER
    // =====================================

    function abrirBanner() {
        if (publicando) return;

        focoAnterior = document.activeElement;
        valoresPublicacion = obtenerValores();

        const resultado =
            compararTerritorios(valoresPublicacion);

        actualizarTitulo(resultado);
        actualizarAnalisis(resultado);

        modal.hidden = false;

        document.body.classList.add(
            "archivo-modal-abierto"
        );

        botonCerrar?.focus();

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

    botonCerrar?.addEventListener(
        "click",
        cerrarBanner
    );

    fondo?.addEventListener(
        "click",
        cerrarBanner
    );

    // =====================================
    // MENSAJES DEL FORMULARIO
    // =====================================

    function mostrarEstado(mensaje) {
        if (!estadoTerritorio) return;

        estadoTerritorio.hidden = false;
        estadoTerritorio.textContent = mensaje;
    }

    function limpiarEstado() {
        if (!estadoTerritorio) return;

        estadoTerritorio.hidden = true;
        estadoTerritorio.textContent = "";
    }

    // =====================================
    // CLOUDFLARE TURNSTILE
    // =====================================

    function reiniciarTurnstile() {
        captchaToken = "";

        if (
            turnstileId !== null &&
            window.turnstile
        ) {
            window.turnstile.reset(turnstileId);
        }
    }

    function inicializarTurnstile() {
        if (!contenedorTurnstile) {
            mostrarEstado(
                "Security verification is unavailable."
            );
            return;
        }

        if (!window.turnstile) {
            mostrarEstado(
                "Security verification is loading. Please wait."
            );
            return;
        }

        if (turnstileId !== null) {
            reiniciarTurnstile();
            return;
        }

        turnstileId = window.turnstile.render(
            contenedorTurnstile,
            {
                sitekey: TURNSTILE_SITE_KEY,
                theme: "auto",

                callback(token) {
                    captchaToken = token;
                    limpiarEstado();
                },

                "expired-callback"() {
                    captchaToken = "";
                },

                "error-callback"() {
                    captchaToken = "";

                    mostrarEstado(
                        "Security verification failed. Please try again."
                    );
                }
            }
        );
    }

    // =====================================
    // SEGUNDO BANNER
    // =====================================

    function abrirSegundoBanner() {
        if (!capturaPNG) {
            mensajeCaptura.textContent =
                "The map capture is not ready. Please try again.";
            return;
        }

        tituloTerritorio.innerHTML = titulo.innerHTML;

        capturaTerritorio.src = capturaPNG;
        capturaTerritorio.hidden = false;
        esperaTerritorio.hidden = true;

        limpiarEstado();

        modal.hidden = true;
        territorioModal.hidden = false;

        document.body.classList.add(
            "archivo-modal-abierto"
        );

        nombreTerritorio?.focus();

        inicializarTurnstile();
    }

    function cerrarSegundoBanner() {
        if (publicando) return;

        territorioModal.hidden = true;

        document.body.classList.remove(
            "archivo-modal-abierto"
        );

        reiniciarTurnstile();

        focoAnterior?.focus();
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

    // =====================================
    // CONVERTIR CAPTURA A ARCHIVO PNG
    // =====================================

    async function obtenerArchivoPNG() {
        if (!capturaPNG) {
            throw new Error(
                "The map capture is unavailable."
            );
        }

        const respuesta = await fetch(capturaPNG);

        if (!respuesta.ok) {
            throw new Error(
                "The map capture could not be prepared."
            );
        }

        const blob = await respuesta.blob();

        if (
            blob.type !== "image/png" ||
            blob.size === 0
        ) {
            throw new Error(
                "The map capture is not a valid PNG."
            );
        }

        if (blob.size > MAX_IMAGEN_BYTES) {
            throw new Error(
                "The map capture exceeds the 10 MB limit."
            );
        }

        return new File(
            [blob],
            "komorebi-territory.png",
            {
                type: "image/png"
            }
        );
    }

    // =====================================
    // PUBLICAR EN SUPABASE
    // =====================================

    async function publicarTerritorio(evento) {
        evento.preventDefault();

        if (publicando || publicado) return;

        const nombre =
            nombreTerritorio?.value.trim() || "";

        const descripcion =
            caracteristicasTerritorio?.value.trim() || "";

        if (!nombre || !descripcion) {
            mostrarEstado(
                "Please complete both fields."
            );
            return;
        }

        if (!capturaPNG || !valoresPublicacion) {
            mostrarEstado(
                "The map capture is unavailable. Please try again."
            );
            return;
        }

        if (!captchaToken) {
            mostrarEstado(
                "Please complete the security verification."
            );
            return;
        }

        publicando = true;
        botonPublicar.disabled = true;

        mostrarEstado(
            "Publishing your territory…"
        );

        try {
            const archivoPNG =
                await obtenerArchivoPNG();

            const datos = new FormData();

            datos.append("nombre", nombre);
            datos.append("descripcion", descripcion);
            datos.append("imagen", archivoPNG);

            parametros.forEach((parametro, indice) => {
                datos.append(
                    parametro.campo,
                    String(valoresPublicacion[indice])
                );
            });

            datos.append(
                "captcha_token",
                captchaToken
            );

            const respuesta = await fetch(
                URL_PUBLICACION,
                {
                    method: "POST",
                    headers: {
                        apikey: SUPABASE_PUBLIC_KEY
                    },
                    body: datos
                }
            );

            const resultado =
                await respuesta.json().catch(() => null);

            if (
                !respuesta.ok ||
                resultado?.publicado !== true
            ) {
                throw new Error(
                    resultado?.error ||
                    "The territory could not be published."
                );
            }

            publicado = true;

            mostrarEstado(
                "Your territory has been successfully published!"
            );

            botonPublicar.textContent =
                "Territory published";

        } catch (error) {
            console.error(
                "KOMOREBI: Publication failed",
                error
            );

            mostrarEstado(
                error.message ||
                "An unexpected error occurred."
            );

            reiniciarTurnstile();

        } finally {
            publicando = false;

            if (!publicado) {
                botonPublicar.disabled = false;
            }
        }
    }

    formularioTerritorio.addEventListener(
        "submit",
        publicarTerritorio
    );

    // =====================================
    // CERRAR BANNERS CON ESCAPE
    // =====================================

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") return;

        if (
            !territorioModal.hidden &&
            !publicando
        ) {
            cerrarSegundoBanner();
            return;
        }

        if (!modal.hidden) {
            cerrarBanner();
        }
    });

    // =====================================
    // CONTROL DEL FOCO EN EL PRIMER BANNER
    // =====================================

    document.addEventListener("keydown", evento => {
        if (
            modal.hidden ||
            evento.key !== "Tab"
        ) {
            return;
        }

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

})();
