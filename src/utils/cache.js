/**
 * Kam o'zgaradigan ma'lumotlar (yo'nalishlar, kategoriyalar, kurslar) uchun oddiy xotira keshi.
 * Uzoqdagi bazaga ortiqcha so'rov yubormaslik uchun ishlatiladi.
 */
function cached(ttlMs, loader) {
  let value = null;
  let at = 0;
  let pending = null;

  const get = async () => {
    if (value !== null && Date.now() - at < ttlMs) return value;
    if (!pending) {
      pending = loader().then(
        (result) => {
          value = result;
          at = Date.now();
          pending = null;
          return result;
        },
        (err) => {
          pending = null;
          throw err;
        }
      );
    }
    return pending;
  };

  get.clear = () => {
    value = null;
    at = 0;
  };

  return get;
}

module.exports = { cached };
