/* CONFIGURAÇÕES:
  1. Crie uma API Key no Google Cloud Console (Youtube Data API v3).
  2. Pegue os IDs dos canais que você quer (ex: https://www.youtube.com/channel/UCxxxxxx -> O ID é o UCxxxxxx).
*/
const API_KEY = ''; // <-- COLOQUE SUA CHAVE API DENTRO DAS ASPAS
const CHANNELS = [
  // Exemplo:
  // { name: 'Alanzoka', id: 'UC4iO97x41tPjN-0gT46k1wA' },
  { name: 'Canal do Grupo', id: 'ID_DO_CANAL_1' }, 
  { name: 'Membro 1', id: 'ID_DO_CANAL_2' },
  { name: 'Membro 2', id: 'ID_DO_CANAL_3' }
];

let allVideos = []; // Armazena todos os vídeos carregados

document.addEventListener("DOMContentLoaded", () => {
  // Menu responsivo
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  // Inicializa a Galeria se a API Key estiver presente
  if (API_KEY) {
    initGallery();
  } else {
    document.getElementById('videoGallery').innerHTML = '<p>⚠️ Configure a API_KEY no arquivo script.js</p>';
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
});

async function initGallery() {
  const gallery = document.getElementById('videoGallery');
  const filterSelect = document.getElementById('channelFilter');

  // 1. Popula o Select com os nomes dos canais
  CHANNELS.forEach(channel => {
    const option = document.createElement('option');
    option.value = channel.id;
    option.textContent = channel.name;
    filterSelect.appendChild(option);
  });

  // 2. Busca vídeos
  try {
    // Busca em todos os canais simultaneamente
    await Promise.all(CHANNELS.map(async (channel) => {
      const videos = await fetchChannelVideos(channel.id, channel.name);
      allVideos = [...allVideos, ...videos];
    }));

    // 3. Mistura e exibe
    shuffleArray(allVideos);
    renderVideos(allVideos);

  } catch (error) {
    console.error("Erro ao carregar vídeos:", error);
    gallery.innerHTML = '<p>Erro ao carregar vídeos. Verifique o console (F12).</p>';
  }
}

async function fetchChannelVideos(channelId, channelName) {
  // Troca UC por UU para pegar a playlist de uploads (economiza cota)
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
    
    card.innerHTML = `
      <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank">
        <img src="${video.thumb}" alt="${video.title}" class="video-thumb">
      </a>
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
