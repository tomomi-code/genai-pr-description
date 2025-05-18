"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const openai_1 = require("openai");
require("dotenv/config");
// current we support typescript and python, while the python library is not available yet, we will use typescript as the default language
// using abosolute path to import the functions from testGenerator.ts
const prGeneration_1 = require("@/src/prGeneration");
async function run() {
    try {
        console.log('Starting the GitHub Action... version 0.1d');
        const githubToken = core.getInput('github-token');
        // TODO replace with token
        const apiKey = core.getInput('azure-openai-api-key');
        const endpoint = core.getInput('azure-openai-endpoint');
        const apiVersion = core.getInput('azure-openai-api-version') || '2024-04-01-preview'; // Replace with your Azure OpenAI API version
        const deployment = core.getInput('azure-openai-deployment') || 'gpt-35-turbo'; // Replace with your Azure OpenAI deployment name
        console.log(`GitHub Token: ${githubToken ? 'Token is set' : 'Token is not set'}`);
        // Azure configuration
        console.log(`apiKey: ${apiKey}`);
        console.log(`Endpoint: ${endpoint}`);
        console.log(`API Version: ${apiVersion}`);
        console.log(`Deployment: ${deployment}`);
        if (!githubToken) {
            throw new Error('GitHub token is not set');
        }
        const azClient = new openai_1.AzureOpenAI({ apiKey, endpoint, apiVersion });
        const octokit = (0, github_1.getOctokit)(githubToken);
        if (!github_1.context.payload.pull_request) {
            console.log('No pull request found in the context. This action should be run only on pull request events.');
            return;
        }
        const pullRequest = github_1.context.payload.pull_request;
        const repo = github_1.context.repo;
        console.log(`Reviewing PR #${pullRequest.number} in ${repo.owner}/${repo.repo}`);
        // Generate PR description
        await (0, prGeneration_1.generatePRDescription)(azClient, deployment, octokit);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Error: ${error.message}`);
            console.error('Stack trace:', error.stack);
        }
        else {
            core.setFailed('An unknown error occurred');
        }
    }
}
run();
//# sourceMappingURL=index.js.map