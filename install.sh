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
rm -rf ./node_modules/react-notion-x-linked react-notion-x-linked

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

mv react-notion-x-monorepo ./node_modules/react-notion-x-monorepo
mkdir -p ./node_modules/react-notion-x-linked

for PKG in notion-client notion-types notion-utils react-notion-x; do
    (
        cd "./node_modules/react-notion-x-monorepo/packages/$PKG"
        pnpm pack --pack-destination "$ROOT/node_modules/react-notion-x-linked"
    )

    VERSION=$(node -p "require('$ROOT/node_modules/react-notion-x-monorepo/packages/$PKG/package.json').version")
    mkdir -p "./node_modules/react-notion-x-linked/$PKG"
    tar -xzf "./node_modules/react-notion-x-linked/$PKG-$VERSION.tgz" -C "./node_modules/react-notion-x-linked/$PKG" --strip-components=1
    rm -f "./node_modules/react-notion-x-linked/$PKG-$VERSION.tgz"
done

pnpm link "./node_modules/react-notion-x-linked/notion-client"
pnpm link "./node_modules/react-notion-x-linked/notion-types"
pnpm link "./node_modules/react-notion-x-linked/notion-utils"
pnpm link "./node_modules/react-notion-x-linked/react-notion-x"

# pnpm link may restore react-notion-x's own workspace React symlinks, which can
# produce a second React instance and trigger hooks null errors. Re-point them to
# the app root's React packages after linking.
rm -rf ./node_modules/react-notion-x/node_modules/react ./node_modules/react-notion-x/node_modules/react-dom
ln -s ../../react ./node_modules/react-notion-x/node_modules/react
ln -s ../../react-dom ./node_modules/react-notion-x/node_modules/react-dom

pnpm list notion-client notion-types notion-utils react-notion-x --depth 0
ls -al node_modules
