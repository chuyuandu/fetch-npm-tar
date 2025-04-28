#!/usr/bin/env node

import arg from "arg";
import { handleArgs } from "@/index";
import { arg_declare, tgzFolderName } from "@/util";
import { resolve } from "node:path";

const args = arg(arg_declare);
const cwd = process.cwd();
const tgzFolder = resolve(cwd, tgzFolderName);

handleArgs({ ...args, cwd, tgzFolder });
