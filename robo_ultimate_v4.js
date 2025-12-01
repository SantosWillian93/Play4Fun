const fs = require('fs');
const crypto = require('crypto');

// ======================================================
// 1. CONFIGURAÇÕES
// ======================================================
const CONFIG = {
    rakuten: {
        clientId: process.env.RAKUTEN_CLIENT_ID,
        clientSecret: process.env.RAKUTEN_CLIENT_SECRET,
        scopeId: "4473159",
        midNuuvem: "46796"
    },
    shopee: {
        appId: "18304020314",
        appSecret: process.env.SHOPEE_APP_SECRET,
        apiUrl: "https://open-api.affiliate.shopee.com.br/graphql",
        // LISTA LIMPA E FOCADA EM HARDWARE
        keywords: [
            "Teclado Mecânico Gamer",
            "Mouse Gamer",
            "Headset Gamer",
            "Monitor Gamer 144hz",
            "Controle PC Sem Fio",
            "Mousepad Gamer",
            "Suporte Headset",
            "Microfone Gamer"
        ]
    },
    // O robô vai escolher UM desses por dia para ser o "Destaque"
    jogosFavoritos: [
        "Elden Ring",
        "Resident Evil 4",
        "God of War",
        "Black Myth",
        "Silent Hill 2",
        "Cyberpunk 2077",
        "Red Dead Redemption 2"
    ],
    criterios: {
        descontoAlto: 60, // Só mostra no "Garimpo" se tiver mais de 60% de desconto
    }
};

// ======================================================
// 2. UTILITÁRIOS
// ======================================================
function extrairTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'g');
    const resultados = [];
    let match;
    while ((match = regex.exec(xml)) !== null) { resultados.push(match[1]); }
    return resultados;
}

const formatarMoeda = (valor) => parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Função para embaralhar lista (Fisher-Yates Shuffle)
function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ======================================================
// 3. MÓDULO SHOPEE (FOCADO)
// ======================================================
async function buscarShopee() {
    const termoSorteado = CONFIG.shopee.keywords[Math.floor(Math.random() * CONFIG.shopee.keywords.length)];
    console.log(`🟠 Shopee: Buscando "${termoSorteado}"...`);
    
    const query = {
        "query": `
        {
            productOfferV2(
                page: 1, 
                limit: 6, 
                keyword: "${termoSorteado}", 
                sortType: 2
            ) { 
                nodes {
                    productName
                    price
                    imageUrl
                    offerLink
                    productLink
                    priceDiscountRate
                    sales
                    ratingStar
                }
            }
        }`
    };

    const payload = JSON.stringify(query);
    const ts = Math.floor(Date.now() / 1000).toString();
    const factor = CONFIG.shopee.appId + ts + payload + CONFIG.shopee.appSecret;
    const signature = crypto.createHash('sha256').update(factor).digest('hex');

    let cardsHTML = "";

    try {
        const response = await fetch(CONFIG.shopee.apiUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `SHA256 Credential=${CONFIG.shopee.appId}, Timestamp=${ts}, Signature=${signature}`
            },
            body: payload
        });

        if (!response.ok) throw new Error(`Erro HTTP Shopee: ${response.status}`);
        const json = await response.json();
        const ofertas = json.data?.productOfferV2?.nodes || [];

        if (ofertas.length === 0) return "<p style='text-align:center; color:#aaa'>Sem ofertas no momento.</p>";

        ofertas.forEach(item => {
            const linkFinal = item.offerLink || item.productLink;
            const preco = parseFloat(item.price);
            const desconto = item.priceDiscountRate ? Math.round(parseFloat(item.priceDiscountRate)) : 0;
            const vendas = item.sales || 0;
            const estrelas = item.ratingStar || "5.0";
            const nomeCurto = item.productName.length > 55 ? item.productName.substring(0, 55) + "..." : item.productName;

            const tagDesconto = desconto > 0 
                ? `<span class="discount-tag" style="background: #ee4d2d;">-${desconto}%</span>` 
                : `<span class="discount-tag" style="background: #ee4d2d;">Shopee</span>`;

            cardsHTML += `
            <div class="offer-card">
                <div class="offer-banner shopee-bg" style="background-image: url('${item.imageUrl}'); background-size: cover; background-position: center;">
                     ${tagDesconto}
                </div>
                <div class="offer-body">
                    <h3 style="font-size: 0.8rem; line-height: 1.4; height: 40px; overflow: hidden; margin-bottom: 5px;">${nomeCurto}</h3>
                    <div style="font-size: 0.7rem; color: #aaa; margin-bottom: 5px; display: flex; justify-content: space-between;">
                        <span>⭐ ${estrelas}</span>
                        <span>🔥 ${vendas} vendidos</span>
                    </div>
                    <p style="color: #ee4d2d; font-weight: bold; font-size: 1.2em;">${formatarMoeda(preco)}</p>
                    <a href="${linkFinal}" target="_blank" class="btn-offer" style="border-color: #ee4d2d; color: #ee4d2d;">VER NA SHOPEE</a>
                </div>
            </div>`;
        });

    } catch (error) {
        console.error("❌ Erro na Shopee:", error.message);
        return "<p style='text-align:center; color:#aaa'>Erro ao carregar Shopee.</p>";
    }
    return cardsHTML;
}

