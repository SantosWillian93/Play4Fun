document.addEventListener("DOMContentLoaded", () => {
  // Botão do Discord
  const btn = document.querySelector(".btn");
  if (btn) {
    btn.addEventListener("click", () => {
      alert("Abrindo o Discord... bora jogar! 🎮");
    });
  }

  // Menu responsivo
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  // Upload de vídeo
  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("uploadPassword").value;
      const tag = document.getElementById("tag").value;
      const file = document.getElementById("videoFile").files[0];

      // URL da sua API (ex.: backend na Vercel)
      const API_URL = "https://sua-api.vercel.app/upload";

      const formData = new FormData();
      formData.append("password", password);
      formData.append("tag", tag);
      formData.append("video", file);

      try {
        const res = await fetch(API_URL, { method: "POST", body: formData });
        const data = await res.json();
        alert(data.message || "Upload concluído!");
      } catch (err) {
        console.error(err);
        alert("Erro ao enviar o vídeo.");
      }
    });
  }
});
