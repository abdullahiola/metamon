const colors = ['\x1b[31m', '\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m'];

let i = 0;
setInterval(() => {
  console.clear();
  console.log(`${colors[i]}Hello, user! 🙂`);
  i = (i + 1) % colors.length;
}, 500);

setTimeout(() => {
  console.clear();
  console.log('Goodbye!');
  process.exit();
}, 5000);