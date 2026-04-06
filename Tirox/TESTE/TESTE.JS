// função que soma dois números
function soma(a, b) {
    return a + b;
}

// Calcula o pace médio (min/km) e também retorna no formato mm:ss por km.
function calcularPaceMedio(distanciaKm, tempoMinutos) {
    const distancia = Number(distanciaKm);
    const tempo = Number(tempoMinutos);

    if (!Number.isFinite(distancia) || !Number.isFinite(tempo) || distancia <= 0 || tempo <= 0) {
        throw new Error("Informe distância e tempo com valores maiores que zero.");
    }

    const paceMinPorKm = tempo / distancia;
    const minutos = Math.floor(paceMinPorKm);
    const segundos = Math.round((paceMinPorKm - minutos) * 60);

    const minutosAjustados = segundos === 60 ? minutos + 1 : minutos;
    const segundosAjustados = segundos === 60 ? 0 : segundos;

    return {
        paceMinPorKm,
        paceFormatado: `${String(minutosAjustados).padStart(2, "0")}:${String(segundosAjustados).padStart(2, "0")}/km`
    };
}

// Componente React com geolocalização + mapa OpenStreetMap (sem JSX para manter JS válido).
function MapaComGPS() {
    if (typeof React === "undefined") {
        return null;
    }

    const [posicao, setPosicao] = React.useState(null);
    const [erro, setErro] = React.useState("");

    React.useEffect(function () {
        if (!navigator.geolocation) {
            setErro("Geolocalização não é suportada neste navegador.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (coords) {
                setPosicao({
                    latitude: coords.coords.latitude,
                    longitude: coords.coords.longitude
                });
            },
            function () {
                setErro("Não foi possível obter a localização. Verifique permissões de GPS.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    if (erro) {
        return React.createElement("p", null, erro);
    }

    if (!posicao) {
        return React.createElement("p", null, "Obtendo localização...");
    }

    const { latitude, longitude } = posicao;
    const delta = 0.01;
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
    const mapaUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`;

    return React.createElement(
        "div",
        { style: { width: "100%", maxWidth: "720px" } },
        React.createElement("h3", null, "Sua localização atual"),
        React.createElement("p", null, `Lat: ${latitude.toFixed(6)} | Lng: ${longitude.toFixed(6)}`),
        React.createElement("iframe", {
            title: "Mapa com GPS",
            src: mapaUrl,
            width: "100%",
            height: "420",
            style: { border: 0, borderRadius: "8px" },
            loading: "lazy",
            referrerPolicy: "no-referrer-when-downgrade"
        })
    );
}