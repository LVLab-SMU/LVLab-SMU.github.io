import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const runData = args.size === 0 || args.has("--data");
const runHtml = args.size === 0 || args.has("--html");

const eventJsonFiles = [
  "assets/smu_events.json",
  "assets/nus_events.json",
];

const publicationJsonFiles = [
  "assets/smu_publications.json",
  "assets/nus_publications.json",
];

const peopleJsonFiles = [
  {
    file: "assets/nus_people.json",
    imageBase: "nus",
  },
];

const htmlFiles = [
  "index.html",
  "history_lv_lab.html",
  ...fs.readdirSync(path.join(root, "SMU")).filter((name) => name.endsWith(".html")).map((name) => path.join("SMU", name)),
  ...fs.readdirSync(path.join(root, "nus")).filter((name) => name.endsWith(".html")).map((name) => path.join("nus", name)),
];

const errors = [];

function readJsonArray(file) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    if (!Array.isArray(data)) {
      errors.push(`${file}: expected an array of records`);
      return [];
    }
    return data;
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    return [];
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim();
}

function validateSortDateYear(file, item, index) {
  if (hasText(item.sortDate) && typeof item.year === "number") {
    const sortYear = Number(item.sortDate.slice(0, 4));
    if (sortYear !== item.year) {
      errors.push(`${file}: item ${index} sortDate year does not match year`);
    }
  }
}

function validateOptionalLink(file, item, index) {
  if (!("link" in item) || item.link === "") return;
  if (!hasText(item.link)) {
    errors.push(`${file}: item ${index} has invalid link`);
    return;
  }
  try {
    const url = new URL(item.link);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push(`${file}: item ${index} has unsupported link protocol`);
    }
  } catch {
    errors.push(`${file}: item ${index} has invalid link URL`);
  }
}

function validateCommonDatedRecord(file, item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`${file}: item ${index} is not an object`);
    return false;
  }
  if (!hasText(item.title)) {
    errors.push(`${file}: item ${index} missing title`);
  }
  if (!hasText(item.displayDate)) {
    errors.push(`${file}: item ${index} missing displayDate`);
  }
  if (!hasText(item.sortDate) || !/^\d{4}-\d{2}-\d{2}$/.test(item.sortDate)) {
    errors.push(`${file}: item ${index} has invalid sortDate`);
  }
  if (typeof item.year !== "number" || !Number.isFinite(item.year)) {
    errors.push(`${file}: item ${index} missing numeric year`);
  }
  validateSortDateYear(file, item, index);
  return true;
}

function validateJson() {
  for (const file of eventJsonFiles) {
    readJsonArray(file).forEach((item, index) => {
      if (!validateCommonDatedRecord(file, item, index)) return;
      validateOptionalLink(file, item, index);
    });
  }

  for (const file of publicationJsonFiles) {
    readJsonArray(file).forEach((item, index) => {
      if (!validateCommonDatedRecord(file, item, index)) return;
      for (const key of ["authors", "venue"]) {
        if (!hasText(item[key])) {
          errors.push(`${file}: item ${index} missing ${key}`);
        }
      }
      if (item.links && typeof item.links !== "object") {
        errors.push(`${file}: item ${index} has invalid links object`);
      } else if (item.links) {
        for (const [key, value] of Object.entries(item.links)) {
          if (!hasText(value)) {
            errors.push(`${file}: item ${index} has invalid ${key} link`);
          }
        }
      }
    });
  }

  for (const { file, imageBase } of peopleJsonFiles) {
    readJsonArray(file).forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`${file}: item ${index} is not an object`);
        return;
      }
      for (const key of ["name", "role", "date", "image", "lab"]) {
        if (!hasText(item[key])) {
          errors.push(`${file}: item ${index} missing ${key}`);
        }
      }
      if (typeof item.roleOrder !== "number" || !Number.isFinite(item.roleOrder)) {
        errors.push(`${file}: item ${index} missing numeric roleOrder`);
      }
      if (hasText(item.lab) && !["agi", "robotics"].includes(item.lab)) {
        errors.push(`${file}: item ${index} has invalid lab ${item.lab}`);
      }
      if (hasText(item.image) && !fs.existsSync(path.join(root, imageBase, item.image))) {
        errors.push(`${file}: item ${index} missing image ${item.image}`);
      }
    });
  }
}

function validateHtmlRefs() {
  const attrPatterns = [
    /(?:src|href|data-(?:events-src|publications-src))="([^"]+)"/g,
    /(?:src|href|data-(?:events-src|publications-src))='([^']+)'/g,
  ];
  const fetchPattern = /fetch\(\s*["']([^"']+)["']/g;

  for (const file of htmlFiles) {
    const sourceHtml = fs.readFileSync(path.join(root, file), "utf8");
    let html = sourceHtml;
    html = html.replace(/<!--[\s\S]*?-->/g, "");
    html = html.replace(/<script\b(?![^>]*\bsrc=)[\s\S]*?<\/script>/gi, "");

    const refs = [];
    for (const pattern of attrPatterns) {
      for (const match of html.matchAll(pattern)) refs.push(match[1]);
    }
    for (const match of sourceHtml.matchAll(fetchPattern)) refs.push(match[1]);

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
