#!/bin/bash

set -x
set -e

export
pwd

pnpm install

# patch react-icons DEP0128
sed -i 's|"main": "lib",|"main": "lib/cjs/index.js", "module": "lib/esm/index.js", "types": "lib/esm/index.d.ts",|' node_modules/@react-icons/all-files/package.json || true

# (cd ./node_modules/react; yarn link)
# (cd ./node_modules/react-dom; yarn link)

rm -rf ./node_modules/react-notion-x-monorepo
git clone https://github.com/NyaMisty/react-notion-x ./node_modules/react-notion-x-monorepo
(
    cd ./node_modules/react-notion-x-monorepo; 
    pnpm install; 
    # yarn link react; yarn link react-dom; 
    (cd node_modules; rm -rf react; ln -s ../../react)
    (cd node_modules; rm -rf react-dom; ln -s ../../react-dom)
    pnpm build; 
    # yarn run link; 
)

# (cd /tmp/react-notion-x/packages/react-notion-x; yarn link)
# (cd /tmp/react-notion-x/packages/notion-types; yarn link)
# (cd /tmp/react-notion-x/packages/notion-utils; yarn link)
# (cd /tmp/react-notion-x/packages/notion-client; yarn link)
# yarn link react-notion-x
# yarn link notion-types
# yarn link notion-utils
# yarn link notion-client

(cd ./node_modules; rm -rf notion-client; ln -sf react-notion-x-monorepo/packages/notion-client)
(cd ./node_modules; rm -rf notion-types; ln -sf react-notion-x-monorepo/packages/notion-types)
(cd ./node_modules; rm -rf notion-utils; ln -sf react-notion-x-monorepo/packages/notion-utils)
(cd ./node_modules; rm -rf react-notion-x; ln -sf react-notion-x-monorepo/packages/react-notion-x)
ls -al node_modules