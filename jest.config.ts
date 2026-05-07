import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            // Skip type checking in tests for speed
            diagnostics: false,
        }],
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
    // Timeout for AI-dependent tests
    testTimeout: 15000,
};

export default config;
