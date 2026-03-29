const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const readFiles = (filePaths, basePath = process.cwd()) => {
  const fileData = [];
  for (const filePath of filePaths) {
    try {
      const fullPath = path.resolve(basePath, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        fileData.push({ path: filePath, content });
      } else {
        logger.warn(`File not found: ${filePath}`);
      }
    } catch (err) {
      logger.error(`Failed to read file: ${filePath}`);
    }
  }
  return fileData;
};

const writeFiles = (fileDataList, basePath = process.cwd()) => {
  for (const fileData of fileDataList) {
    try {
      const fullPath = path.resolve(basePath, fileData.path);
      fs.writeFileSync(fullPath, fileData.content, 'utf8');
      logger.info(`Updated file: ${fileData.path}`);
    } catch (err) {
      logger.error(`Failed to write file: ${fileData.path}`);
    }
  }
};

module.exports = {
  readFiles,
  writeFiles
};
