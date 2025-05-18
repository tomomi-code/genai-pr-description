jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'testOwner',
      repo: 'testRepo',
    },
    payload: {
      pull_request: {
        number: 1,
        head: {
          sha: 'testSha',
          ref: 'testRef',
        },
      },
    },
  },
  getOctokit: jest.fn(() => ({
    rest: {
      pulls: {
        get: jest.fn(),
        listFiles: jest.fn(),
        update: jest.fn(),
      },
      repos: {
        getContent: jest.fn(),
      },
    },
  })),
}));