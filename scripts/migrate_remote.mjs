import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { products } from './import_products.mjs';

const API_BASE = (process.env.MIGRATION_API_BASE || 'https://enjoylife-api.onrender.com/api/v1').replace(/\/$/, '');
const ZIP_PATH = process.env.MIGRATION_MEDIA_ZIP || 'products_media_full.zip';

function localJson(sql) {
  const raw = execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'enjoylife', '-d', 'enjoylife', '-At', '-c', sql], { encoding: 'utf8' }).trim();
  return raw ? JSON.parse(raw) : [];
}

async function credentials() {
  const rl = createInterface({ input, output });
  const email = process.env.MIGRATION_ADMIN_EMAIL || await rl.question('Admin email Supabase: ');
  const password = process.env.MIGRATION_ADMIN_PASSWORD || await rl.question('Admin password Supabase: ');
  rl.close();
  return { email, password };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`${options.method || 'GET'} ${path} -> ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return { response, body };
}

async function ignoreConflict(label, action) {
  try { return await action(); }
  catch (error) {
    if (error.status === 409) { console.log(`  Bỏ qua bản ghi đã tồn tại: ${label}`); return null; }
    throw error;
  }
}

async function main() {
  console.log(`Migration target: ${API_BASE}`);
  const { email, password } = await credentials();
  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = login.response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!cookie) throw new Error('Không nhận được session cookie từ API.');
  const authHeaders = { Cookie: cookie };
  console.log('Đăng nhập admin thành công.');

  const media = new FormData();
  media.append('file', new Blob([await readFile(ZIP_PATH)]), 'products_media.zip');
  const uploaded = await request('/admin/media/bulk', { method: 'POST', headers: authHeaders, body: media });
  console.log('Media:', uploaded.body);
  const localMedia = localJson(`SELECT COALESCE(json_agg(json_build_object('filename',filename,'original_name',original_name)),'[]'::json) FROM media_assets;`);
  const remoteMedia = await request('/admin/media', { headers: authHeaders });
  const localToOriginal = new Map(localMedia.map(item => ['/media/' + item.filename, item.original_name]));
  const originalToRemote = new Map((remoteMedia.body.items || []).map(item => [item.original_name, item.url]));
  const rewriteMediaUrl = value => {
    if (typeof value !== 'string' || !value.startsWith('/media/')) return value;
    const original = localToOriginal.get(value);
    return originalToRemote.get(original) || value;
  };
  const rewriteDocument = value => {
    if (Array.isArray(value)) return value.map(rewriteDocument);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    for (const [key, child] of Object.entries(value)) output[key] = key === 'src' ? rewriteMediaUrl(child) : rewriteDocument(child);
    return output;
  };

  const localProducts = localJson(`SELECT COALESCE(json_agg(json_build_object('name',p.name,'slug',p.slug,'description',p.description,'image_url',CASE WHEN p.image_url LIKE '/media/%' THEN COALESCE(m.original_name,p.image_url) ELSE p.image_url END,'collection',p.collection_name,'category',c.slug,'sku',v.sku,'color',v.color,'size',v.size,'price_vnd',v.price_vnd,'opening_stock',i.on_hand) ORDER BY p.slug),'[]'::json) FROM products p JOIN categories c ON c.id=p.category_id JOIN LATERAL (SELECT * FROM product_variants WHERE product_id=p.id AND active ORDER BY created_at,id LIMIT 1) v ON true JOIN inventory i ON i.variant_id=v.id LEFT JOIN media_assets m ON m.filename=replace(p.image_url,'/media/','') WHERE p.archived_at IS NULL;`);
  const sourceProducts = [...products];
  const sourceSlugs = new Set(sourceProducts.map(product => product.slug));
  for (const product of localProducts) if (!sourceSlugs.has(product.slug)) sourceProducts.push(product);
  const existing = await request('/admin/products', { headers: authHeaders });
  const existingSlugs = new Set((existing.body.items || []).map(item => item.slug));
  const pending = sourceProducts.filter(product => !existingSlugs.has(product.slug));
  console.log(`Catalog local: ${sourceProducts.length}; trùng: ${sourceProducts.length - pending.length}; import mới: ${pending.length}`);
  if (pending.length) {
    const imported = await request('/admin/products/import', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: pending }),
    });
    console.log('Import catalog:', imported.body);
  }

  const afterImport = await request('/admin/products', { headers: authHeaders });
  let published = 0;
  for (const item of afterImport.body.items || []) {
    if (item.published) continue;
    await request(`/admin/products/${item.id}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, description: item.description, collection: item.collection, published: true, image_url: item.image_url }),
    });
    published++;
  }
  console.log(`Đã publish ${published} sản phẩm.`);

  const categories = localJson(`SELECT COALESCE(json_agg(json_build_object('slug',slug,'name',name,'description',description) ORDER BY slug),'[]'::json) FROM blog_categories;`);
  const tags = localJson(`SELECT COALESCE(json_agg(json_build_object('slug',slug,'name',name) ORDER BY slug),'[]'::json) FROM blog_tags;`);
  const articles = localJson(`SELECT COALESCE(json_agg(json_build_object('slug',a.slug,'title',a.title,'excerpt',a.excerpt,'content_json',a.content_json,'category_slug',COALESCE(c.slug,''),'tag_slugs',COALESCE((SELECT json_agg(t.slug ORDER BY t.slug) FROM blog_article_tags at JOIN blog_tags t ON t.id=at.tag_id WHERE at.article_id=a.id),'[]'::json),'cover_image_url',a.cover_image_url,'cover_image_alt',a.cover_image_alt,'seo_title',a.seo_title,'seo_description',a.seo_description,'og_image_url',a.og_image_url,'status',a.status) ORDER BY a.created_at),'[]'::json) FROM blog_articles a LEFT JOIN blog_categories c ON c.id=a.category_id WHERE a.deleted_at IS NULL;`);
  for (const category of categories) await ignoreConflict(`category ${category.slug}`, () => request('/admin/blog/categories', { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(category) }));
  for (const tag of tags) await ignoreConflict(`tag ${tag.slug}`, () => request('/admin/blog/tags', { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(tag) }));
  for (const article of articles) {
    article.cover_image_url = rewriteMediaUrl(article.cover_image_url);
    article.og_image_url = rewriteMediaUrl(article.og_image_url);
    article.content_json = rewriteDocument(article.content_json);
    await ignoreConflict(`article ${article.slug}`, () => request('/admin/blog/articles', { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(article) }));
  }
  console.log(`Journal local: ${articles.length}; đã đồng bộ.`);

  const publicProducts = await request('/products?limit=30');
  const publicJournal = await request('/blog/articles?limit=30');
  console.log(`Hoàn tất: storefront=${publicProducts.body.total ?? publicProducts.body.items?.length ?? 0}, journal=${publicJournal.body.total ?? publicJournal.body.items?.length ?? 0}`);
}

main().catch(error => {
  console.error('Migration thất bại:', error.message);
  if (error.body) console.error(JSON.stringify(error.body));
  process.exit(1);
});
