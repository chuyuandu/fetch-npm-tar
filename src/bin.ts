#!/usr/bin/env node

import arg from "arg";
import { arg_declare, handleArgs } from "@/index";

const args = arg(arg_declare);

handleArgs(args)