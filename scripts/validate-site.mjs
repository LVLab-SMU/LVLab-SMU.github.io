import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const runData = args.size === 0 || args.has("--data");
const runHtml = args.size === 0 || args.has("--html");

const jsonFiles = [
  "assets/smu_events.json",
  "assets/smu_publications.json",
  "assets/nus_events.json",
  "assets/nus_publications.json",
];

const htmlFiles = [
  "index.html",
  "history_lv_lab.html",
  ...fs.readdirSync(path.join(root, "SMU")).filter((name) => name.endsWith(".html")).map((name) => path.join("SMU", name)),
  ...fs.readdirSync(path.join(root, "nus")).filter((name) => name.endsWith(".html")).map((name) => path.join("nus", name)),
];

const errors = [];

function validateJson() {
  for (const file of jsonFiles) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    try {
      const data = JSON.parse(source);
      if (!Array.isArray(data)) {
        errors.push(`${file}: expected an array of records`);
        continue;
      }
      data.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          errors.push(`${file}: item ${index} is not an object`);
          return;
        }
        if (typeof item.displayDate !== "string" || !item.displayDate.trim()) {
          errors.push(`${file}: item ${index} missing displayDate`);
        }
        if (typeof item.sortDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.sortDate)) {
          errors.push(`${file}: item ${index} has invalid sortDate`);
        }
        if (typeof item.year !== "number" || !Number.isFinite(item.year)) {
          errors.push(`${file}: item ${index} missing numeric year`);
        }
      });
    } catch (error) {
      errors.push(`${file}: invalid JSON (${error.message})`);
    }
  }
}

function validateHtmlRefs() {
  const attrPatterns = [/(?:src|href)="([^"]+)"/g, /(?:src|href)='([^']+)'/g];

  for (const file of htmlFiles) {
    let html = fs.readFileSync(path.join(root, file), "utf8");
    html = html.replace(/<!--[\s\S]*?-->/g, "");
    html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");

    const refs = [];
    for (const pattern of attrPatterns) {
      for (const match of html.matchAll(pattern)) refs.push(match[1]);
    }

    const baseDir = path.dirname(path.join(root, file));
    for (const ref of refs) {
      if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) continue;
      if (ref.includes("${")) continue;

      const cleanRef = ref.split("?")[0].split("#")[0].trim();
      if (!cleanRef || cleanRef.endsWith("/")) continue;

      const resolved = path.resolve(baseDir, cleanRef);
      if (!fs.existsSync(resolved)) {
        errors.push(`${file}: missing local asset ${cleanRef}`);
      }
    }
  }
}

if (runData) validateJson();
if (runHtml) validateHtmlRefs();

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Validation passed");
