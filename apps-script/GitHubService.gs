/**
 * Commits training material files into the materials repo via the GitHub
 * Contents API. Requires Script Properties: GITHUB_TOKEN (fine-grained PAT,
 * Contents: read/write, scoped to this repo only — see SETUP.md),
 * GITHUB_OWNER, GITHUB_REPO, and optionally GITHUB_BRANCH (defaults to
 * "main"). The token is read at runtime only — never logged, never returned
 * to the client.
 */

function githubConfig_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var owner = props.getProperty('GITHUB_OWNER');
  var repo = props.getProperty('GITHUB_REPO');
  if (!token || !owner || !repo) {
    throw new Error('GitHub upload is not configured yet — set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in Script Properties.');
  }
  return {
    token: token,
    owner: owner,
    repo: repo,
    branch: props.getProperty('GITHUB_BRANCH') || 'main'
  };
}

function githubApiUrl_(cfg, path) {
  return 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
}

function githubExistingSha_(cfg, path) {
  var res = UrlFetchApp.fetch(githubApiUrl_(cfg, path) + '?ref=' + cfg.branch, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() === 200) {
    return JSON.parse(res.getContentText()).sha;
  }
  return null;
}

/**
 * Commits (creates or updates) a file at `repoPath` (e.g.
 * "materials/safety/forklift-basics.pdf") with `base64Content`. Returns the
 * GitHub-hosted URL the frontend can link to.
 */
function commitFileToGitHub(repoPath, base64Content, commitMessage) {
  var cfg = githubConfig_();
  var sha = githubExistingSha_(cfg, repoPath);

  var payload = {
    message: commitMessage || ('Add ' + repoPath),
    content: base64Content,
    branch: cfg.branch
  };
  if (sha) payload.sha = sha;

  var res = UrlFetchApp.fetch(githubApiUrl_(cfg, repoPath), {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub commit failed (' + code + '): ' + res.getContentText());
  }

  return 'https://raw.githubusercontent.com/' + cfg.owner + '/' + cfg.repo + '/' + cfg.branch + '/' + repoPath;
}
