import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const version = pkg.version;
const bk = process.env.ISTACK_BK ?? '';

const targets = [
  { target: 'bun-darwin-arm64', artifact: 'istack-macos-arm64' },
  { target: 'bun-darwin-x64',   artifact: 'istack-macos-x64'   },
  { target: 'bun-linux-arm64',  artifact: 'istack-linux-arm64'  },
  { target: 'bun-linux-x64',    artifact: 'istack-linux-x64'    },
];

for (const { target, artifact } of targets) {
  console.log(`Building ${artifact} (v${version})…`);
  execSync(
    [
      'bun build --compile',
      `--target=${target}`,
      `--define '__ISTACK_BK__="${bk}"'`,
      `--define 'process.env.ISTACK_VERSION="${version}"'`,
      'src/index.ts',
      `--outfile dist/${artifact}`,
    ].join(' '),
    { stdio: 'inherit' },
  );
}
