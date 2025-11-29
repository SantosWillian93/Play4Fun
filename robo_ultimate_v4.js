const fs = require('fs');
const crypto = require('crypto');

// ======================================================
// 1. CONFIGURAÇÕES (VERSÃO SEGURA PARA GITHUB ACTIONS 🔒)
// ======================================================
const CONFIG = {
    rakuten: {
        // As senhas vêm das Variáveis de Ambiente do GitHub
        clientId: process.env.RAKUTEN_CLIENT_ID,
        clientSecret: process.env.RAKUTEN_CLIENT_SECRET,
        scopeId: "4473159",
        midNuuvem: "46796"
    },
    shopee: {
        appId: "18304020314", // ID público, pode ficar no código
        appSecret: process.env.SHOPEE_APP_SECRET, // Segredo vem do GitHub
        apiUrl: "https://open-api.affiliate.shopee.com.br/graphql",
        // Lista de termos para variar a vitrine a cada atualização
        keywords: [
            "Teclado Mecânico Gamer",
            "Mouse Gamer Logitech",
            "Headset Gamer",
            "Microfone Streamer",
            "Controle PC Gamer",
            "Mousepad Extra Grande",
            "Cadeira Gamer",
            "Webcam Streamer"
        ]
    },
    jogosFavoritos: [
        "Elden Ring",
        "Resident Evil 4",
        "God of War",
        "Black Myth",
        "Silent Hill 2"
    ],
    criterios: {
        descontoMinimo: 40,
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

// ======================================================
// 3. MÓDULO SHOPEE (COM ROTAÇÃO E ORDENAÇÃO)
// ======================================================
async function buscarShopee() {
    // Sorteia uma palavra-chave para a vitrine não ficar repetitiva
    const termoSorteado = CONFIG.shopee.keywords[Math.floor(Math.random() * CONFIG.shopee.keywords.length)];
    console.log(`🟠 Shopee: Buscando os mais vendidos de "${termoSorteado}"...`);
    
    // QUERY OTIMIZADA: sortType: 2 (Mais Vendidos)
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

        if (ofertas.length === 0) {
            console.log("⚠️ Shopee: Nada encontrado.");
            return "<p style='text-align:center; color:#aaa'>Sem ofertas no momento.</p>";
        }

        console.log(`✅ Shopee: ${ofertas.length} produtos encontrados.`);

        ofertas.forEach(item => {
            const linkFinal = item.offerLink || item.productLink;
            const preco = parseFloat(item.price);
            const desconto = item.priceDiscountRate ? Math.round(parseFloat(item.priceDiscountRate)) : 0;
            const vendas = item.sales || 0;
            const estrelas = item.ratingStar || "5.0";
            
            // Encurta nome longo
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
// 4. MÓDULOS RAKUTEN (JOGOS E CUPONS)
// ======================================================
async function buscarJogosNuuvem(token) {
    console.log("🎮 Nuuvem: Buscando Jogos...");
    let cardsHTML = "";
    const termos = [...CONFIG.jogosFavoritos, "PC Games"]; 
    const jogosProcessados = new Set();

    for (const termo of termos) {
        try {
            const maxResults = termo === "PC Games" ? 15 : 1;
            const url = `https://api.linksynergy.com/productsearch/1.0?keyword=${encodeURIComponent(termo)}&mid=${CONFIG.rakuten.midNuuvem}&max=${maxResults}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const xml = await res.text();
            
            const itens = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

            itens.forEach(item => {
                const nome = extrairTag(item, 'productname')[0];
                if (jogosProcessados.has(nome)) return;

                const pDe = parseFloat(extrairTag(item, 'price')[0]) || 0;
                const pPor = parseFloat(extrairTag(item, 'saleprice')[0]) || pDe;
                const img = extrairTag(item, 'imageurl')[0];
                let link = extrairTag(item, 'linkurl')[0]?.replace(/&amp;/g, '&');

                // Evita erro de preço 0
                if (pPor === 0) return;

                let desconto = 0;
                if (pDe > pPor) desconto = Math.round(((pDe - pPor) / pDe) * 100);

                const ehFavorito = CONFIG.jogosFavoritos.some(fav => nome.includes(fav));
                
                // Critério: Favoritos sempre entram, Genéricos só com desconto alto
                if (ehFavorito || desconto >= CONFIG.criterios.descontoMinimo) {
                    jogosProcessados.add(nome);
                    cardsHTML += `
                    <div class="offer-card">
                        <div class="offer-banner game-offer-bg" style="background-image: url('${img}'); background-size: cover;">
                            ${desconto > 0 ? `<span class="discount-tag">-${desconto}%</span>` : ''}
                        </div>
                        <div class="offer-body">
                            <h3>${nome}</h3>
                            <p>
                                <span style="text-decoration: line-through; color: #666; font-size: 0.8em; display: ${pDe > pPor ? 'inline' : 'none'}">${formatarMoeda(pDe)}</span><br>
                                <span style="color: #00ff00; font-weight: bold; font-size: 1.1em;">Por: ${formatarMoeda(pPor)}</span>
                            </p>
                            <a href="${link}" target="_blank" class="btn-offer">COMPRAR NA NUUVEM</a>
                        </div>
                    </div>`;
                }
            });
        } catch (e) { console.error(`Erro buscando ${termo}:`, e.message); }
    }
    return cardsHTML;
}

async function buscarCupons(token) {
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
            
            // Tenta achar código em caixa alta na descrição (ex: GAMES10)
            const matchCode = descricao.match(/([A-Z0-9]{4,15})/); 
            if (matchCode && !descricao.includes("http")) cupomCode = matchCode[0];

            cardsHTML += `
            <div class="offer-card" style="border-color: #ffcc00;">
                <div class="offer-banner" style="background: #1f1f1f; display:flex; flex-direction:column; justify-content:center; align-items:center; padding: 10px;">
                    <span style="font-size: 30px;">🎟️</span>
                    <h4 style="color: #ffcc00; margin-top: 5px;">CUPOM</h4>
                </div>
                <div class="offer-body">
                    <h3 style="font-size: 0.9rem;">${descricao}</h3>
                    <div style="background: #333; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; color: #fff; border: 1px dashed #666;">${cupomCode}</div>
                    <a href="${clickUrl}" target="_blank" class="btn-offer" style="border-color: #ffcc00; color: #ffcc00;">USAR CUPOM</a>
                </div>
            </div>`;
        });
    } catch (e) { console.error("Erro cupons:", e.message); }
    
    // Fallback se não tiver cupons
    if (!cardsHTML) {
        cardsHTML = `<div style="grid-column: 1/-1; text-align: center; color: #aaa; padding: 20px;">Nenhum cupom ativo hoje. Volte amanhã!</div>`;
    }
    
    return cardsHTML;
}

// ======================================================
// 5. ORQUESTRADOR PRINCIPAL
// ======================================================
async function gerarSiteCompleto() {
    console.log("🤖 INICIANDO ROBO ULTIMATE v4 (GitHub Actions Mode)...");

    // 1. Autenticação Rakuten
    if (!CONFIG.rakuten.clientId || !CONFIG.rakuten.clientSecret) {
        console.error("❌ ERRO: Credenciais da Rakuten não encontradas nas variáveis de ambiente!");
        process.exit(1);
    }

    const authString = Buffer.from(`${CONFIG.rakuten.clientId}:${CONFIG.rakuten.clientSecret}`).toString('base64');
    let token = "";
    
    try {
        const tokenReq = await fetch("https://api.linksynergy.com/token", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authString}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'scope': CONFIG.rakuten.scopeId, 'grant_type': 'password' })
        });
        
        if (!tokenReq.ok) throw new Error(`Status ${tokenReq.status}`);
        
        const tokenData = await tokenReq.json();
        token = tokenData.access_token;
        console.log("✅ Rakuten: Token gerado.");
    } catch (e) {
        console.error("❌ Erro fatal auth Rakuten:", e.message);
        process.exit(1);
    }

    // 2. Busca Paralela (Rápida)
    const [htmlJogos, htmlCupons, htmlShopee] = await Promise.all([
        buscarJogosNuuvem(token),
        buscarCupons(token),
        buscarShopee()
    ]);

    // 3. Montar HTML Final
    const htmlFinal = `
        <div class="offer-section-title">
            <h3 style="color: #6200ea; margin: 20px 0; border-bottom: 2px solid #333; padding-bottom: 10px; font-family: 'Press Start 2P'; font-size: 1rem;">🎮 Jogos (Nuuvem)</h3>
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
            <h3 style="color: #ee4d2d; margin: 40px 0 20px 0; border-bottom: 2px solid #333; padding-bottom: 10px; font-family: 'Press Start 2P'; font-size: 1rem;">🎧 Periféricos (Shopee)</h3>
        </div>
        <div class="offers-grid">
            ${htmlShopee}
        </div>
    `;

    // 4. Salvar Arquivo
    fs.writeFileSync('ofertas.html', htmlFinal);
    console.log("✅ SITE ATUALIZADO COM SUCESSO! (ofertas.html)");
}

gerarSiteCompleto();