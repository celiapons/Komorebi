
/* =========================================
   KOMOREBI — PUBLIC ARCHIVE

   - Galería de mapas
   - Distribución masonry
   - Filtros por territorio
   - Perfiles de los seis sliders
   - Clasificación por similitud
   - Espacio para mapas animados

   Los registros actuales son de ejemplo.
========================================= */

(() => {
    "use strict";


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

    
const videosTerritoriales = {
    Tokyo: "assets/tokyo.mp4",
    Kyoto: "assets/kyoto.mp4",
    Osaka: "assets/osaka.mp4",
    "Hokkaidō": "assets/hokkaido.mp4",
    Okinawa: "assets/okinawa.mp4"
};



    // =====================================
    // CLASIFICAR MAPA POR SIMILITUD
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
                    (total, valor, indice) => {
                        return total +
                            (valor - perfil[indice]) ** 2;
                    },
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
    // MAPAS DE EJEMPLO
    // =====================================

    const mapas = [
        {
            id: "mapa-001",
            imagen: "mapas/mapa-01.jpg",
            ubicacion: "Tokyo",
            fecha: "2026-11-03",
            proporcion: 1.15
        },
        {
            id: "mapa-002",
            imagen: "mapas/mapa-02.jpg",
            ubicacion: "Kyoto",
            fecha: "2026-11-03",
            proporcion: 1.55
        },
        {
            id: "mapa-003",
            imagen: "mapas/mapa-03.jpg",
            ubicacion: "Osaka",
            fecha: "2026-11-03",
            proporcion: 0.95
        },
        {
            id: "mapa-004",
            imagen: "mapas/mapa-04.jpg",
            ubicacion: "Hokkaidō",
            fecha: "2026-11-03",
            proporcion: 1.3
        },
        {
            id: "mapa-005",
            imagen: "mapas/mapa-05.jpg",
            ubicacion: "Okinawa",
            fecha: "2026-11-02",
            proporcion: 0.9
        },
        {
            id: "mapa-006",
            imagen: "mapas/mapa-06.jpg",
            ubicacion: "Tokyo",
            fecha: "2026-11-02",
            proporcion: 1.1
        },
        {
            id: "mapa-007",
            imagen: "mapas/mapa-07.jpg",
            ubicacion: "Kyoto",
            fecha: "2026-11-02",
            proporcion: 1.35
        },
        {
            id: "mapa-008",
            imagen: "mapas/mapa-08.jpg",
            ubicacion: "Osaka",
            fecha: "2026-11-02",
            proporcion: 1.0
        },
        {
            id: "mapa-009",
            imagen: "mapas/mapa-09.jpg",
            ubicacion: "Hokkaidō",
            fecha: "2026-11-01",
            proporcion: 1.45
        },
        {
            id: "mapa-010",
            imagen: "mapas/mapa-10.jpg",
            ubicacion: "Okinawa",
            fecha: "2026-11-01",
            proporcion: 1.05
        },
        {
            id: "mapa-011",
            imagen: "mapas/mapa-11.jpg",
            ubicacion: "Tokyo",
            fecha: "2026-11-01",
            proporcion: 1.2
        },
        {
            id: "mapa-012",
            imagen: "mapas/mapa-12.jpg",
            ubicacion: "Kyoto",
            fecha: "2026-11-01",
            proporcion: 0.85
        }
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
    // ESTADO DEL ARCHIVO
    // =====================================

    let filtroActual = "Recents";

    
const observadorVideos = new IntersectionObserver(
    entradas => {
        entradas.forEach(entrada => {
            const video = entrada.target;

            if (entrada.isIntersecting && !document.hidden) {
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

document.addEventListener("visibilitychange", () => {
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
});



    // =====================================
    // ACTUALIZAR VISTA TERRITORIAL
    // =====================================

    
function actualizarVistaTerritorial() {
    const rutaVideo = videosTerritoriales[filtroActual];
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

    const videoActual = contenedorVideo.querySelector("video");

    if (videoActual?.dataset.territorio === filtroActual) {
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

    video.setAttribute("aria-label",
        `Animated imaginary territory of ${filtroActual}`
    );

    contenedorVideo.appendChild(video);

    video.play().catch(() => {});
}


    // =====================================
    // CREAR TARJETA
    // =====================================

    
function crearTarjeta(mapa) {
    const tarjeta = document.createElement("article");

    tarjeta.className = "tarjeta-mapa";
    tarjeta.dataset.id = mapa.id;
    tarjeta.dataset.ubicacion = mapa.ubicacion || "";

    const contenedor = document.createElement("div");
    contenedor.className = "imagen-mapa";

    const proporcion = mapa.proporcion || 1;

    contenedor.style.aspectRatio =
        `1 / ${proporcion}`;

    if (mapa.video) {
        const video = document.createElement("video");

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

        video.addEventListener("loadedmetadata", () => {
            if (video.videoWidth && video.videoHeight) {
                contenedor.style.aspectRatio = "auto";
            }
        });

        video.addEventListener("error", () => {
            contenedor.classList.add("imagen-pendiente");
            contenedor.textContent = "Video unavailable";
        }, { once: true });

        contenedor.appendChild(video);
        observadorVideos.observe(video);

    } else if (mapa.imagen) {
        const imagen = document.createElement("img");

        imagen.src = mapa.imagen;
        imagen.alt =
            `Komorebi map — ${mapa.ubicacion || "Archive"}`;

        imagen.loading = "lazy";
        imagen.decoding = "async";

        imagen.addEventListener("load", () => {
            contenedor.style.aspectRatio = "auto";
        });

        imagen.addEventListener("error", () => {
            imagen.remove();
            contenedor.classList.add("imagen-pendiente");
            contenedor.textContent = "Map pending";
        }, { once: true });

        contenedor.appendChild(imagen);
    }

    tarjeta.appendChild(contenedor);

    return tarjeta;
}



    // =====================================
    // CREAR COLUMNAS
    // =====================================

    function crearColumnas(cantidad) {
        const columnas = [];

        for (let i = 0; i < cantidad; i++) {
            const columna = document.createElement(
                "div"
            );

            columna.className = "columna-mapas";

            columnas.push(columna);
            galeria.appendChild(columna);
        }

        return columnas;
    }


    // =====================================
    // CANTIDAD DE COLUMNAS
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

        return resultado.sort((a, b) => {
            return new Date(b.fecha) -
                new Date(a.fecha);
        });
    }


    // =====================================
    // RENDERIZAR GALERÍA
    // =====================================

    function renderizarGaleria() {
        if (!galeria) return;

        actualizarVistaTerritorial();

        observadorVideos.disconnect();

galeria.querySelectorAll("video").forEach(video => {
    video.pause();
});

        galeria.replaceChildren();

        const resultados = obtenerMapasFiltrados(
            filtroActual
        );

        if (mensajeVacio) {
            mensajeVacio.hidden = resultados.length > 0;
        }

        if (resultados.length === 0) {
            return;
        }

        const numeroColumnas =
            obtenerNumeroColumnas();

        const columnas = crearColumnas(
            numeroColumnas
        );

        resultados.forEach((mapa, indice) => {
            const columna = columnas[
                indice % numeroColumnas
            ];

            columna.appendChild(
                crearTarjeta(mapa)
            );
        });
    }


    // =====================================
    // ACTIVAR FILTROS
    // =====================================

    filtros.forEach(boton => {
        boton.addEventListener("click", () => {
            filtroActual = boton.dataset.filtro;

            filtros.forEach(filtro => {
                const activo = filtro === boton;

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
        });
    });


    // =====================================
    // RESPONSIVE
    // =====================================

    let columnasActuales =
        obtenerNumeroColumnas();

    window.addEventListener("resize", () => {
        const nuevasColumnas =
            obtenerNumeroColumnas();

        if (nuevasColumnas !== columnasActuales) {
            columnasActuales = nuevasColumnas;
            renderizarGaleria();
        }
    });


    // =====================================
    // INICIALIZACIÓN
    // =====================================

    renderizarGaleria();

})();
