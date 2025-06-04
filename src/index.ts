import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { AzureOpenAI } from 'openai';
import 'dotenv/config';
import { generatePRDescription } from '@/src/prGeneration';
import { PullRequest } from '@/src/utils';

async function run(): Promise<void> {
  try {
    console.log('Starting the GitHub Action... version 0.1d');

    const githubToken = core.getInput('github-token') || process.env['GITHUB_TOKEN'];
    const apiKey = core.getInput('azure-openai-api-key') || process.env['AZURE_OPENAI_API_KEY'];
    const endpoint = core.getInput('azure-openai-endpoint') || process.env['AZURE_OPENAI_ENDPOINT'];
    const apiVersion: string = core.getInput('azure-openai-api-version') || process.env['AZURE_OPENAI_API_VERSION'] || '2024-04-01-preview';
    const deployment: string = core.getInput('azure-openai-deployment') || process.env['AZURE_OPENAI_DEPLOYMENT'] || 'gpt-35-turbo';
    const prTemplateB64 = core.getInput('pr-template-b64') || process.env['PR_TEMPLATE_B64'];
    const prTemplate = prTemplateB64 ? Buffer.from(prTemplateB64, 'base64').toString('utf-8') : '';

    const owner = process.env['PR_OWNER'];
    const repoName = process.env['PR_REPO'];
    const prNumber = process.env['PR_NUMBER'] ? Number(process.env['PR_NUMBER']) : undefined;

    if (!githubToken) throw new Error('GitHub token is not set');
    if (!apiKey) throw new Error('Azure OpenAI API key is not set');
    if (!endpoint) throw new Error('Azure OpenAI endpoint is not set');

    const azClient = new AzureOpenAI({ apiKey, endpoint, apiVersion });
    const octokit = getOctokit(githubToken);

    let pullRequest: PullRequest;
    let repo: { owner: string; repo: string };

    if (context.payload.pull_request) {
      pullRequest = context.payload.pull_request as PullRequest;
      repo = context.repo;
    } else if (owner && repoName && prNumber) {
      // Manual mode: fetch PR info using env vars
      repo = { owner, repo: repoName };
      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });
      pullRequest = pr as PullRequest;
    } else {
      console.log('No pull request found in the context or environment. This action should be run on PR events or with PR_OWNER, PR_REPO, and PR_NUMBER set.');
      return;
    }

    console.log(`Reviewing PR #${pullRequest.number} in ${repo.owner}/${repo.repo}`);

    // DRY RUN support
    if (process.env['DRY_RUN'] === 'true') {
      const prDescription = await generatePRDescription(
        azClient,
        deployment,
        octokit,
        prTemplate,
        { dryRun: true, pullRequest: pullRequest, repo }
      );
      console.log('\n--- Generated PR Description (Dry Run) ---\n');
      console.log(prDescription);
      return;
    }

    // Normal GitHub Action flow
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
