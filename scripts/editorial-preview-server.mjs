import http from "node:http";
import { exportedHtml, exportedMobileHtml, html, mobileHtml } from "../scratch/editorial-render-test/artifacts/client-portal/src/components/website/CompositionSites.render.test.js";
import { proofs } from "../scratch/editorial-render-test/artifacts/client-portal/src/components/website/EditorialStudio.proofs.test.js";

const shell = (content, mobile = false) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;background:#ddd}button{font:inherit;color:inherit}.frame{${mobile ? "width:390px;max-width:100%;margin:0 auto" : ""}}</style></head><body><div class="frame">${content}</div></body></html>`;
http.createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  const match = request.url?.match(/^\/proof\/([^/]+)\/(preview|tablet|mobile|export)$/);
  const proof = match ? proofs.find((item) => item.slug === match[1]) : undefined;
  response.end(proof ? match?.[2] === "export" ? proof.exported : shell(match?.[2] === "mobile" ? proof.mobilePreview : match?.[2] === "tablet" ? proof.tabletPreview : proof.preview, match?.[2] === "mobile") : request.url === "/export" ? exportedHtml : request.url === "/export-mobile" ? exportedMobileHtml : request.url === "/mobile" ? shell(mobileHtml, true) : shell(html));
}).listen(4174, "127.0.0.1", () => console.log("Editorial preview: http://127.0.0.1:4174"));
