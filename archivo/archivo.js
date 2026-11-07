
/* =========================================
   KOMOREBI — PUBLIC ARCHIVE
========================================= */

(() => {
    "use strict";

    // =====================================
    // CONFIGURACIÓN DE SUPABASE
    // =====================================

    const SUPABASE_URL =
        "https://tstwlvkyqtwzdvivunpq.supabase.co";

    const SUPABASE_PUBLIC_KEY =
        "sb_publishable_mZu8UESzqrEw2sQsek0wkg_cthI9yL6";

    const BUCKET = "imagenes-territorios";

    // =====================================
    // PERFILES TERRITORIALES
    // =====================================

    const perfilesTerritoriales = {
        Tokyo: [85, 85, 95, 65, 90, 55],
        Kyoto: [30, 40, 50, 75, 90, 75],
        Osaka: [80, 85, 85, 65, 85, 25],
        "Hokkaidō": [45, 15, 10, 80, 75, 85],
        Okinawa: [40, 35, 50, 40, 85, 55]
    };

    // =====================================
    // VÍDEOS TERRITORIALES
    // =====================================

    const videosTerritoriales = {
        Tokyo: "assets/tokyo.mp4",
        Kyoto: "assets/kyoto.mp4",
        Osaka: "assets/osaka.mp4",
        "Hokkaidō": "assets/hokkaido.mp4",
        Okinawa: "assets/okinawa.mp4"
    };

    // =====================================
    // PROPORCIONES DE LOS MARCOS
    // =====================================

    const proporciones = [
        1.15,
        1.35,
        0.9,
        1.3,
        0.8,
        1.45,
        1.1,
        1.35
    ];

    // =====================================
    // ELEMENTOS DEL DOM
    // =====================================

    const galeria = document.getElementById(
        "galeria-archivo"
    );

    const mensajeVacio = document.getElementById(
        "mensaje-vacio"
    );

    const filtros = document.querySelectorAll(
        ".filtro"
    );

    const territorioDestacado = document.getElementById(
        "territorio-destacado"
    );

    const tituloGaleria = document.getElementById(
        "titulo-galeria"
    );

    const contenedorVideo = document.getElementById(
        "mapa-territorial"
    );

    // =====================================
    // ELEMENTOS DEL BANNER
    // =====================================

    const modal = document.getElementById(
        "territorio-info-modal"
    );

    const fondoModal = document.getElementById(
        "territorio-info-fondo"
    );

    const cerrarModal = document.getElementById(
        "territorio-info-cerrar"
    );

    const tituloModal = document.getElementById(
        "territorio-info-titulo"
    );

    const imagenModal = document.getElementById(
        "territorio-info-imagen"
    );

    const textoModal = document.getElementById(
        "territorio-info-texto"
    );

    const similitudModal = document.getElementById(
        "territorio-info-similitud"
    );

    // =====================================
    // ESTADO DEL ARCHIVO
    // =====================================

    let mapas = [];
    let filtroActual = "Recents";
    let cargando = false;
    let errorCarga = false;
    let elementoAnterior = null;

    // =====================================
    // OBSERVADOR DE VÍDEOS
    // =====================================

    const observadorVideos = new IntersectionObserver(
        entradas => {
            entradas.forEach(entrada => {
                const video = entrada.target;

                if (
                    entrada.isIntersecting &&
                    !document.hidden
                ) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            });
        },
        {
            threshold: 0.1
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            document.querySelectorAll(
                ".tarjeta-mapa video"
            ).forEach(video => {
                if (document.hidden) {
                    video.pause();
                } else {
                    observadorVideos.unobserve(video);
                    observadorVideos.observe(video);
                }
            });
        }
    );

    // =====================================
    // URL DE IMAGEN EN STORAGE
    // =====================================

    function obtenerURLImagen(ruta) {
        if (!ruta || typeof ruta !== "string") {
            return null;
        }

        const rutaCodificada = ruta
            .split("/")
            .map(segmento =>
                encodeURIComponent(segmento)
            )
            .join("/");

        return (
            `${SUPABASE_URL}/storage/v1/object/public/` +
            `${BUCKET}/${rutaCodificada}`
        );
    }

    // =====================================
    // CLASIFICACIÓN POR SIMILITUD
    // =====================================

    function clasificarMapa(valores) {
        if (
            !Array.isArray(valores) ||
            valores.length !== 6 ||
            !valores.every(
                valor =>
                    Number.isFinite(valor) &&
                    valor >= 0 &&
                    valor <= 100
            )
        ) {
            return null;
        }

        let territorioCercano = null;
        let distanciaMinima = Infinity;

        for (const [territorio, perfil] of
            Object.entries(perfilesTerritoriales)) {

            const distancia = Math.sqrt(
                valores.reduce(
                    (total, valor, indice) =>
                        total +
                        (valor - perfil[indice]) ** 2,
                    0
                ) / valores.length
            );

            if (distancia < distanciaMinima) {
                distanciaMinima = distancia;
                territorioCercano = territorio;
            }
        }

        return territorioCercano;
    }

    // =====================================
    // FORMATO DE SIMILITUD
    // =====================================

    function obtenerPorcentaje(mapa) {
        const valor = Number(mapa.similitud);

        if (!Number.isFinite(valor)) {
            return 0;
        }

        return Math.round(
            Math.max(0, Math.min(100, valor))
        );
    }

    // =====================================
    // CONVERTIR REGISTRO DE SUPABASE
    // =====================================

    function prepararMapa(registro, indice) {
        const sliders = [
            registro.tradicion_modernidad,
            registro.natural_urbano,
            registro.densidad_poblacion,
            registro.edad_poblacion,
            registro.intensidad_turistica,
            registro.relieve_terreno
        ].map(Number);

        const territorioCalculado =
            clasificarMapa(sliders);

        const territorio =
            territorioCalculado ||
            registro.territorio_similar;

        return {
            id: registro.id,
            nombre: registro.nombre,
            descripcion: registro.descripcion,
            imagen: obtenerURLImagen(
                registro.imagen_path
            ),
            ubicacion: territorio,
            fecha: registro.fecha_creacion,
            proporcion:
                proporciones[indice % proporciones.length],
            sliders,
            similitud: registro.similitud,
            video: null
        };
    }

    // =====================================
    // CARGAR MAPAS DESDE SUPABASE
    // =====================================

    async function cargarMapas() {
        if (cargando) return;

        cargando = true;
        errorCarga = false;

        renderizarGaleria();

        try {
            const campos = [
                "id",
                "nombre",
                "descripcion",
                "tradicion_modernidad",
                "natural_urbano",
                "densidad_poblacion",
                "edad_poblacion",
                "intensidad_turistica",
                "relieve_terreno",
                "territorio_similar",
                "similitud",
                "imagen_path",
                "fecha_creacion"
            ].join(",");

            const url = new URL(
                `${SUPABASE_URL}/rest/v1/territorios`
            );

            url.searchParams.set("select", campos);
            url.searchParams.set(
                "order",
                "fecha_creacion.desc"
            );

            const respuesta = await fetch(
                url.toString(),
                {
                    method: "GET",
                    headers: {
                        apikey: SUPABASE_PUBLIC_KEY,
                        Accept: "application/json"
                    },
                    cache: "no-store"
                }
            );

            if (!respuesta.ok) {
                const detalle = await respuesta
                    .text()
                    .catch(() => "");

                throw new Error(
                    `Supabase ${respuesta.status}: ${detalle}`
                );
            }

            const registros = await respuesta.json();

            if (!Array.isArray(registros)) {
                throw new Error(
                    "Invalid archive response."
                );
            }

            mapas = registros
                .filter(registro =>
                    registro.id &&
                    registro.imagen_path
                )
                .map((registro, indice) =>
                    prepararMapa(registro, indice)
                );

        } catch (error) {
            console.error(
                "KOMOREBI: Error loading archive",
                error
            );

            errorCarga = true;
            mapas = [];

        } finally {
            cargando = false;
            renderizarGaleria();
        }
    }

    // =====================================
    // VISTA TERRITORIAL
    // =====================================

    function actualizarVistaTerritorial() {
        const rutaVideo =
            videosTerritoriales[filtroActual];

        const esTerritorio = Boolean(rutaVideo);

        if (territorioDestacado) {
            territorioDestacado.hidden = !esTerritorio;
        }

        if (tituloGaleria) {
            tituloGaleria.hidden = !esTerritorio;

            if (esTerritorio) {
                tituloGaleria.textContent =
                    `Imaginary territories related with ${filtroActual}`;
            }
        }

        if (!contenedorVideo) return;

        const videoActual =
            contenedorVideo.querySelector("video");

        if (
            videoActual?.dataset.territorio ===
            filtroActual
        ) {
            return;
        }

        if (videoActual) {
            videoActual.pause();
        }

        contenedorVideo.replaceChildren();

        if (!esTerritorio) return;

        const video = document.createElement("video");

        video.src = rutaVideo;
        video.dataset.territorio = filtroActual;
        video.autoplay = true;
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";

        video.setAttribute(
            "aria-label",
            `Animated imaginary territory of ${filtroActual}`
        );

        contenedorVideo.appendChild(video);
        video.play().catch(() => {});
    }

    // =====================================
    // ABRIR BANNER DE INFORMACIÓN
    // =====================================

    function abrirBanner(mapa) {
        if (!modal || !mapa) return;

        elementoAnterior = document.activeElement;

        const nombre = mapa.nombre || "Untitled Territory";
        const descripcion =
            mapa.descripcion || "No description available.";

        const territorio =
            mapa.ubicacion || "Unknown territory";

        const porcentaje = obtenerPorcentaje(mapa);

        tituloModal.textContent =
            `Territory of ${nombre}`;

        imagenModal.src = mapa.imagen || "";
        imagenModal.alt =
            `Imaginary territory created by a user: ${nombre}`;

        textoModal.textContent = descripcion;

        similitudModal.replaceChildren();

        const porcentajeDestacado =
            document.createElement("strong");

        porcentajeDestacado.textContent =
            `${porcentaje}%`;

        similitudModal.appendChild(
            porcentajeDestacado
        );

        similitudModal.appendChild(
            document.createTextNode(
                ` similar to the territory of ${territorio}.`
            )
        );

        modal.hidden = false;
        document.body.classList.add("modal-abierto");

        cerrarModal.focus();
    }

    // =====================================
    // CERRAR BANNER
    // =====================================

    function cerrarBanner() {
        if (!modal || modal.hidden) return;

        modal.hidden = true;
        document.body.classList.remove(
            "modal-abierto"
        );

        if (
            elementoAnterior &&
            elementoAnterior.isConnected
        ) {
            elementoAnterior.focus();
        }

        elementoAnterior = null;
    }

    cerrarModal?.addEventListener(
        "click",
        cerrarBanner
    );

    fondoModal?.addEventListener(
        "click",
        cerrarBanner
    );

    document.addEventListener(
        "keydown",
        evento => {
            if (!modal || modal.hidden) return;

            if (evento.key === "Escape") {
                cerrarBanner();
            }

            if (evento.key === "Tab") {
                const elementos = Array.from(
                    modal.querySelectorAll(
                        "button, a[href], input, textarea, select, [tabindex]:not([tabindex='-1'])"
                    )
                ).filter(elemento =>
                    !elemento.disabled &&
                    elemento.getClientRects().length > 0
                );

                if (!elementos.length) return;

                const primero = elementos[0];
                const ultimo =
                    elementos[elementos.length - 1];

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
            }
        }
    );

    // =====================================
    // CREAR OVERLAY DEL HOVER
    // =====================================

    function crearOverlay(mapa) {
        const overlay =
            document.createElement("div");

        overlay.className =
            "tarjeta-mapa__overlay";

        const nombre =
            document.createElement("h3");

        nombre.className =
            "tarjeta-mapa__nombre";

        nombre.textContent =
            mapa.nombre || "Untitled Territory";

        const similitud =
            document.createElement("p");

        similitud.className =
            "tarjeta-mapa__similitud";

        similitud.textContent =
            `${obtenerPorcentaje(mapa)}% similar to the territory of ${mapa.ubicacion || "Unknown"}.`;

        const boton =
            document.createElement("button");

        boton.type = "button";

        boton.className =
            "tarjeta-mapa__boton";

        boton.textContent =
            "More information";

        boton.setAttribute(
            "aria-label",
            `More information about ${mapa.nombre || "this territory"}`
        );

        boton.addEventListener(
            "click",
            () => abrirBanner(mapa)
        );

        overlay.append(
            nombre,
            similitud,
            boton
        );

        return overlay;
    }

    // =====================================
    // CREAR TARJETA
    // =====================================

    function crearTarjeta(mapa) {
        const tarjeta =
            document.createElement("article");

        tarjeta.className = "tarjeta-mapa";
        tarjeta.dataset.id = mapa.id;
        tarjeta.dataset.ubicacion =
            mapa.ubicacion || "";

        const contenedor =
            document.createElement("div");

        contenedor.className = "imagen-mapa";

        contenedor.style.aspectRatio =
            `1 / ${mapa.proporcion || 1}`;

        if (mapa.video) {
            const video =
                document.createElement("video");

            video.src = mapa.video;
            video.autoplay = true;
            video.muted = true;
            video.defaultMuted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = "metadata";

            if (mapa.imagen) {
                video.poster = mapa.imagen;
            }

            video.addEventListener(
                "error",
                () => {
                    observadorVideos.unobserve(video);
                    video.remove();

                    contenedor.classList.add(
                        "imagen-pendiente"
                    );

                    contenedor.textContent =
                        "Video unavailable";
                },
                { once: true }
            );

            contenedor.appendChild(video);
            observadorVideos.observe(video);

        } else if (mapa.imagen) {
            const imagen =
                document.createElement("img");

            imagen.src = mapa.imagen;

            imagen.alt = mapa.nombre
                ? `Komorebi map — ${mapa.nombre}`
                : `Komorebi map — ${mapa.ubicacion || "Archive"}`;

            imagen.loading = "lazy";
            imagen.decoding = "async";

            imagen.addEventListener(
                "error",
                () => {
                    imagen.remove();

                    contenedor.classList.add(
                        "imagen-pendiente"
                    );

                    contenedor.textContent =
                        "Map unavailable";
                },
                { once: true }
            );

            contenedor.appendChild(imagen);
        }

        tarjeta.appendChild(contenedor);

        if (mapa.imagen || mapa.video) {
            tarjeta.appendChild(
                crearOverlay(mapa)
            );
        }

        return tarjeta;
    }

    // =====================================
    // CREAR COLUMNAS
    // =====================================

    function crearColumnas(cantidad) {
        const columnas = [];

        for (let i = 0; i < cantidad; i++) {
            const columna =
                document.createElement("div");

            columna.className = "columna-mapas";

            columnas.push(columna);
            galeria.appendChild(columna);
        }

        return columnas;
    }

    // =====================================
    // NÚMERO DE COLUMNAS
    // =====================================

    function obtenerNumeroColumnas() {
        const ancho = window.innerWidth;

        if (ancho <= 480) return 1;
        if (ancho <= 800) return 2;
        if (ancho <= 1000) return 3;

        return 4;
    }

    // =====================================
    // FILTRAR MAPAS
    // =====================================

    function obtenerMapasFiltrados(filtro) {
        const resultado = filtro === "Recents"
            ? [...mapas]
            : mapas.filter(mapa => {
                const territorio = Array.isArray(
                    mapa.sliders
                )
                    ? clasificarMapa(mapa.sliders)
                    : mapa.ubicacion;

                return territorio === filtro;
            });

        return resultado.sort((a, b) =>
            new Date(b.fecha) - new Date(a.fecha)
        );
    }

    // =====================================
    // RENDERIZAR GALERÍA
    // =====================================

    function renderizarGaleria() {
        if (!galeria) return;

        actualizarVistaTerritorial();

        observadorVideos.disconnect();

        galeria.querySelectorAll(
            "video"
        ).forEach(video => video.pause());

        galeria.replaceChildren();

        const resultados =
            obtenerMapasFiltrados(filtroActual);

        if (mensajeVacio) {
            mensajeVacio.hidden =
                resultados.length > 0;

            if (resultados.length === 0) {
                if (cargando) {
                    mensajeVacio.textContent =
                        "Loading territories…";
                } else if (errorCarga) {
                    mensajeVacio.textContent =
                        "Unable to load the public archive.";
                } else {
                    mensajeVacio.textContent =
                        "No territories published yet.";
                }
            }
        }

        if (resultados.length === 0) return;

        const columnas =
            crearColumnas(obtenerNumeroColumnas());

        resultados.forEach((mapa, indice) => {
            columnas[
                indice % columnas.length
            ].appendChild(
                crearTarjeta(mapa)
            );
        });
    }

    // =====================================
    // FILTROS
    // =====================================

    filtros.forEach(boton => {
        boton.addEventListener(
            "click",
            () => {
                filtroActual =
                    boton.dataset.filtro;

                filtros.forEach(filtro => {
                    const activo =
                        filtro === boton;

                    filtro.classList.toggle(
                        "activo",
                        activo
                    );

                    filtro.setAttribute(
                        "aria-pressed",
                        String(activo)
                    );
                });

                renderizarGaleria();
            }
        );
    });

    // =====================================
    // RESPONSIVE
    // =====================================

    let columnasActuales =
        obtenerNumeroColumnas();

    window.addEventListener(
        "resize",
        () => {
            const nuevasColumnas =
                obtenerNumeroColumnas();

            if (
                nuevasColumnas !==
                columnasActuales
            ) {
                columnasActuales =
                    nuevasColumnas;

                renderizarGaleria();
            }
        }
    );

    // =====================================
    // RECARGAR AL VOLVER
    // =====================================

    window.addEventListener(
        "pageshow",
        evento => {
            if (evento.persisted) {
                cargarMapas();
            }
        }
    );

    // =====================================
    // INICIALIZACIÓN
    // =====================================

    cargarMapas();

})();
