const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

const particles = [];
const PARTICLE_COUNT = 200;
const PARTICLE_SIZE = 3;
const PARTICLE_SPEED = 2;
const PARTICLE_DISTANCE = 100;

// Initialize particles
for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: Math.random() * PARTICLE_SPEED * 2 - PARTICLE_SPEED,
    vy: Math.random() * PARTICLE_SPEED * 2 - PARTICLE_SPEED,
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  canvas.width = canvas.width;

  // Update and draw particles
  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Wrap particles around the screen
    if (particle.x < 0) particle.x = canvas.width;
    if (particle.x > canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = canvas.height;
    if (particle.y > canvas.height) particle.y = 0;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, PARTICLE_SIZE, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    // Connect nearby particles
    for (const other of particles) {
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < PARTICLE_DISTANCE) {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(PARTICLE_DISTANCE - distance) / PARTICLE_DISTANCE})`;
        ctx.stroke();
      }
    }
  }
}

animate();