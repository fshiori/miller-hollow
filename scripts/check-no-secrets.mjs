import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const suspiciousPatterns = [
  /CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_\-.]{20,}/,
  /CF_API_TOKEN\s*=\s*[A-Za-z0-9_\-.]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/
];

const allowedPlaceholderFiles = new Set([".env.example", ".dev.vars.example"]);
const findings = [];

for (const file of files) {
  if (allowedPlaceholderFiles.has(file)) {
    continue;
  }
  const content = readFileSync(file, "utf8");
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      findings.push(file);
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found in tracked files:");
  for (const file of findings) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("No obvious secrets found in committable files.");
