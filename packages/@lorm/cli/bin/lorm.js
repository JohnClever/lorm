#!/usr/bin/env node

import { register } from "tsx/esm/api";
register(); // Register tsx so TS files can be loaded

import("../dist/index.js");