#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import process from 'node:process';

function runGit(args) {
  try {
    const output = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString().trim() : '';
    const stdout = error.stdout ? error.stdout.toString().trim() : '';
    const message = stderr || stdout || error.message;
    return { ok: false, output: message.trim() };
  }
}

function parseAheadBehind(statusOutput) {
  const lines = statusOutput.split('\n');
  const summaryLine = lines.find((line) => line.startsWith('##')) || '';
  const aheadMatch = summaryLine.match(/ahead (\d+)/);
  const behindMatch = summaryLine.match(/behind (\d+)/);

  return {
    ahead: aheadMatch ? Number.parseInt(aheadMatch[1], 10) : 0,
    behind: behindMatch ? Number.parseInt(behindMatch[1], 10) : 0,
  };
}

console.log('Pull request readiness check');
console.log('');

const branchResult = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
if (!branchResult.ok) {
  console.error('ERROR: Unable to determine the current branch. Ensure you are inside a Git repository.');
  if (branchResult.output) {
    console.error(branchResult.output);
  }
  process.exitCode = 1;
}

const branchName = branchResult.ok ? branchResult.output : null;
if (branchName) {
  console.log(`- Current branch: ${branchName}`);
}

const statusResult = runGit(['status', '--porcelain']);
if (!statusResult.ok) {
  console.error('');
  console.error('ERROR: Unable to inspect the working tree.');
  if (statusResult.output) {
    console.error(statusResult.output);
  }
  process.exitCode = 1;
} else if (statusResult.output) {
  console.log('- Working tree has uncommitted changes. Stage and commit them before creating a PR.');
} else {
  console.log('- Working tree is clean.');
}

const remoteResult = runGit(['remote', 'get-url', 'origin']);
if (!remoteResult.ok) {
  console.log("- No 'origin' remote is configured. Add one with 'git remote add origin <url>' or push to your fork.");
} else {
  console.log(`- origin remote: ${remoteResult.output}`);
}

const upstreamResult = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
if (!upstreamResult.ok) {
  if (branchName) {
    console.log(`- No upstream tracking branch. Push with 'git push --set-upstream origin ${branchName}'.`);
  } else {
    console.log("- No upstream tracking branch. Push with 'git push --set-upstream origin <branch-name>'.");
  }
} else {
  console.log(`- Tracking remote branch: ${upstreamResult.output}`);
  const aheadBehindResult = runGit(['status', '--short', '--branch']);
  if (aheadBehindResult.ok) {
    const { ahead, behind } = parseAheadBehind(aheadBehindResult.output);
    if (ahead > 0) {
      console.log(`  * Your branch is ahead by ${ahead} commit(s). Push them with 'git push'.`);
    }
    if (behind > 0) {
      console.log(`  * Your branch is behind by ${behind} commit(s). Pull the latest changes before creating the PR.`);
    }
  }
}

const emailResult = runGit(['config', '--get', 'user.email']);
if (!emailResult.ok || !emailResult.output) {
  console.log('- Git user.email is not set. Configure it with `git config user.email "you@example.com"`.');
}

console.log('');
console.log('If GitHub still reports "failed to create pr", confirm that:');
console.log('  1. The branch is pushed to the remote shown above.');
console.log('  2. Your account has permission to open pull requests on that repository.');
console.log('  3. You can retry via the GitHub web UI (Compare & pull request) once the branch exists online.');
console.log('');
console.log('For manual PR creation with the GitHub CLI run:');
if (branchName) {
  console.log(`  gh pr create --base main --head ${branchName}`);
} else {
  console.log('  gh pr create --base main --head <your-branch>');
}

if (process.exitCode && process.exitCode !== 0) {
  console.log('');
  console.log('Resolve the issues above and re-run the check before trying again.');
}
