module.exports = {
  compilationOptions: {
    preferredConfigPath: './tsconfig.json',
  },
  entries: [
    {
      filePath: './src/index.ts',
      outFile: './build/index.d.ts',
      noCheck: true,
    },
  ],
};
