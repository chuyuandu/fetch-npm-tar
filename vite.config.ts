import path from 'path';
import { defineConfig } from 'vite';
import packageJson from './package.json';
// import { LibraryFormats } from "vite";
// import dts from 'vite-plugin-dts';

const getPackageName = () => {
  return packageJson.name;
};

const getPackageNameCamelCase = () => {
  try {
    return getPackageName().replace(/-./g, char => char[1].toUpperCase());
  } catch {
    throw new Error('Name property in package.json is missing.');
  }
};
const dependencies = Object.keys(packageJson.dependencies || {});

const fileName = {
  index_es: `index.mjs`,
  // cjs: `${getPackageName()}.cjs`,
  // umd: `${getPackageName()}.umd.js`,
  bin_es: `${getPackageName()}.bin.mjs`,
};

// const formats: LibraryFormats[] =  ['es']; //Object.keys(fileName) as Array<keyof typeof fileName>;

export default defineConfig({
  base: './',
  plugins: [
    // dts({
    //   root: __dirname,
    //   outDir: 'types',
    //   copyDtsFiles: true,
    //   tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
    //   exclude: ['test/*'],
    // }),
  ],
  build: {
    target: 'node20',
    outDir: './dist',
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        bin: path.resolve(__dirname, 'src/bin.ts'),
      },
      name: getPackageNameCamelCase(),
      formats: ['es'],
      fileName: (format, entryName: string) => {
        return fileName[`${entryName}_${format}`];
      },
    },
    rollupOptions: {
      external: [/^node:*/, ...dependencies],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
