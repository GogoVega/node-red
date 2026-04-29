const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const { concatEditor, concatVendor } = require("./config");

async function expand(patterns) {
    const out = [];
    const seen = new Set();
    for (const pattern of patterns) {
        const isGlob = /[*?[\]{}]/.test(pattern);
        if (isGlob) {
            const matches = (await fg(pattern, { onlyFiles: true })).sort();
            if (matches.length === 0) {
                throw new Error(`concat: pattern matched no files: ${pattern}`);
            }
            for (const m of matches) {
                if (!seen.has(m)) {
                    seen.add(m);
                    out.push(m);
                }
            }
        } else {
            if (!fs.existsSync(pattern)) {
                throw new Error(`concat: file not found: ${pattern}`);
            }
            if (!seen.has(pattern)) {
                seen.add(pattern);
                out.push(pattern);
            }
        }
    }
    return out;
}

async function concatOne({ dest, src, separator }) {
    const files = await expand(src);
    const parts = [];
    for (const f of files) {
        parts.push(await fs.promises.readFile(f, "utf8"));
    }
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, parts.join(separator));
    return { dest, count: files.length };
}

async function concat() {
    const targets = [concatEditor, ...concatVendor];
    for (const target of targets) {
        const { dest, count } = await concatOne(target);
        console.log(`concat: ${count} -> ${path.relative(process.cwd(), dest)}`);
    }
}

if (require.main === module) {
    concat().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = concat;
