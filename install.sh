#!/bin/bash

set -x
set -e

git clone https://github.com/NyaMisty/react-notion-x /tmp/react-notion-x
(cd /tmp/react-notion-x; yarn install; yarn build)
(cd /tmp/react-notion-x/packages/react-notion-x; yarn link)
(cd /tmp/react-notion-x/packages/notion-types; yarn link)
(cd /tmp/react-notion-x/packages/notion-utils; yarn link)
(cd /tmp/react-notion-x/packages/notion-client; yarn link)
yarn install
yarn link notion-types
yarn link notion-utils
yarn link notion-client
