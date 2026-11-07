
"use strict";

/* ===================================
   CONFIGURACIÓN DE CARRUSELES
=================================== */

const CARRUSELES = [
    {
        elemento: '[data-carousel="uno"]',
        carpeta: "carrusel_uno",
        prefijo: "home-slider-01",
        descripcion: "Komorebi digital archive"
    },
    {
        elemento: '[data-carousel="dos"]',
        carpeta: "carrusel_dos",
        prefijo: "home-slider-02",
        descripcion: "Komorebi generative map"
    }
];


/* ===================================
   CARRUSELES AUTOMÁTICOS
=================================== */

function iniciarCarrusel(configuracion) {

    const contenedor = document.querySelector(
        configuracion.elemento
    );

    if (!contenedor) return;

    const imagenes = [];

    for (let numero = 1; numero <= 10; numero++) {

        const imagen = document.createElement("img");
        const indice = String(numero).padStart(2, "0");

        imagen.src =
            `imagenes/${configuracion.carpeta}/${configuracion.prefijo}-${indice}.jpg`;

        imagen.alt =
            `${configuracion.descripcion} ${numero}`;

        imagen.loading = numero === 1 ? "eager" : "lazy";
        imagen.decoding = "async";

        imagenes.push(imagen);
    }

    contenedor.replaceChildren(...imagenes);

    let actual = 0;

    imagenes[actual].classList.add("visible");

    window.setInterval(() => {

        const siguiente = (actual + 1) % imagenes.length;

        imagenes[siguiente].classList.add("visible");
        imagenes[actual].classList.remove("visible");

        actual = siguiente;

    }, 4000);
}


/* ===================================
   INICIALIZACIÓN
=================================== */

CARRUSELES.forEach(iniciarCarrusel);
