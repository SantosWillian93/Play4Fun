document.addEventListener("DOMContentLoaded", () => {
  // Botão do Discord
  const btn = document.querySelector(".btn");
  btn.addEventListener("click", () => {
    alert("Abrindo o Discord... bora jogar! 🎮");
  });

  // Menu responsivo
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });

  // GIF nos jogos
  const games = document.querySelectorAll(".game-list li");
  games.forEach(game => {
    const gif = game.getAttribute("data-gif");
    game.addEventListener("mouseenter", () => {
      game.style.backgroundImage = `url(${gif})`;
    });
    game.addEventListener("mouseleave", () => {
      game.style.backgroundImage = "none";
      game.style.color = "#f5f5f5";
    });
  });
});
