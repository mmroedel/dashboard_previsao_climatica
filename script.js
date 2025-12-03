/* =========== Logica de website de previsao do tempo =========== */
// por Murilo Röedel

        /* =========== Lógica do website de previsão do tempo =========== */
        // Mantendo sua chave API (Recomenda-se não expor em produção real)
        const API_KEY = "49fbd822241a5560db61e4c3ef5e5d9c"; 

        let mapa = null;
        let marcador = null;
        let chart = null;

        // Enter no input ativa a busca
        document.getElementById("cityInput").addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                buscarClima();
            }
        });

        // ----------------------------------------------------
        //  TEMA CLARO/ESCURO
        // ----------------------------------------------------
        function trocarTema() {
            const body = document.body;
            body.classList.toggle("dark");
        }

        // ----------------------------------------------------
        //  BUSCA POR NOME
        // ----------------------------------------------------
        async function buscarClima(cidadeDireta = null) {
            const cidadeInput = document.getElementById("cityInput");
            const cidade = cidadeDireta || cidadeInput.value;
            const errorDiv = document.getElementById("errorMsg");
            const loader = document.getElementById("loader");
            const dashboard = document.getElementById("dashboard");

            // Resetar erros
            errorDiv.innerHTML = "";
            
            if (!cidade) {
                errorDiv.innerHTML = "Por favor, digite o nome de uma cidade.";
                return;
            }

            // UI Loading
            loader.style.display = "block";
            dashboard.style.display = "none";

            const urlAtual = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${API_KEY}&units=metric&lang=pt_br`;

            try {
                const respAtual = await fetch(urlAtual);
                const climaAtual = await respAtual.json();

                if (climaAtual.cod === "404") {
                    throw new Error("Cidade não encontrada.");
                }
                
                // Sucesso: Renderizar e Mostrar Dashboard
                renderClimaAtual(climaAtual);
                atualizarMapa(climaAtual.coord.lat, climaAtual.coord.lon);
                await buscarPrevisao5Dias(cidade); // Espera a previsão também

                dashboard.style.display = "grid"; 
                // Fix para o mapa renderizar corretamente quando passa de display:none para grid
                setTimeout(() => { if(mapa) mapa.invalidateSize(); }, 200);

            } catch (error) {
                console.error(error);
                errorDiv.innerHTML = error.message || "Erro ao buscar dados. Verifique sua conexão ou a API Key.";
            } finally {
                loader.style.display = "none";
            }
        }

        // ----------------------------------------------------
        //  BUSCA POR LOCALIZAÇÃO GPS
        // ----------------------------------------------------
        function buscarPorLocalizacao() {
            const errorDiv = document.getElementById("errorMsg");
            const loader = document.getElementById("loader");
            
            errorDiv.innerHTML = "";

            if (!navigator.geolocation) {
                errorDiv.innerHTML = "Seu navegador não suporta geolocalização.";
                return;
            }

            loader.style.display = "block";

            navigator.geolocation.getCurrentPosition(success, error);

            function success(pos) {
                buscarClimaPorCoordenadas(pos.coords.latitude, pos.coords.longitude);
            }

            function error() {
                loader.style.display = "none";
                errorDiv.innerHTML = "Não foi possível acessar sua localização. Verifique as permissões.";
            }
        }

        async function buscarClimaPorCoordenadas(lat, lon) {
            const loader = document.getElementById("loader");
            const dashboard = document.getElementById("dashboard");
            
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`;

            try {
                const resp = await fetch(url);
                const data = await resp.json();

                renderClimaAtual(data);
                atualizarMapa(lat, lon);
                await buscarPrevisao5Dias(data.name);

                loader.style.display = "none";
                dashboard.style.display = "grid";
                setTimeout(() => { if(mapa) mapa.invalidateSize(); }, 200);

            } catch (error) {
                loader.style.display = "none";
                document.getElementById("errorMsg").innerHTML = "Erro ao buscar dados por GPS.";
            }
        }

        // ----------------------------------------------------
        //  RENDERIZA CLIMA ATUAL
        // ----------------------------------------------------
        function renderClimaAtual(data) {
            const desc = data.weather[0].description;
            const emoji = escolherEmoji(desc);
            const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

            document.getElementById("weatherResult").innerHTML = `
                <h2>${data.name}, ${data.sys.country}</h2>
                <div style="display:flex; justify-content:center; align-items:center;">
                    <img src="${iconUrl}" alt="${desc}">
                    <p class="temp-big">${Math.round(data.main.temp)}°C</p>
                </div>
                <div class="details">
                    <p><strong>${desc.charAt(0).toUpperCase() + desc.slice(1)}</strong></p>
                    <p><i class="fa-solid fa-droplet"></i> Umidade: ${data.main.humidity}%</p>
                    <p><i class="fa-solid fa-wind"></i> Vento: ${data.wind.speed} km/h</p>
                    <p><i class="fa-solid fa-temperature-arrow-up"></i> Máx: ${Math.round(data.main.temp_max)}°C  <i class="fa-solid fa-temperature-arrow-down"></i> Mín: ${Math.round(data.main.temp_min)}°C</p>
                </div>
            `;
        }

        // ----------------------------------------------------
        //  PREVISÃO 5 DIAS E GRÁFICO
        // ----------------------------------------------------
        async function buscarPrevisao5Dias(cidade) {
            const urlPrev = `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${API_KEY}&units=metric&lang=pt_br`;

            const resp = await fetch(urlPrev);
            const data = await resp.json();

            const diasDiv = document.getElementById("diasPrevisao");
            // Filtrar para pegar previsões próximas do meio-dia para representar o dia
            const listaFiltrada = data.list.filter(i => i.dt_txt.includes("12:00:00"));

            let labels = [];
            let temps = [];

            diasDiv.innerHTML = "";

            // Loop ajustado para pegar os dias disponíveis na lista filtrada
            listaFiltrada.forEach(dia => {
                const desc = dia.weather[0].description;
                const iconUrl = `https://openweathermap.org/img/wn/${dia.weather[0].icon}.png`;

                const dataDia = new Date(dia.dt * 1000);
                const nomeDia = dataDia.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });

                labels.push(nomeDia);
                temps.push(dia.main.temp);

                diasDiv.innerHTML += `
                    <div class="day-card">
                        <h4>${nomeDia.toUpperCase()}</h4>
                        <img src="${iconUrl}" alt="${desc}">
                        <p>${Math.round(dia.main.temp)}°C</p>
                        <p style="font-size: 0.8rem; color: var(--text-secondary)">${desc}</p>
                    </div>
                `;
            });

            renderChart(labels, temps);
        }

        // ----------------------------------------------------
        //  GRÁFICO CHART.JS
        // ----------------------------------------------------
        function renderChart(labels, temps) {
            const ctx = document.getElementById("tempChart");
            
            // Obter cor baseada no tema atual (simplificado)
            const isDark = document.body.classList.contains("dark");
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const textColor = isDark ? '#e4e6eb' : '#333';

            if (chart) chart.destroy();

            chart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Temperatura (°C)",
                        data: temps,
                        backgroundColor: "rgba(0, 123, 255, 0.2)",
                        borderColor: "#007bff",
                        borderWidth: 3,
                        pointBackgroundColor: "#fff",
                        pointBorderColor: "#007bff",
                        pointRadius: 5,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: textColor } }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        },
                        y: {
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        }
                    }
                }
            });
        }

        // ----------------------------------------------------
        //  MAPA LEAFLET
        // ----------------------------------------------------
        function atualizarMapa(lat, lon) {
            // Se o mapa ainda não foi inicializado
            if (!mapa) {
                mapa = L.map("map").setView([lat, lon], 12);

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 18,
                    attribution: '© OpenStreetMap'
                }).addTo(mapa);
            } else {
                // Se já existe, apenas move a visão
                mapa.setView([lat, lon], 12);
            }

            // Remove marcador anterior se existir
            if (marcador) marcador.remove();

            marcador = L.marker([lat, lon]).addTo(mapa)
                .bindPopup("Localização Atual")
                .openPopup();
        }

        // ----------------------------------------------------
        //  HELPER: EMOJIS (Backup caso ícone falhe)
        // ----------------------------------------------------
        function escolherEmoji(desc) {
            desc = desc.toLowerCase();
            if (desc.includes("chuva")) return "🌧️";
            if (desc.includes("garoa")) return "🌦️";
            if (desc.includes("tempestade")) return "⛈️";
            if (desc.includes("nublado")) return "☁️";
            if (desc.includes("neve")) return "❄️";
            if (desc.includes("limpo") || desc.includes("céu")) return "☀️";
            return "🌤️";
        }