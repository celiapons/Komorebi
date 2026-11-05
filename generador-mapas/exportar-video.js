
/* =========================================
   KOMOREBI — EXPORTAR VÍDEO

   - Captura directa de la pestaña
   - Recorte del mapa
   - Máximo 10 segundos
   - 30 FPS
   - Alta calidad WebM
   - Indicador rojo parpadeante

   No modifica los sliders.
========================================= */

(() => {
    "use strict";

    const CONFIG = {
        duracionMaxima: 30000,
        fps: 30,
        bitrate: 16000000,
        escalaMaxima: 2,
        dimensionMaxima: 3840,
        nombreArchivo: "KOMOREBI-recording.webm"
    };

    let grabando = false;
    let iniciando = false;

    let grabadora = null;
    let flujoPantalla = null;
    let flujoSalida = null;

    let videoFuente = null;
    let canvasSalida = null;
    let contextoSalida = null;

    let animacion = null;
    let temporizador = null;
    let fragmentos = [];

    let boton = null;
    let indicador = null;

    let inicio = 0;
    let ultimoFotograma = 0;


    // =====================================
    // INDICADOR DE GRABACIÓN
    // =====================================

    function crearIndicador() {
        boton = document.getElementById(
            "descargar-video"
        );

        if (!boton) return;

        if (getComputedStyle(boton).position === "static") {
            boton.style.position = "relative";
        }

        indicador = document.createElement("span");

        indicador.className =
            "komorebi-indicador-grabacion";

        indicador.setAttribute(
            "aria-hidden",
            "true"
        );

       indicador.style.cssText = `
    position: static;
    display: inline-block;
    flex: 0 0 7px;
    width: 7px;
    height: 7px;
    margin-left: 5px;
    border-radius: 50%;
    background: #e33131;
    vertical-align: middle;
    opacity: 0;
    pointer-events: none;
`;

        boton.appendChild(indicador);

        const estilo = document.createElement("style");

        estilo.textContent = `
            @keyframes komorebiParpadeo {
                0%, 100% {
                    opacity: 1;
                }

                50% {
                    opacity: 0.2;
                }
            }

            #descargar-video.komorebi-grabando
            .komorebi-indicador-grabacion {
                animation:
                    komorebiParpadeo 1s infinite;
            }
        `;

        document.head.appendChild(estilo);
    }

    function actualizarIndicador(activo) {
        if (!boton) return;

        boton.classList.toggle(
            "komorebi-grabando",
            activo
        );

        boton.setAttribute(
            "aria-pressed",
            String(activo)
        );
    }


    // =====================================
    // FORMATO DE VÍDEO
    // =====================================

    function obtenerFormato() {
        if (typeof MediaRecorder === "undefined") {
            throw new Error(
                "MediaRecorder no está disponible."
            );
        }

        const formatos = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm"
        ];

        const formato = formatos.find(tipo =>
            MediaRecorder.isTypeSupported(tipo)
        );

        if (!formato) {
            throw new Error(
                "No se encontró un formato compatible."
            );
        }

        return formato;
    }


    // =====================================
    // DESCARGAR ARCHIVO
    // =====================================

    function descargarBlob(blob) {
        if (!blob || blob.size === 0) {
            throw new Error(
                "El vídeo generado está vacío."
            );
        }

        const url = URL.createObjectURL(blob);

        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = CONFIG.nombreArchivo;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 30000);
    }


    // =====================================
    // OBTENER ÁREA DEL MAPA
    // =====================================

    function obtenerAreaMapa() {
        const lienzo = document.getElementById(
            "lienzo"
        );

        if (!lienzo) {
            throw new Error(
                "No se encontró el contenedor #lienzo."
            );
        }

        return lienzo.getBoundingClientRect();
    }


    // =====================================
    // CREAR CANVAS DE SALIDA
    // =====================================

    function crearCanvasSalida() {
        const area = obtenerAreaMapa();

        const escala = Math.min(
            CONFIG.escalaMaxima,
            CONFIG.dimensionMaxima /
                Math.max(area.width, area.height)
        );

        const canvas = document.createElement(
            "canvas"
        );

        canvas.width = Math.max(
            2,
            Math.round(area.width * escala)
        );

        canvas.height = Math.max(
            2,
            Math.round(area.height * escala)
        );

        canvas.width += canvas.width % 2;
        canvas.height += canvas.height % 2;

        return canvas;
    }


    // =====================================
    // DIBUJAR FOTOGRAMA
    // =====================================

    function dibujarFotograma() {
        if (
            !grabando ||
            !videoFuente ||
            !canvasSalida ||
            !contextoSalida
        ) {
            return;
        }

        if (videoFuente.readyState < 2) {
            return;
        }

        const area = obtenerAreaMapa();

        const escalaX =
            videoFuente.videoWidth /
            window.innerWidth;

        const escalaY =
            videoFuente.videoHeight /
            window.innerHeight;

        const origenX = Math.max(
            0,
            area.left * escalaX
        );

        const origenY = Math.max(
            0,
            area.top * escalaY
        );

        const anchoOrigen = Math.min(
            area.width * escalaX,
            videoFuente.videoWidth - origenX
        );

        const altoOrigen = Math.min(
            area.height * escalaY,
            videoFuente.videoHeight - origenY
        );

        if (
            anchoOrigen <= 0 ||
            altoOrigen <= 0
        ) {
            return;
        }

        contextoSalida.fillStyle = "#ffffff";

        contextoSalida.fillRect(
            0,
            0,
            canvasSalida.width,
            canvasSalida.height
        );

        contextoSalida.drawImage(
            videoFuente,
            origenX,
            origenY,
            anchoOrigen,
            altoOrigen,
            0,
            0,
            canvasSalida.width,
            canvasSalida.height
        );
    }


    // =====================================
    // ANIMACIÓN
    // =====================================

    function animar(tiempo) {
        if (!grabando) return;

        if (
            performance.now() - inicio >=
            CONFIG.duracionMaxima
        ) {
            detenerGrabacion();
            return;
        }

        const intervalo = 1000 / CONFIG.fps;

        if (
            tiempo - ultimoFotograma >= intervalo
        ) {
            ultimoFotograma = tiempo;
            dibujarFotograma();
        }

        animacion = requestAnimationFrame(animar);
    }


    // =====================================
    // LIMPIAR RECURSOS
    // =====================================

    function limpiar() {
        if (animacion !== null) {
            cancelAnimationFrame(animacion);
            animacion = null;
        }

        if (temporizador !== null) {
            clearTimeout(temporizador);
            temporizador = null;
        }

        if (flujoSalida) {
            flujoSalida.getTracks().forEach(
                pista => pista.stop()
            );
        }

        if (flujoPantalla) {
            flujoPantalla.getTracks().forEach(
                pista => pista.stop()
            );
        }

        if (videoFuente) {
            videoFuente.pause();
            videoFuente.srcObject = null;
        }

        flujoPantalla = null;
        flujoSalida = null;
        videoFuente = null;
        canvasSalida = null;
        contextoSalida = null;
        grabadora = null;

        grabando = false;
        iniciando = false;

        actualizarIndicador(false);
    }


    // =====================================
    // INICIAR GRABACIÓN
    // =====================================

    async function iniciarGrabacion() {
        if (grabando || iniciando) return;

        iniciando = true;

        try {
            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getDisplayMedia
            ) {
                throw new Error(
                    "Este navegador no permite capturar pestañas."
                );
            }

            const formato = obtenerFormato();

            flujoPantalla =
                await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        frameRate: CONFIG.fps
                    },
                    audio: false,
                    preferCurrentTab: true
                });

            videoFuente = document.createElement(
                "video"
            );

            videoFuente.srcObject = flujoPantalla;
            videoFuente.muted = true;
            videoFuente.playsInline = true;

            await videoFuente.play();

            if (
                !videoFuente.videoWidth ||
                !videoFuente.videoHeight
            ) {
                throw new Error(
                    "La captura no tiene dimensiones válidas."
                );
            }

            canvasSalida = crearCanvasSalida();

            contextoSalida = canvasSalida.getContext(
                "2d",
                { alpha: false }
            );

            if (!contextoSalida) {
                throw new Error(
                    "No se pudo crear el canvas de vídeo."
                );
            }

            contextoSalida.fillStyle = "#ffffff";

            contextoSalida.fillRect(
                0,
                0,
                canvasSalida.width,
                canvasSalida.height
            );

            flujoSalida = canvasSalida.captureStream(
                CONFIG.fps
            );

            fragmentos = [];

            grabadora = new MediaRecorder(
                flujoSalida,
                {
                    mimeType: formato,
                    videoBitsPerSecond: CONFIG.bitrate
                }
            );

            grabadora.ondataavailable = evento => {
                if (
                    evento.data &&
                    evento.data.size > 0
                ) {
                    fragmentos.push(evento.data);
                }
            };

            grabadora.onstop = () => {
                try {
                    if (fragmentos.length > 0) {
                        const blob = new Blob(
                            fragmentos,
                            { type: formato }
                        );

                        descargarBlob(blob);

                        console.info(
                            "KOMOREBI — Vídeo descargado:",
                            (blob.size / 1048576).toFixed(2) +
                            " MB"
                        );
                    }
                } catch (error) {
                    console.error(
                        "KOMOREBI — Error al descargar:",
                        error
                    );
                } finally {
                    fragmentos = [];
                    limpiar();
                }
            };

            grabadora.onerror = evento => {
                console.error(
                    "KOMOREBI — Error de grabación:",
                    evento
                );

                detenerGrabacion();
            };

            const pistaPantalla =
                flujoPantalla.getVideoTracks()[0];

            pistaPantalla.addEventListener(
                "ended",
                detenerGrabacion
            );

            grabadora.start(250);

            grabando = true;
            iniciando = false;

            inicio = performance.now();
            ultimoFotograma = 0;

            actualizarIndicador(true);

            animacion = requestAnimationFrame(
                animar
            );

            temporizador = setTimeout(
                detenerGrabacion,
                CONFIG.duracionMaxima
            );

            console.info(
                "KOMOREBI — Grabación iniciada."
            );

        } catch (error) {
            console.error(
                "KOMOREBI — Error al iniciar vídeo:",
                error
            );

            limpiar();

            if (error.name !== "NotAllowedError") {
                alert(
                    "No se pudo iniciar la grabación."
                );
            }
        }
    }


    // =====================================
    // DETENER GRABACIÓN
    // =====================================

    function detenerGrabacion() {
        if (!grabando) return;

        grabando = false;
        actualizarIndicador(false);

        if (animacion !== null) {
            cancelAnimationFrame(animacion);
            animacion = null;
        }

        if (temporizador !== null) {
            clearTimeout(temporizador);
            temporizador = null;
        }

        if (
            grabadora &&
            grabadora.state !== "inactive"
        ) {
            grabadora.stop();
        } else {
            limpiar();
        }
    }


    // =====================================
    // BOTÓN DE VÍDEO
    // =====================================

    function alternarGrabacion() {
        if (grabando) {
            detenerGrabacion();
        } else {
            iniciarGrabacion();
        }
    }


    // =====================================
    // INICIALIZACIÓN
    // =====================================

    function inicializar() {
        crearIndicador();

        if (!boton) {
            console.warn(
                "KOMOREBI — No se encontró #descargar-video"
            );
            return;
        }

        boton.addEventListener(
            "click",
            alternarGrabacion
        );
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