// ======================================================
// 4. MÓDULO RAKUTEN (CURADORIA INTELIGENTE)
// ======================================================
async function buscarItemNuuvem(token, termo, maxResults = 1) {
    try {
        const url = `https://api.linksynergy.com/productsearch/1.0?keyword=${encodeURIComponent(termo)}&mid=${CONFIG.rakuten.midNuuvem}&max=${maxResults}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const xml = await res.text();
        const itens = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        // Mapeia o XML para Objeto JS
        return itens.map(item => {
            const pDe = parseFloat(extrairTag(item, 'price')[0]) || 0;
            const pPor = parseFloat(extrairTag(item, 'saleprice')[0]) || pDe;
            if (pPor === 0) return null; // Ignora bugados

            let desconto = 0;
            if (pDe > pPor) desconto = Math.round(((pDe - pPor) / pDe) * 100);

            return {
                nome: extrairTag(item, 'productname')[0],
                img: extrairTag(item, 'imageurl')[0],
                link: extrairTag(item, 'linkurl')[0]?.replace(/&amp;/g, '&'),
                pDe,
                pPor,
                desconto
            };
        }).filter(i => i !== null);

    } catch (e) { return []; }
}

async function gerarHTMLNuuvem(token) {
    console.log("🎮 Nuuvem: Iniciando curadoria...");
    let cardsHTML = "";

    // 1. SORTEIA UM FAVORITO (O "DESTAQUE")
    const favoritoSorteado = CONFIG.jogosFavoritos[Math.floor(Math.random() * CONFIG.jogosFavoritos.length)];
    console.log(`🌟 Destaque do dia: ${favoritoSorteado}`);
    const destaque = await buscarItemNuuvem(token, favoritoSorteado, 1);

    // 2. BUSCA 50 JOGOS GENÉRICOS PARA GARIMPAR
    const garimpoBruto = await buscarItemNuuvem(token, "PC Games", 50);
    
    // 3. FILTRA: Só quero descontos altos (> 60%) e que não sejam o destaque repetido
    const garimpoFiltrado = garimpoBruto.filter(jogo => 
        jogo.desconto >= CONFIG.criterios.descontoAlto && 
        (!destaque[0] || jogo.nome !== destaque[0].nome)
    );

    // 4. EMBARALHA E PEGA 5
    const garimpoFinal = embaralhar(garimpoFiltrado).slice(0, 5);
    console.log(`💎 Garimpados: ${garimpoFinal.length} jogos com desconto alto.`);

    // 5. JUNTAR TUDO (Destaque primeiro + Garimpo)
    const listaFinal = [...destaque, ...garimpoFinal];

    // 6. GERAR HTML
    listaFinal.forEach(jogo => {
        cardsHTML += `
        <div class="offer-card">
            <div class="offer-banner game-offer-bg" style="background-image: url('${jogo.img}'); background-size: cover;">
                ${jogo.desconto > 0 ? `<span class="discount-tag">-${jogo.desconto}%</span>` : ''}
            </div>
            <div class="offer-body">
                <h3 style="height: 40px; overflow: hidden;">${jogo.nome}</h3>
                <p>
                    <span style="text-decoration: line-through; color: #666; font-size: 0.8em; display: ${jogo.pDe > jogo.pPor ? 'inline' : 'none'}">${formatarMoeda(jogo.pDe)}</span><br>
                    <span style="color: #00ff00; font-weight: bold; font-size: 1.1em;">Por: ${formatarMoeda(jogo.pPor)}</span>
                </p>
                <a href="${jogo.link}" target="_blank" class="btn-offer">COMPRAR NA NUUVEM</a>
            </div>
        </div>`;
    });

    return cardsHTML;
}

// ... (Função de Cupons continua igual) ...
async function buscarCupons(token) {
    // ... [CÓDIGO DE CUPONS QUE JÁ ESTAVA NO ANTERIOR] ...
    // Vou colocar aqui resumido para não ficar gigante, mas você copia a função igual
    console.log("🎟️ Rakuten: Buscando Cupons...");
    let cardsHTML = "";
    try {
        const url = `https://api.linksynergy.com/coupon/1.0?mid=${CONFIG.rakuten.midNuuvem}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const xml = await res.text();
        const links = xml.match(/<link[\s\S]*?<\/link>/g) || [];
        links.forEach(link => {
            const descricao = extrairTag(link, 'offerdescription')[0];
            const clickUrl = extrairTag(link, 'clickurl')[0]?.replace(/&amp;/g, '&');
            let cupomCode = "VER OFERTA";
            const matchCode = descricao.match(/([A-Z0-9]{4,15})/); 
            if (matchCode && !descricao.includes("http")) cupomCode = matchCode[0];
            cardsHTML += `<div class="offer-card" style="border-color: #ffcc00;"><div class="offer-banner" style="background: #1f1f1f; display:flex; flex-direction:column; justify-content:center; align-items:center; padding: 10px;"><span style="font-size: 30px;">🎟️</span><h4 style="color: #ffcc00; margin-top: 5px;">CUPOM</h4></div><div class="offer-body"><h3 style="font-size: 0.9rem;">${descricao}</h3><div style="background: #333; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; color: #fff; border: 1px dashed #666;">${cupomCode}</div><a href="${clickUrl}" target="_blank" class="btn-offer" style="border-color: #ffcc00; color: #ffcc00;">USAR CUPOM</a></div></div>`;
        });
    } catch (e) { }
    return cardsHTML || `<p style="text-align:center; width:100%; color: #aaa;">Sem cupons ativos hoje.</p>`;
}

