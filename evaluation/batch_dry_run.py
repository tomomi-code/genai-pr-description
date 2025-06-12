import subprocess
import os
import json

def parse_id(pr_id):
    """
    Parse an id like 'microsoft/vscode_250273' into (owner, repo, number)

    param pr_id: The pull request id in the format 'owner/repo_number'.

    Returns a tuple containing:
    - owner: The owner of the pull request (e.g., 'microsoft').
    - repo: The repository of the pull request (e.g., 'vscode').
    - number: The number of the pull request (e.g., 250273).
    """
    try:
        owner_repo, pr_number = pr_id.rsplit('_', 1)
        owner, repo = owner_repo.split('/', 1)
        return owner, repo, int(pr_number)
    except Exception as e:
        raise ValueError(f"Invalid PR id format: {pr_id}") from e

def execute_dry_run(pr_owner, pr_repo, pr_number) -> tuple:
    """
    This script executes a dry run of the evaluation process for a given PR using Python.
    It sets up the environment variables required for the evaluation and runs the Node.js script.
    The script captures the output and errors, printing them to the console.
    It is designed to be run in a batch mode, processing multiple PRs one by one.

    param pr_owner: The owner of the pull request (e.g., 'octocat').
    param pr_repo: The repository of the pull request (e.g., 'hello-world').
    param pr_number: The number of the pull request (e.g., 1).

    Returns a tuple containing:
    - pr_owner: The owner of the pull request.
    - pr_repo: The repository of the pull request.
    - pr_number: The number of the pull request.
    - output: The output from the dry run command.
    - error: Any error message from the dry run command, or None if no error occurred.  
    """
    env = os.environ.copy()
    env['DRY_RUN'] = 'true'
    env['PR_OWNER'] = pr_owner
    env['PR_REPO'] = pr_repo
    env['PR_NUMBER'] = str(pr_number)
    cmd = ['node', 'dist/index.js']
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
        print(f"PR {pr_owner}/{pr_repo}#{pr_number} output:\n{result.stdout}")
        return (pr_owner, pr_repo, pr_number, result.stdout, None)
    except subprocess.CalledProcessError as e:
        print(f"Error for PR {pr_owner}/{pr_repo}#{pr_number}: {e.stderr}")
        return (pr_owner, pr_repo, pr_number, None, e.stderr)

if __name__ == "__main__":

    # TODO: Temporarily load PRs from a JSON file
    # This should be replaced with a proper PR fetching mechanism.
    json_path = "evaluation/data/enhanced_pr_data_vscode_batch_1_of_40_20250602_103416.json"
    with open(json_path, "r") as f:
        data = json.load(f)
    pr_list = data["data"]

    output_dir = "evaluation/output"
    os.makedirs(output_dir, exist_ok=True)

    for pr in pr_list:
        if "id" not in pr:
            continue
        try:
            owner, repo, number = parse_id(pr["id"])
        except Exception as e:
            print(f"Skipping invalid id: {pr.get('id')}, error: {e}")
            continue
        pr_owner, pr_repo, pr_number, output, error = execute_dry_run(owner, repo, number)
        print(f"\n=== Output for PR {pr_owner}/{pr_repo}#{pr_number} ===")
        if output:
            # TODO: Temporarily save output to a file
            # This should be replaced with an evaluation process.
            safe_id = pr['id'].replace('/', '_')
            file_path = os.path.join(output_dir, f"{safe_id}.md")
            with open(file_path, "w") as out_f:
                out_f.write(output)
            print(f"Saved output to {file_path}")
        if error:
            print("Error:", error)
