#!/bin/bash
node build.js optimize=false output=esui-origin.js
node build.js optimize=true output=esui.js