
const slides = document.querySelector('.slides');
const slideCount = document.querySelectorAll('.slide').length;
const dots = document.querySelectorAll('.dots span');
let index = 0;

function showSlide(i) {
  index = (i + slideCount) % slideCount; // tránh vượt quá
  slides.style.transform = `translateX(${-index * 100}%)`;
  dots.forEach(dot => dot.classList.remove('active'));
  dots[index].classList.add('active');
}

// Auto chạy 5s
let auto = setInterval(() => showSlide(index + 1), 3000);

// Dots click
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    clearInterval(auto);
    showSlide(i);
  });
});

// Arrows click
document.querySelector('.arrow.left').addEventListener('click', () => {
  clearInterval(auto);
  showSlide(index - 1);
});

document.querySelector('.arrow.right').addEventListener('click', () => {
  clearInterval(auto);
  showSlide(index + 1);
});

