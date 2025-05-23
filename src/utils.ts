import { AzureOpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

// Full definition of PullRequest from GitHub API can be found at https://gist.github.com/GuillaumeFalourd/e53ec9b6bc783cce184bd1eec263799d
export interface PullRequest {
  title: string;
  number: number;
  body: string;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    sha: string;
  };
}

/**
 * Returns true if the API version is 2024-12-01-preview or later.
 */
export function isNewerApiVersion(apiVersion: string): boolean {
  // Accepts '2024-12-01-preview' and anything later
  const minVersion = '2024-12-01-preview';
  const parse = (v: string) => {
    const [year, month, day] = v.replace('-preview', '').split('-').map(Number);
    return { year, month, day };
  };
  const a = parse(apiVersion);
  const b = parse(minVersion);
  if (
    a.year === undefined || a.month === undefined || a.day === undefined ||
    b.year === undefined || b.month === undefined || b.day === undefined
  ) {
    return false;
  }
  if (a.year > b.year) return true;
  if (a.year === b.year && a.month > b.month) return true;
  if (a.year === b.year && a.month === b.month && a.day >= b.day) return true;
  return false;
}

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  initialDelay: number,
  functionName: string
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      const result = await fn();
      console.log(`Function '${functionName}' executed successfully on attempt ${retries + 1}`);
      return result;
    } catch (error) {
      if (retries >= maxRetries) {
        console.error(`Max retries (${maxRetries}) reached for function '${functionName}'. Throwing error.`);
        throw error;
      }
      const delay = initialDelay * Math.pow(2, retries);
      console.log(`Attempt ${retries + 1} for function '${functionName}' failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}

export async function invokeModel(client: AzureOpenAI, deployment: string, payloadInput: string, temperature: number = 0.6): Promise<string> {
  const maxRetries = 3;
  const initialDelay = 5000; // 5 seconds

  const invokeWithRetry = async (): Promise<string> => {
    try {
      const messages: ChatCompletionMessageParam[]  = [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: payloadInput,
        },
      ];

      let params: any = {
        messages,
        model: deployment,
      };

      const apiVersion: string = (client as any)?.apiVersion ?? '';

      if (isNewerApiVersion(apiVersion)) {
        params.max_completion_tokens = 4096;
      } else {
        params.max_tokens = 4096;
        params.temperature = temperature;
      }

      // Call the chat completions API using the deployment name
      const response = await client.chat.completions.create(params);

      // Extract the generated text from the response
      const finalResult = response.choices?.[0]?.message?.content?.trim() ?? '';
      return finalResult;
    } catch (error) {
      console.error('Error occurred while invoking the model:', error);
      throw error;
    }
  };
  return exponentialBackoff(invokeWithRetry, maxRetries, initialDelay, invokeModel.name);
}