const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  let original = content;

  // relative UI components imports in order-history-list and order-queue
  content = content.replace(/from\s+['"]\.\/ui\/(.*?)['"]/g, 'from "@/shared/components/ui/$1"');

  // exact lib/print import
  content = content.replace(/from\s+['"]@\/lib\/print['"]/g, 'from "@/integrations/printer"');

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`Updated ${file}`);
  }
});
