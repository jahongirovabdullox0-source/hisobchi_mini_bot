/**
 * Bitta buyruq bilan hammasini ishga tushiradi:
 *   1) Mini App'ning tayyor (build) versiyasini yig'adi — Telegram'da tez yuklanadi
 *   2) ngrok tunnel — Mini App Telegram ichida ochilishi uchun https manzil
 *   3) .env dagi WEBAPP_URL ni shu manzilga yangilaydi
 *   4) Backend (API + Bot), Mini App (dev) va Admin Panel
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const isWin = process.platform === 'win32';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readEnv(key) {
  if (!fs.existsSync(ENV_FILE)) return '';
  const m = fs.readFileSync(ENV_FILE, 'utf8').match(new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm'));
  return m ? m[1].trim() : '';
}

function writeEnv(key, value) {
  let text = fs.readFileSync(ENV_FILE, 'utf8');
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}\\s*=.*$`, 'm');
  text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(ENV_FILE, text);
}

function findNgrok() {
  const candidates = [process.env.NGROK_PATH, path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ngrok', 'ngrok.exe')];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  const r = spawnSync(isWin ? 'where' : 'which', ['ngrok'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.split(/\r?\n/)[0].trim();
  return null;
}

/** Mini App'ni build qiladi (backend uni to'g'ridan-to'g'ri tarqatadi) */
function buildMiniApp() {
  console.log("📦 Mini App yig'ilmoqda (build)...");
  const r = spawnSync('npm --prefix mini-app run build', { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: true, encoding: 'utf8' });
  if (r.status === 0) {
    console.log('✅ Mini App tayyor');
    return true;
  }
  console.log(`⚠️  Mini App build xatosi:\n${(r.stderr || r.stdout || '').slice(-1500)}`);
  return false;
}

/** Ishlab turgan ngrok tunnelining https manzili (bo'lmasa null) */
async function currentTunnel(port) {
  try {
    const res = await fetch(NGROK_API, { signal: AbortSignal.timeout(1500) });
    const data = await res.json();
    const tunnel = (data.tunnels || []).find(
      (t) => String(t.public_url).startsWith('https://') && String(t.config && t.config.addr).endsWith(`:${port}`)
    );
    return tunnel ? tunnel.public_url : null;
  } catch {
    return null;
  }
}

async function startTunnel(port, children) {
  const running = await currentTunnel(port);
  if (running) return { url: running };

  const ngrok = findNgrok();
  if (!ngrok) return { error: "ngrok topilmadi (https://ngrok.com/download dan o'rnating)." };

  const args = ['http', String(port), '--log', 'stdout', '--log-format', 'logfmt'];
  const domain = readEnv('NGROK_DOMAIN').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (domain) args.push(`--url=${domain}`);

  const env = { ...process.env };
  const token = readEnv('NGROK_AUTHTOKEN');
  if (token) env.NGROK_AUTHTOKEN = token;

  const child = spawn(ngrok, args, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  children.push(child);

  let log = '';
  const collect = (buf) => {
    log = (log + buf.toString()).slice(-4000);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  let exited = false;
  child.on('exit', () => {
    exited = true;
  });

  for (let i = 0; i < 40 && !exited; i++) {
    await sleep(500);
    const url = await currentTunnel(port);
    if (url) return { url };
  }

  if (/ERR_NGROK_4018|authtoken/i.test(log)) {
    return { error: "ngrok authtoken kiritilmagan. https://dashboard.ngrok.com/get-started/your-authtoken dan olib, .env dagi NGROK_AUTHTOKEN ga yozing." };
  }
  if (/ERR_NGROK_108|simultaneous/i.test(log)) {
    return { error: 'ngrok boshqa joyda allaqachon ishlab turibdi (bepul tarifda faqat bittasi mumkin). Uni yoping va qayta urining.' };
  }
  const reason = (log.match(/err="([^"]+)"/) || [])[1];
  return { error: `ngrok ishga tushmadi${reason ? `: ${reason.replace(/\\n/g, ' ').slice(0, 200)}` : ''}` };
}

async function main() {
  const children = [];
  const stopAll = () => {
    for (const c of children) {
      try {
        c.kill();
      } catch {
        /* allaqachon to'xtagan */
      }
    }
  };
  process.on('SIGINT', () => {
    stopAll();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    stopAll();
    process.exit(0);
  });

  // Build muvaffaqiyatli bo'lsa — tunnel backendga (port 5000), bo'lmasa Vite dev serverga (5173)
  const built = buildMiniApp();
  const port = built ? Number(readEnv('PORT')) || 5000 : 5173;

  console.log('🔌 ngrok tunnel ochilmoqda...');
  const tunnel = await startTunnel(port, children);
  if (tunnel.url) {
    if (readEnv('WEBAPP_URL') !== tunnel.url) writeEnv('WEBAPP_URL', tunnel.url);
    console.log(`🌐 Mini App manzili (Telegram uchun): ${tunnel.url}`);
  } else {
    console.log(`⚠️  ${tunnel.error}`);
    console.log('   Bot va Admin Panel baribir ishlaydi; Mini App esa hozircha faqat http://localhost:5173 da ochiladi.');
  }

  const app = spawn('npm run dev:all', { cwd: ROOT, stdio: 'inherit', shell: true });
  children.push(app);
  app.on('exit', (code) => {
    stopAll();
    process.exit(code || 0);
  });
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
