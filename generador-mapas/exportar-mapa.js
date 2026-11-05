
/* =========================================
   KOMOREBI — EXPORTAR CAPTURA

   - JPEG de alta calidad
   - Resolución 4x
   - Fondo blanco
   - Conserva SVG, filtros y partículas
   - No modifica los sliders
========================================= */

(() => {
    "use strict";

    const CONFIG = {
        escalaCaptura: 4,
        calidadJPEG: 1,
        dimensionMaxima: 16384,
        pixelesMaximos: 60000000,
        fondo: "#ffffff",
        nombreArchivo: "KOMOREBI-capture.jpg"
    };

    const NS = "http://www.w3.org/2000/svg";

    function obtenerMapa() {
        const lienzo = document.getElementById("lienzo");

        if (!lienzo) {
            throw new Error("No se encontró #lienzo.");
        }

        const svg = Array.from(
            lienzo.querySelectorAll("svg")
        ).find(elemento => {
            const estilo = getComputedStyle(elemento);

            return (
                estilo.display !== "none" &&
                estilo.visibility !== "hidden"
            );
        });

        if (svg) {
            return {
                tipo: "svg",
                elemento: svg
            };
        }

        const canvas = lienzo.querySelector("canvas");

        if (canvas) {
            return {
                tipo: "canvas",
                elemento: canvas
            };
        }

        throw new Error("No se encontró el mapa.");
    }

    function obtenerDimensiones(mapa) {
        const elemento = mapa.elemento;

        if (mapa.tipo === "canvas") {
            return {
                ancho: elemento.width,
                alto: elemento.height,
                x: 0,
                y: 0
            };
        }

        const viewBox = elemento.viewBox.baseVal;

        if (viewBox.width > 0 && viewBox.height > 0) {
            return {
                ancho: viewBox.width,
                alto: viewBox.height,
                x: viewBox.x,
                y: viewBox.y
            };
        }

        const rect = elemento.getBoundingClientRect();

        return {
            ancho: Math.max(1, rect.width),
            alto: Math.max(1, rect.height),
            x: 0,
            y: 0
        };
    }

    function calcularResolucion(dimensiones) {
        const anchoDeseado =
            dimensiones.ancho * CONFIG.escalaCaptura;

        const altoDeseado =
            dimensiones.alto * CONFIG.escalaCaptura;

        const ajusteDimension = Math.min(
            1,
            CONFIG.dimensionMaxima / anchoDeseado,
            CONFIG.dimensionMaxima / altoDeseado
        );

        const ajustePixeles = Math.min(
            1,
            Math.sqrt(
                CONFIG.pixelesMaximos /
                (anchoDeseado * altoDeseado)
            )
        );

        const ajuste = Math.min(
            ajusteDimension,
            ajustePixeles
        );

        return {
            ancho: Math.max(
                1,
                Math.floor(anchoDeseado * ajuste)
            ),
            alto: Math.max(
                1,
                Math.floor(altoDeseado * ajuste)
            )
        };
    }

    function copiarEstilosSVG(original, copia) {
        const originales = [
            original,
            ...original.querySelectorAll("*")
        ];

        const copias = [
            copia,
            ...copia.querySelectorAll("*")
        ];

        const propiedades = [
            "fill",
            "fill-opacity",
            "stroke",
            "stroke-width",
            "stroke-opacity",
            "stroke-linecap",
            "stroke-linejoin",
            "stroke-dasharray",
            "opacity",
            "filter",
            "mix-blend-mode",
            "display",
            "visibility",
            "paint-order",
            "vector-effect"
        ];

        for (
            let i = 0;
            i < originales.length &&
            i < copias.length;
            i++
        ) {
            const estilo = getComputedStyle(originales[i]);

            for (const propiedad of propiedades) {
                const valor = estilo.getPropertyValue(
                    propiedad
                );

                if (valor) {
                    copias[i].style.setProperty(
                        propiedad,
                        valor
                    );
                }
            }
        }
    }

    function prepararSVG(svg, dimensiones) {
        const copia = svg.cloneNode(true);

        copiarEstilosSVG(svg, copia);

        copia.setAttribute("xmlns", NS);
        copia.setAttribute(
            "xmlns:xlink",
            "http://www.w3.org/1999/xlink"
        );

        copia.setAttribute(
            "width",
            dimensiones.ancho
        );

        copia.setAttribute(
            "height",
            dimensiones.alto
        );

        copia.setAttribute(
            "viewBox",
            `${dimensiones.x} ${dimensiones.y} ` +
            `${dimensiones.ancho} ${dimensiones.alto}`
        );

        copia.setAttribute(
            "preserveAspectRatio",
            svg.getAttribute("preserveAspectRatio") ||
            "xMidYMid meet"
        );

        return copia;
    }

    function svgAImagen(svg, dimensiones) {
        return new Promise((resolve, reject) => {
            const copia = prepararSVG(
                svg,
                dimensiones
            );

            const contenido = new XMLSerializer()
                .serializeToString(copia);

            const blob = new Blob(
                [contenido],
                {
                    type: "image/svg+xml;charset=utf-8"
                }
            );

            const url = URL.createObjectURL(blob);
            const imagen = new Image();

            imagen.onload = () => {
                URL.revokeObjectURL(url);
                resolve(imagen);
            };

            imagen.onerror = () => {
                URL.revokeObjectURL(url);

                reject(new Error(
                    "No se pudo convertir el SVG en imagen."
                ));
            };

            imagen.src = url;
        });
    }

    function crearCanvas(ancho, alto) {
        const canvas = document.createElement("canvas");

        canvas.width = ancho;
        canvas.height = alto;

        return canvas;
    }

    async function renderizarMapa(canvas, ctx, mapa) {
        ctx.fillStyle = CONFIG.fondo;

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        if (mapa.tipo === "canvas") {
            ctx.drawImage(
                mapa.elemento,
                0,
                0,
                canvas.width,
                canvas.height
            );

            return;
        }

        const dimensiones = obtenerDimensiones(mapa);

        const imagen = await svgAImagen(
            mapa.elemento,
            dimensiones
        );

        ctx.drawImage(
            imagen,
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    function canvasABlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => {
                    if (blob && blob.size > 0) {
                        resolve(blob);
                    } else {
                        reject(new Error(
                            "No se pudo generar el JPEG."
                        ));
                    }
                },
                "image/jpeg",
                CONFIG.calidadJPEG
            );
        });
    }

    function descargarBlob(blob, nombre) {
        const url = URL.createObjectURL(blob);

        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = nombre;
        enlace.style.display = "none";

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 30000);
    }

    async function descargarCaptura() {
        const boton = document.getElementById(
            "descargar-imagen"
        );

        if (!boton || boton.disabled) return;

        boton.disabled = true;

        try {
            const mapa = obtenerMapa();
            const dimensiones = obtenerDimensiones(mapa);
            const resolucion = calcularResolucion(
                dimensiones
            );

            const canvas = crearCanvas(
                resolucion.ancho,
                resolucion.alto
            );

            const ctx = canvas.getContext("2d", {
                alpha: false
            });

            if (!ctx) {
                throw new Error(
                    "No se pudo crear el canvas."
                );
            }

            await renderizarMapa(
                canvas,
                ctx,
                mapa
            );

            const blob = await canvasABlob(canvas);

            descargarBlob(
                blob,
                CONFIG.nombreArchivo
            );

            console.info(
                "KOMOREBI — JPEG descargado:",
                `${canvas.width} × ${canvas.height}px`
            );

        } catch (error) {
            console.error(
                "KOMOREBI — Error de captura:",
                error
            );

            alert(
                "No se pudo descargar la captura JPEG."
            );

        } finally {
            boton.disabled = false;
        }
    }

    function inicializar() {
        const boton = document.getElementById(
            "descargar-imagen"
        );

        if (boton) {
            boton.addEventListener(
                "click",
                descargarCaptura
            );
        }
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
