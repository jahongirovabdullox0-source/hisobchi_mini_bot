const { HttpError } = require('../utils/http');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'API manzili topilmadi' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: "So'rov formati noto'g'ri" });

  switch (err && err.code) {
    case 'P2002':
      return res.status(409).json({ error: 'Bunday yozuv allaqachon mavjud' });
    case 'P2025':
      return res.status(404).json({ error: 'Yozuv topilmadi' });
    case 'P2003':
      return res.status(409).json({ error: "Bu yozuvga bog'liq ma'lumotlar bor, o'chirib bo'lmaydi" });
    default:
      break;
  }

  console.error('❌ Server xatosi:', err);
  return res.status(500).json({ error: 'Serverda kutilmagan xatolik yuz berdi' });
}

module.exports = { notFoundHandler, errorHandler };