// ======================================================
// 5. ORQUESTRADOR
// ======================================================
async function gerarSiteCompleto() {
    console.log("🤖 INICIANDO ROBO v5 (Curadoria)...");

    if (!CONFIG.rakuten.clientId || !CONFIG.rakuten.clientSecret) {
        console.error("❌ ERRO: Credenciais ausentes!"); process.exit(1);
    }

    const authString = Buffer.from(`${CONFIG.rakuten.clientId}:${CONFIG.rakuten.clientSecret}`).toString('base64');
    let token = "";
    
    try {
        const tokenReq = await fetch("https://api.linksynergy.com/token", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authString}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'scope': CONFIG.rakuten.scopeId, 'grant_type': 'password' })
        });
        token = (await tokenReq.json()).access_token;
    } catch (e) { console.error("❌ Erro auth:", e.message); process.exit(1); }

    const [htmlJogos, htmlCupons, htmlShopee] = await Promise.all([
        gerarHTMLNuuvem(token),
        buscarCupons(token),
        buscarShopee()
    ]);

    const htmlFinal = `
        <div class="offer-section-title">
            <h3 style="color: #6200ea; margin: 20px 0; border-bottom: 2px solid #333; padding-bottom: 10px; font-family: 'Press Start 2P'; font-size: 1rem;">🎮 Destaques & Ofertas (Nuuvem)</h3>
        </div>
        <div class="offers-grid">
            ${htmlJogos}
        </div>

        <div class="offer-section-title">
            <h3 style="color: #ffcc00; margin: 40px 0 20px 0; border-bottom: 2px solid #333; padding-bottom: 10px; font-family: 'Press Start 2P'; font-size: 1rem;">🎟️ Cupons</h3>
        </div>
        <div class="offers-grid">
            ${htmlCupons}
        </div>

        <div class="offer-section-title">
            <h3 style="color: #ee4d2d; margin: 40px 0 20px 0; border-bottom: 2px solid #333; padding-bottom: 10px; font-family: 'Press Start 2P'; font-size: 1rem;">🎧 Setup Gamer (Shopee)</h3>
        </div>
        <div class="offers-grid">
            ${htmlShopee}
        </div>
    `;

    fs.writeFileSync('ofertas.html', htmlFinal);
    console.log("✅ SITE ATUALIZADO COM SUCESSO!");
}

gerarSiteCompleto();
