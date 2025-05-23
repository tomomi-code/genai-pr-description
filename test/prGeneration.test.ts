import { generatePRDescription } from '@/src/prGeneration';
import { AzureOpenAI } from 'openai';
import { getOctokit } from '@actions/github';

jest.mock('@/src/utils', () => ({
  invokeModel: jest.fn().mockResolvedValue('Generated PR description'),
}));

describe('generatePRDescription', () => {
  const mockClient = {} as AzureOpenAI;
  const mockDeployment = 'test-deployment';
  const mockOctokit = getOctokit('test-token');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate and update the PR description', async () => {
    // Mock API responses
    mockOctokit.rest.pulls.get = jest.fn().mockResolvedValue({
      data: { body: 'Original PR description' },
    }) as unknown as typeof mockOctokit.rest.pulls.get;
    (mockOctokit.rest.pulls.listFiles as unknown as jest.Mock).mockResolvedValue({
      data: [
        { filename: 'file1.ts', status: 'modified', patch: '+added line\n-removed line' },
        { filename: 'file2.ts', status: 'removed', patch: '-removed line' },
      ],
    });

    // Call the function
    await generatePRDescription(mockClient, mockDeployment, mockOctokit as any);

    // Assertions
    expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: 'testOwner',
      repo: 'testRepo',
      pull_number: 1,
    });

    expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
      owner: 'testOwner',
      repo: 'testRepo',
      pull_number: 1,
    });

    expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
      owner: 'testOwner',
      repo: 'testRepo',
      pull_number: 1,
      body: expect.stringContaining('Generated PR description'),
    });
  });

  it('should handle removed files correctly', async () => {
    // Mock API responses
    (mockOctokit.rest.pulls.listFiles as unknown as jest.Mock).mockResolvedValueOnce({
      data: [{ filename: 'file2.ts', status: 'removed', patch: '-removed line' }],
    });
  
    // Call the function
    await generatePRDescription(mockClient, mockDeployment, mockOctokit as any);
  
    // Assertions
    expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('| file2.ts | 0 added, 1 removed | This file is removed in this PR |'),
      })
    );
  });

  it('should log an error if a file is not found', async () => {
    // Mock API responses
    // Mock the getContent method
    (mockOctokit.rest.repos.getContent as unknown as jest.Mock).mockRejectedValueOnce({ status: 404 });

    // Call the function
    await generatePRDescription(mockClient, mockDeployment, mockOctokit as any);

    // Assertions
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.update).toHaveBeenCalled();
  });

  it('should replace the old AI-generated section if present', async () => {
  const oldAISection = `
<!-- AI-GENERATED-PR-DESCRIPTION-START -->
<details>
<summary>🤖 AI-Generated PR Description (Powered by Azure OpenAI)</summary>

Old AI generated content

</details>
<!-- AI-GENERATED-PR-DESCRIPTION-END -->
`;
    mockOctokit.rest.pulls.get = jest.fn().mockResolvedValue({
      data: { body: `User intro\n${oldAISection}\nUser outro` },
    }) as unknown as typeof mockOctokit.rest.pulls.get;
    (mockOctokit.rest.pulls.listFiles as unknown as jest.Mock).mockResolvedValue({
      data: [],
    });

    await generatePRDescription(mockClient, mockDeployment, mockOctokit as any);

    // The old section should be replaced, not duplicated
    const updatedBody = ((mockOctokit.rest.pulls.update as unknown) as jest.Mock).mock.calls[0][0].body;
    expect(updatedBody).not.toContain('Old AI generated content');
    expect(updatedBody).toMatch(/<details>[\s\S]*Generated PR description[\s\S]*<\/details>/);
    expect(updatedBody).toContain('User intro');
    expect(updatedBody).toContain('User outro');
  });
});