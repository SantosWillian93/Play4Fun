/* CONFIGURAÇÕES */
const API_KEY = 'AIzaSyDftcprYKh5sDadUKtITKUnc0AkpKzxvY0'; // <--- Verifique se sua chave está aqui!
const CHANNELS = [
  { name: 'DropGame', id: 'ID_DO_CANAL_1' }, 
  { name: 'GeneralZ3us', id: 'UCZ_pO-V6waccY2IVrVdOvPQ' },
  { name: 'LynFossJogos', id: 'UCrctVA0ta9LOe2wfmDNRFyg' },
  { name: 'Play4Fun', id: 'UCzGnPuASSs-vqvarc-VYJsw' },
  { name: 'Christian borges', id: 'UCjlD4Q0T-TaxbHM5gva4zPA' },
];

let allVideos = []; 

document.addEventListener("DOMContentLoaded", () => {
  // Menu responsivo
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  // Inicializa Galeria
  if (API_KEY) {
    initGallery();
  } else {
    document.getElementById('videoGallery').innerHTML = '<p>⚠️ Configure a API_KEY</p>';
  }
  
  // Botão Aleatório
  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      shuffleArray(allVideos);
      renderVideos(allVideos);
    });
  }

  // Filtro de Canal
  const channelFilter = document.getElementById('channelFilter');
  if (channelFilter) {
    channelFilter.addEventListener('change', (e) => {
      const channelId = e.target.value;
      if (channelId === 'all') {
        renderVideos(allVideos);
      } else {
        const filtered = allVideos.filter(video => video.channelId === channelId);
        renderVideos(filtered);
      }
    });
  }

  // Lógica do Modal (Fechar)
  const modal = document.getElementById('videoModal');
  const closeBtn = document.querySelector('.close-modal');
  
  // Fechar ao clicar no X
  closeBtn.addEventListener('click', closeModal);
  
  // Fechar ao clicar fora do vídeo
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
});

// Funções do Modal
function openVideo(videoId) {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('modalPlayer');
  
  // Carrega o vídeo e já dá play automático (?autoplay=1)
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  modal.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('modalPlayer');
  
  // Limpa o src para parar o vídeo de tocar no fundo
  iframe.src = '';
  modal.style.display = 'none';
}

async function initGallery() {
  const gallery = document.getElementById('videoGallery');
  const filterSelect = document.getElementById('channelFilter');

  CHANNELS.forEach(channel => {
    const option = document.createElement('option');
    option.value = channel.id;
    option.textContent = channel.name;
    filterSelect.appendChild(option);
  });

  try {
    await Promise.all(CHANNELS.map(async (channel) => {
      const videos = await fetchChannelVideos(channel.id, channel.name);
      allVideos = [...allVideos, ...videos];
    }));

    shuffleArray(allVideos);
    renderVideos(allVideos);

  } catch (error) {
    console.error("Erro ao carregar vídeos:", error);
    gallery.innerHTML = '<p>Erro ao carregar vídeos.</p>';
  }
}

async function fetchChannelVideos(channelId, channelName) {
  const uploadPlaylistId = channelId.replace('UC', 'UU');
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadPlaylistId}&maxResults=6&key=${API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map(item => ({
      title: item.snippet.title,
      thumb: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.medium.url,
      videoId: item.snippet.resourceId.videoId,
      channelId: channelId,
      channelName: channelName
    }));
  } catch (err) {
    console.error(`Erro ao buscar canal ${channelName}:`, err);
    return [];
  }
}

function renderVideos(videos) {
  const gallery = document.getElementById('videoGallery');
  gallery.innerHTML = ''; 

  if (videos.length === 0) {
    gallery.innerHTML = '<p>Nenhum vídeo encontrado.</p>';
    return;
  }

  videos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    // MUDANÇA AQUI: Tiramos o <a href> e colocamos um onclick na imagem
    card.innerHTML = `
      <div class="video-thumb-container" onclick="openVideo('${video.videoId}')">
        <img src="${video.thumb}" alt="${video.title}" class="video-thumb">
        <div class="play-icon">▶</div>
      </div>
      <div class="video-info">
        <h3>${video.title}</h3>
        <p>👤 ${video.channelName}</p>
      </div>
    `;
    gallery.appendChild(card);
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


/* Início da Vitrine de Ofertas */
// ... (seu código existente do YouTube) ...

// =========================================
// CARREGAR OFERTAS AUTOMÁTICAS (ROBÔ)
// =========================================
async function loadDynamicOffers() {
    const container = document.getElementById('dynamic-offers-container');
    if (!container) return;

    try {
        // Tenta ler o arquivo que o Node gerou
        const response = await fetch('ofertas.html');
        if (!response.ok) throw new Error("Arquivo de ofertas não encontrado");
        
        const html = await response.text();
        container.innerHTML = html;
        
    } catch (error) {
        console.log("Nenhuma oferta automática carregada (rode o robô).");
        // Não precisa fazer nada, o container fica vazio e só aparecem os fixos
    }
}

// Chame a função quando o site carregar
document.addEventListener("DOMContentLoaded", () => {
    // ... seus outros inits ...
    loadDynamicOffers(); 
});
/* Fim da Vitrine de Ofertas */


/* ==========================================================================
   BUSCA AFILIADA NUUVEM (CORRIGIDO)
   ========================================================================== */
/* --- BUSCA AFILIADA NUUVEM (CORRIGIDO VIA PRINT) --- */
function searchGame() {
  const searchInput = document.getElementById('gameSearch').value;
  
  if (!searchInput) {
    alert("Digite o nome de um jogo!");
    return;
  }

  // 1. Seu ID de Afiliado (Confirmado pelo print)
  const myAffiliateID = 'WWaFx44RWBw'; 
  
  // 2. ID da Nuuvem (O ERRO ESTAVA AQUI!)
  // Antes estava 40432, mas sua conta usa a rede Brasil: 46796
  const merchantID = '46796'; 

  // 3. Monta a URL de busca da Nuuvem
  const nuuvemSearchURL = `https://www.nuuvem.com/br-pt/catalog/search/${encodeURIComponent(searchInput)}`;

  // 4. Cria o Deep Link (Agora com os IDs certos)
  const affiliateLink = `https://click.linksynergy.com/deeplink?id=${myAffiliateID}&mid=${merchantID}&murl=${encodeURIComponent(nuuvemSearchURL)}`;

  // 5. Abre em nova aba
  window.open(affiliateLink, '_blank');
}
