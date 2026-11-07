
/* ===================================
   KOMOREBI — TERRITORIOS PRINCIPALES
=================================== */

(() => {
    "use strict";

    /* ===================================
       INFORMACIÓN DE LOS TERRITORIOS
    =================================== */

    const informacionTerritorios = {
        Tokyo: {
            titulo: "Tokyo - Kantō Region",
            video: "assets/tokyo.mp4",

            textos: [
                `Tokyo, the capital of Japan, is located in the Kantō region and serves as the country's main political, economic, and cultural center. Its urban landscape combines dense metropolitan districts, commercial areas, and modern infrastructure with residential neighborhoods, historic temples, and traditional spaces. This coexistence of modernity and tradition defines Tokyo's diverse identity, reflected in its architecture, cultural trends, and everyday life. Neighborhoods such as Asakusa preserve historical heritage, while Shibuya and Harajuku represent contemporary fashion, youth culture, and innovation.`,

                `Originally known as Edo, Tokyo became a major political center in 1603 under the Tokugawa shogunate. Renamed Tokyo, meaning "Eastern Capital," during the Meiji Restoration in 1868, the city underwent significant modernization. Its urban identity was further shaped by reconstruction following the 1923 Great Kantō Earthquake and World War II.`,

                `Today, Tokyo represents a constantly evolving metropolis where different historical periods and cultural expressions coexist. This identity is reflected in the metropolitan government's tourism concept, "Tokyo Tokyo: Old meets New," which highlights the relationship between Japanese heritage and contemporary innovation.`
            ],

            datos: {
                localizacion: "Kantō, Honshū Island",
                poblacion: "14 million inhabitants",
                organizacion: "23 special wards and island territories",
                caracteristicas: "Metropolis, historical heritage, and contemporary culture"
            }
        },

        Kyoto: {
            titulo: "Kyoto - Kansai Region",
            video: "assets/kyoto.mp4",

            textos: [
                `Kyoto, located in the Kansai region on Honshū Island, served as Japan's imperial capital for over a thousand years, from 794 to 1868. Founded as Heian-kyō, meaning "Capital of Peace and Tranquility," the city became a major political and cultural center during the Heian period, contributing to the development of Japanese literature, arts, and imperial traditions. Its historical significance is reflected in its Buddhist temples, Shinto shrines, traditional gardens, and historic neighborhoods, which continue to shape its cultural identity.`,

                `Kyoto is particularly recognized for preserving and transmitting Japanese cultural heritage, including tea ceremonies, traditional crafts, and performing arts. However, the city also embraces contemporary life through its universities, creative industries, and commercial districts. This coexistence of tradition and modernity reflects an evolving cultural identity in which historical practices are continuously adapted and reinterpreted. In 1994, UNESCO designated the Historic Monuments of Ancient Kyoto as a World Heritage Site, recognizing 17 cultural properties across Kyoto, Uji, and Ōtsu and reinforcing the city's international significance as a symbol of Japanese heritage.`
            ],

            datos: {
                localizacion: "Kansai, Honshū Island",
                poblacion: "2.5 million inhabitants",
                organizacion: "Kyoto City and other municipalities in the prefecture",
                caracteristicas: "Historical heritage, cultural traditions, urban areas, and mountainous landscapes"
            }
        },

        Osaka: {
            titulo: "Osaka - Kansai Region",
            video: "assets/osaka.mp4",

            textos: [
                `Osaka, located in the Kansai region on Honshū Island, is one of Japan's major economic and urban centers. Originally known as Naniwa, it developed as an important port and trading hub, briefly serving as an imperial capital during the 7th century. During the Edo period (1603–1868), Osaka became a leading commercial center, particularly for rice distribution, earning the nickname "the Nation's Kitchen." Its historical connection to trade and food continues to shape its identity, alongside landmarks such as Osaka Castle, residential neighborhoods, and surrounding natural landscapes.`,

                `Osaka's cultural identity is closely associated with commerce, gastronomy, entertainment, and popular culture. Districts such as Dōtonbori and Namba are known for their vibrant streets, illuminated advertisements, restaurants, and entertainment venues. The city also has a strong tradition of performing arts and humor, particularly manzai, a form of conversational comedy. Its culinary culture is represented by the concept of "kuidaore" (食い倒れ), commonly interpreted as "eating until you go bankrupt," reflecting the importance of food in local life. Specialties such as takoyaki and okonomiyaki have established Osaka as one of Japan's leading gastronomic destinations.`
            ],

            datos: {
                localizacion: "Kansai, Honshū Island",
                poblacion: "8.8 million inhabitants",
                organizacion: "Osaka City, Sakai City and other municipalities in the prefecture",
                caracteristicas: "Large urban concentration, commercial activity, gastronomy, and historical heritage"
            }
        },

        "Hokkaidō": {
            titulo: "Hokkaidō - northern Japan",
            video: "assets/hokkaido.mp4",

            textos: [
                `Hokkaidō, located in northern Japan, is the country's second-largest island and one of its main prefectures. Its landscape is characterized by extensive natural areas, mountain ranges, forests, and agricultural land, alongside a cold climate with long, snowy winters. Historically known as Ezo or Ezochi, the region was inhabited by the indigenous Ainu people, whose culture and traditions remain an essential part of its identity. In 1869, during the Meiji Restoration, the territory was officially renamed Hokkaidō, marking the beginning of major agricultural development and territorial transformation under the Japanese government.`,

                `Hokkaidō's cultural identity is closely connected to its natural environment, Ainu heritage, and contemporary development. While cities such as Sapporo represent urban growth and modern culture, the region is also known for its low population density, national parks, agriculture, fishing, and seasonal tourism. Ainu traditions, including crafts, music, and spiritual beliefs, contribute to its cultural diversity. This heritage is represented by Upopoy, the National Ainu Museum and Park, inaugurated in 2020 in Shiraoi. Dedicated to preserving and revitalizing Ainu culture, it highlights the importance of recognizing Japan's indigenous heritage and cultural diversity beyond its dominant national identity.`
            ],

            datos: {
                localizacion: "Northern Japan, island of Hokkaidō",
                poblacion: "5.1 million inhabitants",
                organizacion: "Sapporo, the main city, and other municipalities distributed throughout the prefecture",
                caracteristicas: "Vast natural landscapes, cold climate, Ainu cultural heritage, agriculture, and tourism"
            }
        },

        Okinawa: {
            titulo: "Okinawa - southwestern Japan",
            video: "assets/okinawa.mp4",

            textos: [
                `Okinawa, located in southwestern Japan, is a prefecture comprising numerous islands of the Ryūkyū Archipelago, between the East China Sea and the Pacific Ocean. Its subtropical climate, coastal landscapes, and geographical location distinguish it from mainland Japan. For centuries, the islands formed part of the Ryūkyū Kingdom (1429–1879), an independent political and cultural entity that maintained important commercial and cultural connections with China, Japan, and other Asian territories. In 1879, Okinawa was incorporated into Japan, later experiencing major transformations during World War II and subsequent American administration, which lasted until 1972.`,

                `Okinawa's cultural identity is deeply connected to its Ryūkyū heritage, local traditions, and historical diversity. Its distinctive music, dance, crafts, cuisine, and architecture reflect centuries of cultural exchange, while the urban development of Naha, coastal tourism, and the presence of U.S. military bases shape its contemporary identity. Beyond its international image as a tropical destination, Okinawa preserves a unique cultural legacy. In 2000, UNESCO designated the Gusuku Sites and Related Properties of the Kingdom of Ryūkyū as a World Heritage Site, recognizing nine cultural properties, including castle ruins, sacred sites, and historic gardens. Among them, Shuri Castle stands as one of Okinawa's most significant historical symbols.`
            ],

            datos: {
                localizacion: "Southwestern Japan, Ryūkyū Archipelago",
                poblacion: "1.5 million inhabitants",
                organizacion: "Naha City and other municipalities spread across\nnumerous islands",
                caracteristicas: "Subtropical climate, Ryūkyū cultural heritage, tourism, and island diversity"
            }
        }
    };

    /* ===================================
       PERFILES TERRITORIALES
    =================================== */

    const perfilesTerritoriales = {
        Tokyo: {
            modernidad: 85,
            urbanizacion: 85,
            densidad: 95,
            envejecimiento: 60,
            turismo: 95,
            relieve: 55
        },

        Kyoto: {
            modernidad: 30,
            urbanizacion: 40,
            densidad: 50,
            envejecimiento: 70,
            turismo: 95,
            relieve: 75
        },

        Osaka: {
            modernidad: 80,
            urbanizacion: 85,
            densidad: 90,
            envejecimiento: 65,
            turismo: 90,
            relieve: 25
        },

        "Hokkaidō": {
            modernidad: 40,
            urbanizacion: 15,
            densidad: 10,
            envejecimiento: 80,
            turismo: 75,
            relieve: 85
        },

        Okinawa: {
            modernidad: 40,
            urbanizacion: 35,
            densidad: 50,
            envejecimiento: 40,
            turismo: 90,
            relieve: 55
        }
    };

    /* ===================================
       ELEMENTOS
    =================================== */

    const destacado = document.getElementById(
        "territorio-destacado"
    );

    const contenedorVideo = document.getElementById(
        "mapa-territorial"
    );

    const boton = document.getElementById(
        "territorio-principal-boton"
    );

    const nombre = document.getElementById(
        "territorio-principal-nombre"
    );

    const modal = document.getElementById(
        "territorio-principal-modal"
    );

    const fondo = document.getElementById(
        "territorio-principal-fondo"
    );

    const cerrar = document.getElementById(
        "territorio-principal-cerrar"
    );

    const titulo = document.getElementById(
        "territorio-principal-titulo"
    );

    const videoModal = document.getElementById(
        "territorio-principal-video"
    );

    const textos = document.getElementById(
        "territorio-principal-textos"
    );

    const campos = {
        localizacion: document.getElementById(
            "territorio-dato-localizacion"
        ),

        poblacion: document.getElementById(
            "territorio-dato-poblacion"
        ),

        organizacion: document.getElementById(
            "territorio-dato-organizacion"
        ),

        caracteristicas: document.getElementById(
            "territorio-dato-caracteristicas"
        )
    };

    const camposPorcentajes = {
        modernidad: document.getElementById(
            "perfil-modernidad"
        ),

        envejecimiento: document.getElementById(
            "perfil-envejecimiento"
        ),

        urbanizacion: document.getElementById(
            "perfil-urbanizacion"
        ),

        turismo: document.getElementById(
            "perfil-turismo"
        ),

        densidad: document.getElementById(
            "perfil-densidad"
        ),

        relieve: document.getElementById(
            "perfil-relieve"
        )
    };

    let territorioActual = null;
    let focoAnterior = null;

    /* ===================================
       SINCRONIZAR VÍDEO PRINCIPAL
    =================================== */

    function sincronizarTerritorio() {
        const video = contenedorVideo?.querySelector(
            "video[data-territorio]"
        );

        const territorio = video?.dataset.territorio;

        const valido = Boolean(
            territorio &&
            informacionTerritorios[territorio]
        );

        territorioActual = valido ? territorio : null;

        boton.hidden = !valido;

        if (!valido) {
            nombre.textContent = "";
            return;
        }

        nombre.textContent = `Territory of ${territorio}`;

        boton.setAttribute(
            "aria-label",
            `See more information about ${territorio}`
        );
    }

    /* ===================================
       ACTUALIZAR PORCENTAJES
    =================================== */

    function actualizarPorcentajes(territorio) {
        const perfil = perfilesTerritoriales[territorio];

        if (!perfil) return;

        const valores = {
            modernidad: `Modernity: ${perfil.modernidad}%`,

            envejecimiento:
                `Population aging: ${perfil.envejecimiento}%`,

            urbanizacion:
                `Urbanization: ${perfil.urbanizacion}%`,

            turismo: `Tourism: ${perfil.turismo}%`,

            densidad:
                `Population density: ${perfil.densidad}%`,

            relieve:
                `Mountainous terrain: ${perfil.relieve}%`
        };

        Object.entries(camposPorcentajes).forEach(
            ([clave, elemento]) => {
                if (elemento) {
                    elemento.textContent = valores[clave];
                }
            }
        );
    }

    /* ===================================
       ABRIR BANNER
    =================================== */

    function abrirBanner() {
        const informacion =
            informacionTerritorios[territorioActual];

        if (!informacion || !modal.hidden) return;

        focoAnterior = document.activeElement;

        titulo.textContent = informacion.titulo;

        actualizarPorcentajes(territorioActual);

        textos.replaceChildren();

        informacion.textos.forEach(parrafo => {
            const elemento = document.createElement("p");

            elemento.textContent = parrafo;

            textos.appendChild(elemento);
        });

        Object.entries(campos).forEach(
            ([clave, elemento]) => {
                if (elemento) {
                    elemento.textContent =
                        informacion.datos[clave] || "";
                }
            }
        );

        videoModal.pause();

        videoModal.src = informacion.video;
        videoModal.load();

        videoModal.setAttribute(
            "aria-label",
            `Animated territory of ${territorioActual}`
        );

        modal.hidden = false;

        document.body.classList.add(
            "territorio-principal-abierto"
        );

        videoModal.play().catch(() => {});

        cerrar.focus();
    }

    /* ===================================
       CERRAR BANNER
    =================================== */

    function cerrarBanner() {
        if (modal.hidden) return;

        modal.hidden = true;

        document.body.classList.remove(
            "territorio-principal-abierto"
        );

        videoModal.pause();

        videoModal.removeAttribute("src");
        videoModal.load();

        if (
            focoAnterior &&
            focoAnterior.isConnected
        ) {
            focoAnterior.focus();
        }

        focoAnterior = null;
    }

    /* ===================================
       EVENTOS
    =================================== */

    boton.addEventListener(
        "click",
        abrirBanner
    );

    cerrar.addEventListener(
        "click",
        cerrarBanner
    );

    fondo.addEventListener(
        "click",
        cerrarBanner
    );

    document.addEventListener("keydown", evento => {
        if (modal.hidden) return;

        if (evento.key === "Escape") {
            evento.preventDefault();
            cerrarBanner();
            return;
        }

        if (evento.key !== "Tab") return;

        const elementos = Array.from(
            modal.querySelectorAll(
                "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"
            )
        ).filter(elemento =>
            elemento.getClientRects().length > 0
        );

        if (!elementos.length) return;

        const primero = elementos[0];
        const ultimo = elementos[elementos.length - 1];

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
       OBSERVAR CAMBIOS DE TERRITORIO
    =================================== */

    const observador = new MutationObserver(
        sincronizarTerritorio
    );

    observador.observe(contenedorVideo, {
        childList: true
    });

    sincronizarTerritorio();

})();
