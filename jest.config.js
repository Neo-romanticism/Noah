/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/?(*.)+(test|spec).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // ts-jest가 .js 확장자 import를 .ts 파일로 리졸브하도록 설정
  // (프로젝트가 NodeNext moduleResolution을 사용하므로)
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Renderer tests (jsdom) need WebGL mock for Three.js
  setupFiles: ['<rootDir>/tests/setup/gl-mock.ts'],
};

