#!/bin/bash

set -x
set -e

export
pwd

npm i -g pnpm

pnpm install

# patch react-icons DEP0128
sed -i 's|"main": "lib",|"main": "lib/cjs/index.js", "module": "lib/esm/index.js", "types": "lib/esm/index.d.ts",|' node_modules/@react-icons/all-files/package.json || true

# (cd ./node_modules/react; yarn link)
# (cd ./node_modules/react-dom; yarn link)
ROOT=$PWD

rm -rf ./node_modules/react-notion-x-monorepo react-notion-x-monorepo

git clone https://github.com/NyaMisty/react-notion-x react-notion-x-monorepo
(
    cd react-notion-x-monorepo
    pnpm install # must pnpm install at outside, otherwise pnpm build will fail with random ambigious errors

    (cd node_modules; rm -rf react; ln -s $ROOT/node_modules/react)
    (cd node_modules; rm -rf react-dom; ln -s $ROOT/node_modules/react-dom)
    (cd packages/react-notion-x/node_modules; rm -rf react; ln -s $ROOT/node_modules/react)
    (cd packages/react-notion-x/node_modules; rm -rf react-dom; ln -s $ROOT/node_modules/react-dom)
    pnpm build
)

# Link the fork packages directly. Their runtime dependencies (p-queue,
# normalize-url, react-intersection-observer, ...) live in the monorepo's
# node_modules, so resolve the packages from inside it. Packing them and using
# `pnpm link` drops those dependencies and breaks the Next.js build.
#
# Keep the monorepo at the project root (not inside node_modules): Next.js
# only transpiles TypeScript sources whose real path is outside node_modules.
# If the linked packages resolve into node_modules, the build fails parsing
# `type` imports instead of running them through SWC's TypeScript loader.
(
    cd ./node_modules
    rm -rf notion-client notion-types notion-utils react-notion-x
    ln -sf ../react-notion-x-monorepo/packages/notion-client notion-client
    ln -sf ../react-notion-x-monorepo/packages/notion-types notion-types
    ln -sf ../react-notion-x-monorepo/packages/notion-utils notion-utils
    ln -sf ../react-notion-x-monorepo/packages/react-notion-x react-notion-x
)

pnpm list notion-client notion-types notion-utils react-notion-x --depth 0
ls -al node_modules
