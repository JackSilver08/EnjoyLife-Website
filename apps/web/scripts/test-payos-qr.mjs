// Unit contract for the vendored offline QR encoder and UI wiring.
// No real merchant keys, bank connection, hosted payOS script or QR image API.
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {runInNewContext} from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const vendor=readFileSync(join(root,"src/lib/vendor/qrcodegen.ts"),"utf8");
const out=ts.transpileModule(vendor,{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
const module={exports:{}};
runInNewContext(out,{exports:module.exports,module,Uint8Array,TextEncoder,encodeURI,parseInt,Math,Array,RangeError,Error,Infinity,Number,Boolean,Object,String,RegExp});
const QrCode=module.exports.qrcodegen?.QrCode;
assert.ok(QrCode,"Offline QR encoder must be importable");
const samples=[
 "HELLO WORLD",
 "00020101021238540010A00000072701240006970422011012345678903020208QRIBFTTA53037045405150005802VN6304BEEF",
 "000201010212"+("1234567890".repeat(34))
];
for(const content of samples){
 const qr=QrCode.encodeText(content,QrCode.Ecc.MEDIUM);
 assert.ok(qr.size>=21&&qr.size<=177&&(qr.size-17)%4===0,"Valid ISO QR matrix size");
 for(let x=0;x<7;x++)for(let y=0;y<7;y++){
  const expected=x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4);
  assert.equal(qr.getModule(x,y),expected,"Finder pattern must be scan-safe");
 }
 assert.equal(qr.getModule(-1,-1),false,"Outside QR must be blank");
 const again=QrCode.encodeText(content,QrCode.Ecc.MEDIUM);
 for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++){
  assert.equal(qr.getModule(x,y),again.getModule(x,y),"QR matrix output must be stable");
 }
}
const panel=readFileSync(join(root,"src/components/payos-payment-panel.tsx"),"utf8");
const svg=readFileSync(join(root,"src/components/payos-qr-code.tsx"),"utf8");
const order=readFileSync(join(root,"src/app/(storefront)/orders/[token]/page.tsx"),"utf8");
const css=readFileSync(join(root,"src/app/sprint8.css"),"utf8");
assert.match(panel,/setQR\(data\.qr_code\)/,"UI must display exactly the provider QR payload");
assert.match(panel,/router\.refresh\(\)/,"Payment status still verified from backend");
assert.match(svg,/QrCode\.encodeText\(value/,"QR generated client-side without an image service");
assert.match(svg,/model\.size\+8/,"Quiet zone of four modules on every QR edge");
assert.match(order,/initialQR=\{order\.qr_code\?\?""\}/,"Refreshing order page should restore persisted QR");
assert.doesNotMatch(panel,/<iframe|PayOSCheckout|payos-initialize\.js/i,"No scrolling payment iframe or SDK should remain");
assert.doesNotMatch(css,/\.payos-embed-frame/,"Removed deprecated embedded iframe CSS");
console.log("Native payOS VietQR checks PASSED: matrix, finder patterns, stability, quiet zone, direct persisted payload, and no iframe.");
