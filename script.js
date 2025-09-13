// Exemplo simples: alerta quando clicar no botão do Discord
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".btn");
  btn.addEventListener("click", () => {
    alert("Abrindo o Discord... bora jogar! 🎮");
  });
});
