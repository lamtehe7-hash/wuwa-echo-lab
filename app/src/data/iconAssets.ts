// Vendored icon: map URL game8 -> path LOCAL 'icons/<hash>.png' (tải sẵn bằng scripts/vendor-icons.mjs
// vào public/icons/). Icon là asset SAME-ORIGIN nên: hiện được khi OFFLINE (không phụ thuộc CDN game8)
// và export card ra canvas KHÔNG bị taint. URL lạ (không phải game8) thì giữ nguyên để vẫn hotlink.
//
// Path tương đối 'icons/...' được trình duyệt resolve theo document base URL → chạy đúng cả trên Pages
// subpath (/wuwa-echo-lab/) lẫn bản portable (root). App dùng hash-routing nên base URL luôn cố định.

export function iconUrl(gameUrl?: string): string | undefined {
  if (!gameUrl) return undefined
  // CHỈ map URL game8 (thứ mình đã vendor) -> local; URL host khác giữ nguyên để vẫn hotlink,
  // đúng như ghi chú trên (nếu không, một icon nguồn khác sẽ trỏ vào 'icons/…' 404).
  const m = gameUrl.match(/^https:\/\/img\.game8\.co\/\S+\/([^/]+\.png)(?:\/show)?$/i)
  return m ? `icons/${m[1]}` : gameUrl
}
