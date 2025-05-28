import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { AzureOpenAI } from 'openai';
import 'dotenv/config';

// current we support typescript and python, while the python library is not available yet, we will use typescript as the default language
// using abosolute path to import the functions from testGenerator.ts
import { generatePRDescription } from '@/src/prGeneration';
import { PullRequest } from '@/src/utils';

async function run(): Promise<void> {

  try {
    console.log('Starting the GitHub Action... version 0.1d');

    const githubToken = core.getInput('github-token');

    const apiKey = core.getInput('azure-openai-api-key');
    const endpoint = core.getInput('azure-openai-endpoint');
    const apiVersion: string = core.getInput('azure-openai-api-version') || '2024-04-01-preview'; // Replace with your Azure OpenAI API version
    const deployment: string = core.getInput('azure-openai-deployment') || 'gpt-35-turbo'; // Replace with your Azure OpenAI deployment name
    const prTemplateB64 = core.getInput('pr-template-b64');
    const prTemplate = prTemplateB64 ? Buffer.from(prTemplateB64, 'base64').toString('utf-8') : '';

    console.log(`GitHub Token: ${githubToken ? 'Token is set' : 'Token is not set'}`);

    // Azure configuration
    console.log(`apiKey: ${apiKey}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`API Version: ${apiVersion}`);
    console.log(`Deployment: ${deployment}`);

    if (!githubToken) {
      throw new Error('GitHub token is not set');
    }

    const azClient = new AzureOpenAI({ apiKey, endpoint, apiVersion });
    const octokit = getOctokit(githubToken);

    if (!context.payload.pull_request) {
      console.log('No pull request found in the context. This action should be run only on pull request events.');
      return;
    }

    const pullRequest = context.payload.pull_request as PullRequest;
    const repo = context.repo;

    console.log(`Reviewing PR #${pullRequest.number} in ${repo.owner}/${repo.repo}`);

    // Generate PR description
    await generatePRDescription(azClient, deployment, octokit, prTemplate);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Error: ${error.message}`);
      console.error('Stack trace:', error.stack);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
